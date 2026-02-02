import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { FarmMember } from "../../database/entities/farm-member.entity";
import { Farm } from "../../database/entities/farm.entity";
import { Referral } from "../../database/entities/referral.entity";
import { Role } from "../../database/entities/role.entity";
import { User } from "../../database/entities/user.entity";
import { FarmRole } from "../../enums/user.enum";
import { S3Service } from "../../services/s3.service";
import { CreateFarmDto } from "./dto/create-farm.dto";
import { UpdateFarmDto } from "./dto/update-farm.dto";

@Injectable()
export class FarmService {
  constructor(
    @InjectRepository(Farm) private readonly farmRepo: Repository<Farm>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(FarmMember)
    private readonly farmMemberRepo: Repository<FarmMember>,
    @InjectRepository(Referral)
    private readonly referralRepo: Repository<Referral>,
    private readonly s3Service: S3Service,
  ) {}

  // Create farm owned by the authenticated user + bootstrap owner membership
  async createFarm(
    ownerId: string,
    dto: CreateFarmDto,
    farmLogoFile?: Buffer,
    farmLogoFilename?: string,
  ) {
    const owner = await this.userRepo.findOne({
      where: { id: ownerId },
      relations: ["currentFarm", "role"],
    });
    if (!owner) throw new NotFoundException("Owner not found");

    // Verify user has OWNER role
    const roleName =
      (owner.role && owner.role.roleName) ||
      (await this.roleRepo.findOneBy({ id: (owner as any).roleId }))?.roleName;
    if (roleName !== "OWNER") {
      throw new ForbiddenException(
        "Only users with OWNER role can create farms",
      );
    }

    let farmLogoKey: string | null = null;
    if (farmLogoFile && farmLogoFilename) {
      // Store only the key (path), not the full URL
      farmLogoKey = await this.s3Service.uploadFile(
        farmLogoFile,
        farmLogoFilename,
        "farm-logos",
      );
    }

    const farm = this.farmRepo.create({
      farmName: dto.farmName,
      farmCode: await this.generateUniqueFarmCode(),
      city: dto.city ?? null,
      state: dto.state ?? null,
      country: dto.country ?? null,
      address: dto.address ?? null,
      farmLogo: farmLogoKey,
      owner,
    });
    await this.farmRepo.save(farm);

    const ownerRole = await this.roleRepo.findOne({
      where: { roleName: FarmRole.OWNER },
    });
    if (!ownerRole) {
      throw new InternalServerErrorException("OWNER role is missing");
    }

    await this.farmMemberRepo.save(
      this.farmMemberRepo.create({
        user: owner,
        farm,
        role: ownerRole,
      }),
    );

    // Check if this is the user's first farm (sign-up completion)
    const isFirstFarm = !owner.currentFarm;

    if (isFirstFarm) {
      owner.currentFarm = farm;
      await this.userRepo.save(owner);

      // Mark referral as completed if user was referred
      // This means: user signed up with referral code, purchased plan, and created first farm
      const referral = await this.referralRepo.findOne({
        where: {
          referredTo: { id: ownerId },
          status: "pending",
        },
        relations: ["referredBy"],
      });

      if (referral) {
        referral.status = "completed";
        referral.pointsAwardedAt = new Date();
        // Note: Points awarding logic will be added in next sprint
        // For now, just mark as completed
        await this.referralRepo.save(referral);
      }
    }

    // Return farm with presigned URL for logo
    return this.s3Service.attachPresignedUrls(farm, ["farmLogo"]);
  }

  // Generate short, human-friendly unique farm codes
  private async generateUniqueFarmCode(length = 6): Promise<string> {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const maxAttempts = 100;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let code = "";
      for (let i = 0; i < length; i++) {
        code += alphabet[Math.floor(Math.random() * alphabet.length)];
      }

      const exists = await this.farmRepo.exist({ where: { farmCode: code } });
      if (!exists) {
        return code;
      }
    }

