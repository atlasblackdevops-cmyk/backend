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
      relations: ["currentFarm"],
    });
    if (!owner) throw new NotFoundException("Owner not found");

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

    if (!owner.currentFarm) {
      owner.currentFarm = farm;
      await this.userRepo.save(owner);
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
      relations: ["owner"],
    });
    if (!farm || farm.owner.id !== ownerId) {
      throw new ForbiddenException("You do not own this farm");
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

  // List farms created by the owner (used for dashboard/farm switchers)
  async getOwnerFarms(ownerId: string) {
    const farms = await this.farmRepo.find({
      where: { owner: { id: ownerId } },
      order: { createdAt: "DESC" },
    });

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
  async switchFarm(userId: string, farmId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ["currentFarm"],
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Verify that the farm exists and user owns it
    const farm = await this.farmRepo.findOne({
      where: { id: farmId },
      relations: ["owner"],
    });
    if (!farm) {
      throw new NotFoundException("Farm not found");
    }
    if (farm.owner.id !== userId) {
      throw new ForbiddenException("You do not own this farm");
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
