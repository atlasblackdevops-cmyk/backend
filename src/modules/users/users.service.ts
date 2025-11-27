import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { FarmMember } from "../../database/entities/farm-member.entity";
import { Farm } from "../../database/entities/farm.entity";
import { Permission } from "../../database/entities/permission.entity";
import { Role } from "../../database/entities/role.entity";
import { UserPermission } from "../../database/entities/user-permission.entity";
import { User } from "../../database/entities/user.entity";
import { FarmRole, UserRole } from "../../enums/user.enum";
import { BcryptService } from "../../services/bcrypt.service";
import { S3Service } from "../../services/s3.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { ListUsersDto } from "./dto/list-users.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly s3Service: S3Service,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(Farm) private readonly farmRepo: Repository<Farm>,
    @InjectRepository(FarmMember)
    private readonly farmMemberRepo: Repository<FarmMember>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
    @InjectRepository(UserPermission)
    private readonly userPermissionRepo: Repository<UserPermission>,
    private readonly bcrypt: BcryptService,
  ) {}

  async createUser(creatorId: string, dto: CreateUserDto) {
    // Get creator user with currentFarm
    const creator = await this.userRepo.findOne({
      where: { id: creatorId },
      relations: ["currentFarm", "currentFarm.owner"],
    });

    if (!creator) {
      throw new NotFoundException("Creator user not found");
    }

    if (!creator.currentFarm) {
      throw new BadRequestException(
        "User must have a current farm selected to add users",
      );
    }

    const farm = creator.currentFarm;

    // Verify creator is the owner of the farm
    if (farm.owner.id !== creatorId) {
      throw new ForbiddenException(
        "Only the farm owner can add users to this farm",
      );
    }

    const farmId = farm.id;

    // Verify role exists and is not OWNER or SUPER_ADMIN
    const role = await this.roleRepo.findOne({
      where: { id: dto.roleId },
    });
    if (!role) {
      throw new NotFoundException("Role not found");
    }

    if (
      role.roleName === FarmRole.OWNER ||
      role.roleName === UserRole.SUPER_ADMIN
    ) {
      throw new BadRequestException(
        "Cannot assign OWNER or SUPER_ADMIN role to users",
      );
    }

    // Check if user with this email already exists - throw error if exists
    const existingUser = await this.userRepo.findOne({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException(
        "User with this email already exists. Use the add existing user endpoint to add them to a farm.",
      );
    }

    // Create new user
    const user = this.userRepo.create({
      email: dto.email,
      name: dto.name,
      password: this.bcrypt.hashSync(dto.password),
      role,
      emailVerified: false,
      isActive: true,
      currentFarm: farm,
    });
    await this.userRepo.save(user);

    // Create farm member entry
    const farmMember = this.farmMemberRepo.create({
      user,
      farm,
      role,
    });
    await this.farmMemberRepo.save(farmMember);

    // Assign permissions (required)
    await this.assignPermissions(user.id, farmId, dto.permissionIds);

    // Fetch created member with relations
    const createdMember = await this.farmMemberRepo.findOne({
      where: { id: farmMember.id },
      relations: ["user", "role", "farm"],
    });

    if (!createdMember) {
      throw new NotFoundException("Member not found after creation");
    }

    // Fetch assigned permissions
    const userPermissions = await this.userPermissionRepo.find({
      where: {
        user: { id: user.id },
        farm: { id: farmId },
      },
      relations: ["permission"],
    });

    return {
      message: "User created and added to farm successfully",
      data: {
        user: {
          id: createdMember.user.id,
          email: createdMember.user.email,
          name: createdMember.user.name,
          role: {
            id: createdMember.role.id,
            roleName: createdMember.role.roleName,
          },
        },
        farmMember: {
          id: createdMember.id,
          farmId: createdMember.farm.id,
          farmName: createdMember.farm.farmName,
        },
        permissions: userPermissions.map((up) => ({
          id: up.permission.id,
          module: up.permission.module,
          action: up.permission.action,
          description: up.permission.description,
        })),
      },
    };
  }

  private async assignPermissions(
    userId: string,
    farmId: string,
    permissionIds: string[],
  ) {
    // Remove existing permissions for this user-farm combination
    await this.userPermissionRepo.delete({
      user: { id: userId },
      farm: { id: farmId },
    });

    // Validate all permission IDs exist
    const uniqueIds = Array.from(new Set(permissionIds));
    const permissions = await this.permissionRepo.find({
      where: { id: In(uniqueIds) },
    });

    if (permissions.length !== uniqueIds.length) {
      throw new BadRequestException("One or more permission IDs are invalid");
    }

    // Create user permissions
    const toCreate = permissions.map((permission) =>
      this.userPermissionRepo.create({
        user: { id: userId } as User,
        farm: { id: farmId } as Farm,
        permission,
      }),
    );

    await this.userPermissionRepo.save(toCreate);
  }

  async listUsers(creatorId: string, query: ListUsersDto) {
    // Get creator user with currentFarm
    const creator = await this.userRepo.findOne({
      where: { id: creatorId },
      relations: ["currentFarm", "currentFarm.owner"],
    });

    if (!creator) {
      throw new NotFoundException("Creator user not found");
    }

    if (!creator.currentFarm) {
      throw new BadRequestException(
        "User must have a current farm selected to list users",
      );
    }

    const farm = creator.currentFarm;

    // Verify creator is the owner of the farm
    if (farm.owner.id !== creatorId) {
      throw new ForbiddenException(
        "Only the farm owner can list users of this farm",
      );
    }

    const farmId = farm.id;
    const ownerId = farm.owner.id;
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // Build query for farm members (exclude owner)
    const queryBuilder = this.farmMemberRepo
      .createQueryBuilder("farmMember")
      .leftJoinAndSelect("farmMember.user", "user")
      .leftJoinAndSelect("farmMember.role", "role")
      .leftJoinAndSelect("farmMember.farm", "farm")
      .where("farm.id = :farmId", { farmId })
      .andWhere("user.id != :ownerId", { ownerId })
      .orderBy("farmMember.createdAt", "DESC");

    // Apply role filter
    if (query.roleId) {
      queryBuilder.andWhere("role.id = :roleId", { roleId: query.roleId });
    }

    // Apply active status filter
    if (query.isActive !== undefined) {
      queryBuilder.andWhere("user.isActive = :isActive", {
        isActive: query.isActive,
      });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const farmMembers = await queryBuilder.skip(skip).take(limit).getMany();

    // Fetch permissions for each user
    const usersWithPermissions = await Promise.all(
      farmMembers.map(async (member) => {
        const permissions = await this.userPermissionRepo.find({
          where: {
            user: { id: member.user.id },
            farm: { id: farmId },
          },
          relations: ["permission"],
        });

        return {
          id: member.id,
          user: {
            id: member.user.id,
            email: member.user.email,
            name: member.user.name,
            mobile: member.user.mobile,
            isActive: member.user.isActive,
            emailVerified: member.user.emailVerified,
            createdAt: member.user.createdAt,
          },
          role: {
            id: member.role.id,
            roleName: member.role.roleName,
          },
          permissions: permissions.map((up) => ({
            id: up.permission.id,
            module: up.permission.module,
            action: up.permission.action,
            description: up.permission.description,
          })),
          createdAt: member.createdAt,
        };
      }),
    );

    return {
      message: "Users fetched successfully",
      data: {
        users: usersWithPermissions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async updateUser(creatorId: string, userId: string, dto: UpdateUserDto) {
    // Get creator user with currentFarm
    const creator = await this.userRepo.findOne({
      where: { id: creatorId },
      relations: ["currentFarm", "currentFarm.owner"],
    });

    if (!creator) {
      throw new NotFoundException("Creator user not found");
    }

    if (!creator.currentFarm) {
      throw new BadRequestException(
        "User must have a current farm selected to update users",
      );
    }

    const farm = creator.currentFarm;

    // Verify creator is the owner of the farm
    if (farm.owner.id !== creatorId) {
      throw new ForbiddenException(
        "Only the farm owner can update users of this farm",
      );
    }

    const farmId = farm.id;

    // Verify user exists and is a member of this farm
    const farmMember = await this.farmMemberRepo.findOne({
      where: {
        user: { id: userId },
        farm: { id: farmId },
      },
      relations: ["user", "role", "farm"],
    });

    if (!farmMember) {
      throw new NotFoundException(
        "User not found or is not a member of this farm",
      );
    }

    const user = farmMember.user;

    // Determine update type based on provided fields
    const hasStatusUpdate = dto.isActive !== undefined;
    const hasPermissionUpdate = dto.permissionIds !== undefined;
    const hasDetailsUpdate =
      dto.name !== undefined ||
      dto.email !== undefined ||
      dto.password !== undefined ||
      dto.roleId !== undefined;

    // Update active status
    if (hasStatusUpdate) {
      user.isActive = dto.isActive;
      await this.userRepo.save(user);
    }

    // Update permissions
    if (hasPermissionUpdate) {
      await this.assignPermissions(userId, farmId, dto.permissionIds || []);
    }

    // Update user details
    if (hasDetailsUpdate) {
      // Update name if provided
      if (dto.name !== undefined) {
        user.name = dto.name;
      }

      // Check if email already exists (if changing email)
      if (dto.email && dto.email !== user.email) {
        const existingUser = await this.userRepo.findOne({
          where: { email: dto.email },
        });
        if (existingUser && existingUser.id !== userId) {
          throw new ConflictException("Email already exists");
        }
        user.email = dto.email;
      }

      // Update password if provided
      if (dto.password) {
        user.password = this.bcrypt.hashSync(dto.password);
      }

      // Update role if provided
      if (dto.roleId) {
        const role = await this.roleRepo.findOne({
          where: { id: dto.roleId },
        });
        if (!role) {
          throw new NotFoundException("Role not found");
        }

        if (
          role.roleName === FarmRole.OWNER ||
          role.roleName === UserRole.SUPER_ADMIN
        ) {
          throw new BadRequestException(
            "Cannot assign OWNER or SUPER_ADMIN role to users",
          );
        }

        // Update both user role and farm member role
        user.role = role;
        farmMember.role = role;
        await this.userRepo.save(user);
        await this.farmMemberRepo.save(farmMember);
      } else {
        await this.userRepo.save(user);
      }
    }

    // Fetch updated member with relations
    const updatedMember = await this.farmMemberRepo.findOne({
      where: { id: farmMember.id },
      relations: ["user", "role", "farm"],
    });

    if (!updatedMember) {
      throw new NotFoundException("Member not found after update");
    }

    // Fetch assigned permissions
    const userPermissions = await this.userPermissionRepo.find({
      where: {
        user: { id: userId },
        farm: { id: farmId },
      },
      relations: ["permission"],
    });

    return {
      message: "User updated successfully",
      data: {
        user: {
          id: updatedMember.user.id,
          email: updatedMember.user.email,
          name: updatedMember.user.name,
          mobile: updatedMember.user.mobile,
          isActive: updatedMember.user.isActive,
          role: {
            id: updatedMember.role.id,
            roleName: updatedMember.role.roleName,
          },
        },
        permissions: userPermissions.map((up) => ({
          id: up.permission.id,
          module: up.permission.module,
          action: up.permission.action,
          description: up.permission.description,
        })),
      },
    };
  }

  async getUserDetails(creatorId: string, userId: string) {
    // Get creator user with currentFarm
    const creator = await this.userRepo.findOne({
      where: { id: creatorId },
      relations: ["currentFarm", "currentFarm.owner"],
    });

    if (!creator) {
      throw new NotFoundException("Creator user not found");
    }

    if (!creator.currentFarm) {
      throw new BadRequestException(
        "User must have a current farm selected to view user details",
      );
    }

    const farm = creator.currentFarm;

    // Verify creator is the owner of the farm
    if (farm.owner.id !== creatorId) {
      throw new ForbiddenException(
        "Only the farm owner can view user details of this farm",
      );
    }

    const farmId = farm.id;

    // Verify user exists and is a member of this farm
    const farmMember = await this.farmMemberRepo.findOne({
      where: {
        user: { id: userId },
        farm: { id: farmId },
      },
      relations: ["user", "role", "farm"],
    });

    if (!farmMember) {
      throw new NotFoundException(
        "User not found or is not a member of this farm",
      );
    }

    // Fetch assigned permissions
    const userPermissions = await this.userPermissionRepo.find({
      where: {
        user: { id: userId },
        farm: { id: farmId },
      },
      relations: ["permission"],
    });

    return {
      message: "User details fetched successfully",
      data: {
        id: farmMember.id,
        user: {
          id: farmMember.user.id,
          email: farmMember.user.email,
          name: farmMember.user.name,
          mobile: farmMember.user.mobile,
          isActive: farmMember.user.isActive,
          emailVerified: farmMember.user.emailVerified,
          createdAt: farmMember.user.createdAt,
          updatedAt: farmMember.user.updatedAt,
        },
        role: {
          id: farmMember.role.id,
          roleName: farmMember.role.roleName,
        },
        farm: {
          id: farmMember.farm.id,
          farmName: farmMember.farm.farmName,
        },
        permissions: userPermissions.map((up) => ({
          id: up.permission.id,
          module: up.permission.module,
          action: up.permission.action,
          description: up.permission.description,
        })),
        createdAt: farmMember.createdAt,
        updatedAt: farmMember.updatedAt,
      },
    };
  }

  async addExistingUserToFarm(
    creatorId: string,
    userId: string,
    roleId: string,
    permissionIds: string[],
  ) {
    // Get creator user with currentFarm
    const creator = await this.userRepo.findOne({
      where: { id: creatorId },
      relations: ["currentFarm", "currentFarm.owner"],
    });

    if (!creator) {
      throw new NotFoundException("Creator user not found");
    }

    if (!creator.currentFarm) {
      throw new BadRequestException(
        "User must have a current farm selected to add users",
      );
    }

    const farm = creator.currentFarm;

    // Verify creator is the owner of the farm
    if (farm.owner.id !== creatorId) {
      throw new ForbiddenException(
        "Only the farm owner can add users to this farm",
      );
    }

    const farmId = farm.id;

    // Verify user exists
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ["role"],
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Check if user is SUPER_ADMIN - don't allow adding to farm
    if (user.role?.roleName === UserRole.SUPER_ADMIN) {
      throw new BadRequestException(
        "Cannot add a super admin as a member to a farm",
      );
    }

    // Check if user is already a member of this farm
    const existingMember = await this.farmMemberRepo.findOne({
      where: {
        user: { id: userId },
        farm: { id: farmId },
      },
    });

    if (existingMember) {
      throw new ConflictException("User is already a member of this farm");
    }

    // Find user's existing farms and verify owner
    const userFarms = await this.farmMemberRepo.find({
      where: { user: { id: userId } },
      relations: ["farm", "farm.owner"],
    });

    // Check if user belongs to any farm, and if so, verify the owner is the same
    if (userFarms.length > 0) {
      const firstFarmOwnerId = userFarms[0].farm.owner.id;
      if (firstFarmOwnerId !== creatorId) {
        throw new ForbiddenException(
          "User belongs to a farm owned by a different owner. You can only add users from your own farms.",
        );
      }
    }

    // Verify role exists and is not OWNER or SUPER_ADMIN
    const role = await this.roleRepo.findOne({
      where: { id: roleId },
    });
    if (!role) {
      throw new NotFoundException("Role not found");
    }

    if (
      role.roleName === FarmRole.OWNER ||
      role.roleName === UserRole.SUPER_ADMIN
    ) {
      throw new BadRequestException(
        "Cannot assign OWNER or SUPER_ADMIN role to users",
      );
    }

    // Create farm member entry
    const farmMember = this.farmMemberRepo.create({
      user,
      farm,
      role,
    });
    await this.farmMemberRepo.save(farmMember);

    // Set currentFarm if user doesn't have one
    if (!user.currentFarm) {
      user.currentFarm = farm;
      await this.userRepo.save(user);
    }

    // Assign permissions
    await this.assignPermissions(userId, farmId, permissionIds);

    // Fetch created member with relations
    const createdMember = await this.farmMemberRepo.findOne({
      where: { id: farmMember.id },
      relations: ["user", "role", "farm"],
    });

    if (!createdMember) {
      throw new NotFoundException("Member not found after creation");
    }

    // Fetch assigned permissions
    const userPermissions = await this.userPermissionRepo.find({
      where: {
        user: { id: userId },
        farm: { id: farmId },
      },
      relations: ["permission"],
    });

    return {
      message: "User added to farm successfully",
      data: {
        user: {
          id: createdMember.user.id,
          email: createdMember.user.email,
          name: createdMember.user.name,
          role: {
            id: createdMember.role.id,
            roleName: createdMember.role.roleName,
          },
        },
        farmMember: {
          id: createdMember.id,
          farmId: createdMember.farm.id,
          farmName: createdMember.farm.farmName,
        },
        permissions: userPermissions.map((up) => ({
          id: up.permission.id,
          module: up.permission.module,
          action: up.permission.action,
          description: up.permission.description,
        })),
      },
    };
  }

  async listAllUsersAcrossOwnerFarms(
    ownerId: string,
    search?: string,
    page: number = 1,
    limit: number = 10,
  ) {
    // Get owner user with currentFarm
    const owner = await this.userRepo.findOne({
      where: { id: ownerId },
      relations: ["currentFarm"],
    });

    if (!owner) {
      throw new NotFoundException("Owner not found");
    }

    const currentFarmId = owner.currentFarm?.id || null;

    // Get all farms owned by this owner
    const ownerFarms = await this.farmRepo.find({
      where: { owner: { id: ownerId } },
      relations: ["owner"],
    });

    if (ownerFarms.length === 0) {
      return {
        message: "No farms found for this owner",
        data: {
          users: [],
        },
      };
    }

    // Filter out current farm
    const farmIds = ownerFarms
      .filter((farm) => !currentFarmId || farm.id !== currentFarmId)
      .map((farm) => farm.id);

    if (farmIds.length === 0) {
      return {
        message: "No other farms found (only current farm exists)",
        data: {
          users: [],
        },
      };
    }

    // Build query for farm members from all owner's farms (except current)
    let queryBuilder = this.farmMemberRepo
      .createQueryBuilder("farmMember")
      .leftJoinAndSelect("farmMember.user", "user")
      .leftJoinAndSelect("farmMember.role", "role")
      .leftJoinAndSelect("farmMember.farm", "farm")
      .where("farm.id IN (:...farmIds)", { farmIds })
      .andWhere("user.id != :ownerId", { ownerId }); // Exclude farm owner

    // Apply search filter if provided
    if (search && search.trim()) {
      const searchTerm = `%${search.trim().toLowerCase()}%`;
      queryBuilder = queryBuilder.andWhere(
        "(LOWER(user.email) LIKE :search OR LOWER(user.name) LIKE :search)",
        { search: searchTerm },
      );
    }

    const farmMembers = await queryBuilder.getMany();

    // Get all user IDs who are already members of the current farm (to exclude them)
    const currentFarmUserIds = new Set<string>();
    if (currentFarmId) {
      const currentFarmMembers = await this.farmMemberRepo.find({
        where: { farm: { id: currentFarmId } },
        relations: ["user"],
      });
      currentFarmMembers.forEach((member) => {
        currentFarmUserIds.add(member.user.id);
      });
    }

    // Group by user and collect unique users with their farm memberships
    // Exclude users who are already members of the current farm
    const userMap = new Map();

    for (const member of farmMembers) {
      const userId = member.user.id;

      // Skip if user is already a member of the current farm
      if (currentFarmUserIds.has(userId)) {
        continue;
      }

      if (!userMap.has(userId)) {
        userMap.set(userId, {
          id: member.user.id,
          email: member.user.email,
          name: member.user.name,
          mobile: member.user.mobile,
          isActive: member.user.isActive,
          emailVerified: member.user.emailVerified,
          farms: [],
        });
      }

      const userData = userMap.get(userId);
      userData.farms.push({
        farmMemberId: member.id,
        farm: {
          id: member.farm.id,
          farmName: member.farm.farmName,
        },
        role: {
          id: member.role.id,
          roleName: member.role.roleName,
        },
      });
    }

    const users = Array.from(userMap.values());

    // Apply pagination
    const total = users.length;
    const skip = (page - 1) * limit;
    const paginatedUsers = users.slice(skip, skip + limit);

    return {
      message: "Users fetched successfully",
      data: {
        users: paginatedUsers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
    profilePictureFile?: Buffer,
    profilePictureFilename?: string,
  ) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Check if email is being updated and if it already exists
    if (dto.email && dto.email !== user.email) {
      const existingUser = await this.userRepo.findOne({
        where: { email: dto.email },
      });
      if (existingUser) {
        throw new ConflictException("Email already exists");
      }
      user.email = dto.email;
    }

    // Update name if provided
    if (dto.name !== undefined) {
      user.name = dto.name;
    }

    // Handle profile picture upload
    if (profilePictureFile && profilePictureFilename) {
      // Delete old profile picture if exists
      if (user.profilePicture) {
        try {
          await this.s3Service.deleteFile(user.profilePicture);
        } catch (error) {
          // Log error but don't fail the update
          console.error("Error deleting old profile picture:", error);
        }
      }

      // Upload new profile picture
      const profilePictureUrl = await this.s3Service.uploadFile(
        profilePictureFile,
        profilePictureFilename,
        "profile-pictures",
      );
      user.profilePicture = profilePictureUrl;
    }

    await this.userRepo.save(user);

    // Fetch updated user
    const updatedUser = await this.userRepo.findOne({
      where: { id: userId },
      relations: ["role", "currentFarm"],
    });

    if (!updatedUser) {
      throw new NotFoundException("User not found after update");
    }

    const { password, ...userWithoutPassword } = updatedUser;

    return {
      message: "Profile updated successfully",
      data: {
        user: userWithoutPassword,
      },
    };
  }
}