    throw new InternalServerErrorException(
      "Unable to generate unique farm code",
    );
  }

  // Owner-only update; allows toggling active state
  async updateFarm(
    ownerId: string,
    farmId: string,
    dto: UpdateFarmDto,
    farmLogoFile?: Buffer,
    farmLogoFilename?: string,
  ) {
    const farm = await this.farmRepo.findOne({
      where: { id: farmId },
      relations: ["owner", "owner.role"],
    });
    if (!farm) {
      throw new NotFoundException("Farm not found");
    }
    if (farm.owner.id !== ownerId) {
      throw new ForbiddenException("You do not own this farm");
    }

    // Verify user has OWNER role
    const roleName =
      (farm.owner.role && farm.owner.role.roleName) ||
      (await this.roleRepo.findOneBy({ id: (farm.owner as any).roleId }))
        ?.roleName;
    if (roleName !== "OWNER") {
      throw new ForbiddenException(
        "Only users with OWNER role can update farms",
      );
    }

    Object.assign(farm, {
      farmName: dto.farmName ?? farm.farmName,
      city: dto.city ?? farm.city,
      state: dto.state ?? farm.state,
      country: dto.country ?? farm.country,
      address: dto.address ?? farm.address,
    });

    if (typeof dto.isActive === "boolean") {
      farm.isActive = dto.isActive;
    }

    // Handle farm logo upload
    if (farmLogoFile && farmLogoFilename) {
      // Delete old logo if exists
      if (farm.farmLogo) {
        try {
          await this.s3Service.deleteFile(farm.farmLogo);
        } catch (error) {
          // Log error but don't fail the update
          console.error("Error deleting old farm logo:", error);
        }
      }

      // Upload new logo - store only the key
      const farmLogoKey = await this.s3Service.uploadFile(
        farmLogoFile,
        farmLogoFilename,
        "farm-logos",
      );
      farm.farmLogo = farmLogoKey;
    }

    const savedFarm = await this.farmRepo.save(farm);
    // Return farm with presigned URL for logo
    return this.s3Service.attachPresignedUrls(savedFarm, ["farmLogo"]);
  }

  // List all farms where user is a member (via FarmMember)
  // Returns farms where user has any role: OWNER, MANAGER, or USER
  async getOwnerFarms(userId: string) {
    // Get all farm memberships for this user
    const farmMembers = await this.farmMemberRepo.find({
      where: { user: { id: userId } },
      relations: ["farm"],
      order: { createdAt: "DESC" },
    });

    // Extract farms from memberships
    const farms = farmMembers.map((member) => member.farm);

    // Attach presigned URLs for all farm logos
    return this.s3Service.attachPresignedUrlsToMany(farms, ["farmLogo"]);
  }

  // Fetch single farm ensuring ownership
  async getFarmDetails(ownerId: string, farmId: string) {
    const farm = await this.farmRepo.findOne({
      where: { id: farmId },
      relations: ["owner"],
    });
    if (!farm || farm.owner.id !== ownerId) {
      throw new ForbiddenException("You do not own this farm");
    }

    // Return farm with presigned URL for logo
    return this.s3Service.attachPresignedUrls(farm, ["farmLogo"]);
  }

  // Switch current farm for the user
  // User can switch to any farm where they are a member
  async switchFarm(userId: string, farmId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ["currentFarm"],
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Verify that the farm exists
    const farm = await this.farmRepo.findOne({
      where: { id: farmId },
    });
    if (!farm) {
      throw new NotFoundException("Farm not found");
    }

    // Verify that the user is a member of this farm (has access via FarmMember)
    const farmMember = await this.farmMemberRepo.findOne({
      where: {
        user: { id: userId },
        farm: { id: farmId },
      },
    });
    if (!farmMember) {
      throw new ForbiddenException(
        "You do not have access to this farm. You must be a member (OWNER, MANAGER, or USER) to switch to it.",
      );
    }

    // Update user's current farm
    user.currentFarm = farm;
    await this.userRepo.save(user);

    // Return updated user with currentFarm (excluding password)
    const updatedUser = await this.userRepo.findOne({
      where: { id: userId },
      relations: ["role", "currentFarm"],
    });
    if (!updatedUser) {
      throw new NotFoundException("User not found after update");
    }

    // Exclude password from response
    const { password, ...userWithoutPassword } = updatedUser;

    // Attach presigned URL for farm logo
    const farmWithPresignedUrl = await this.s3Service.attachPresignedUrls(
      farm,
      ["farmLogo"],
    );

    return {
      message: "Farm switched successfully",
      data: {
        user: userWithoutPassword,
        currentFarm: farmWithPresignedUrl,
      },
    };
  }
}
