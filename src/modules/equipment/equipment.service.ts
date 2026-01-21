import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Equipment } from "../../database/entities/equipment.entity";
import { Farm } from "../../database/entities/farm.entity";
import { User } from "../../database/entities/user.entity";
import { S3Service } from "../../services/s3.service";
import { transformEquipment } from "../../utils/equipment-transformer.util";
import { CreateEquipmentDto } from "./dto/create-equipment.dto";
import { ListEquipmentDto } from "./dto/list-equipment.dto";
import { UpdateEquipmentDto } from "./dto/update-equipment.dto";

@Injectable()
export class EquipmentService {
  constructor(
    @InjectRepository(Equipment)
    private readonly equipmentRepo: Repository<Equipment>,
    @InjectRepository(Farm)
    private readonly farmRepo: Repository<Farm>,
    private readonly s3Service: S3Service,
  ) {}

  async createEquipment(
    userId: string,
    farmId: string,
    dto: CreateEquipmentDto,
    imageBuffer?: Buffer,
    imageFilename?: string,
  ) {
    const farm = await this.farmRepo.findOne({
      where: { id: farmId, deletedAt: null, isActive: true },
    });

    if (!farm) {
      throw new NotFoundException("Farm not found");
    }

    if (!dto.equipmentName?.trim()) {
      throw new BadRequestException("Equipment name is required");
    }

    let purchaseDate: Date | null = null;
    if (dto.purchaseDate) {
      const parsedDate = new Date(dto.purchaseDate);
      if (Number.isNaN(parsedDate.getTime())) {
        throw new BadRequestException("Invalid purchase date");
      }
      purchaseDate = parsedDate;
    }

    let photoUrl: string | null = null;
    if (imageBuffer && imageFilename) {
      photoUrl = await this.s3Service.uploadFile(
        imageBuffer,
        imageFilename,
        "equipment-photos",
      );
    }

    const actor = { id: userId } as User;

    const equipment = this.equipmentRepo.create({
      farm,
      equipmentName: dto.equipmentName.trim(),
      equipmentType: dto.equipmentType?.trim() || null,
      brand: dto.brand?.trim() || null,
      model: dto.model?.trim() || null,
      serialNumber: dto.serialNumber?.trim() || null,
      purchaseDate,
      purchaseCost: dto.purchaseCost?.toString() || null,
      photo: photoUrl,
      status: dto.status || "operational",
      notes: dto.notes?.trim() || null,
      createdBy: actor,
      updatedBy: actor,
    });

    await this.equipmentRepo.save(equipment);

    return {
      message: "Equipment created successfully",
    };
  }

  async listEquipment(farmId: string, query: ListEquipmentDto) {
    const farmExists = await this.farmRepo.exist({
      where: { id: farmId, deletedAt: null, isActive: true },
    });
    if (!farmExists) {
      throw new NotFoundException("Farm not found");
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const qb = this.equipmentRepo
      .createQueryBuilder("equipment")
      .leftJoinAndSelect("equipment.farm", "farm")
      .leftJoinAndSelect("farm.owner", "owner")
      .leftJoinAndSelect("equipment.createdBy", "createdBy")
      .leftJoinAndSelect("equipment.updatedBy", "updatedBy")
      .where("farm.id = :farmId", { farmId })
      .andWhere("equipment.deletedAt IS NULL")
      .orderBy("equipment.createdAt", "DESC");

    if (query.search) {
      qb.andWhere(
        `(LOWER(equipment.equipmentName) LIKE LOWER(:search)
          OR LOWER(equipment.brand) LIKE LOWER(:search)
          OR LOWER(equipment.model) LIKE LOWER(:search))`,
        { search: `%${query.search}%` },
      );
    }

    if (query.equipmentType) {
      qb.andWhere("LOWER(equipment.equipmentType) = LOWER(:equipmentType)", {
        equipmentType: query.equipmentType,
      });
    }

    if (query.status) {
      qb.andWhere("LOWER(equipment.status) = LOWER(:status)", {
        status: query.status,
      });
    }

    const total = await qb.getCount();
    const equipment = await qb.skip(skip).take(limit).getMany();

    // Transform to include only required fields
    const transformedEquipment = equipment.map(transformEquipment);

    return {
      message: "Equipment fetched successfully",
      data: {
        equipment: transformedEquipment,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async getEquipmentDetails(
    equipmentId: string,
    userId: string,
    userFarmId: string,
  ) {
    const equipment = await this.equipmentRepo
      .createQueryBuilder("equipment")
      .leftJoinAndSelect("equipment.farm", "farm")
      .leftJoinAndSelect("farm.owner", "owner")
      .leftJoinAndSelect("equipment.createdBy", "createdBy")
      .leftJoinAndSelect("equipment.updatedBy", "updatedBy")
      .where("equipment.id = :equipmentId", { equipmentId })
      .getOne();

    if (!equipment) {
      throw new NotFoundException("Equipment not found");
    }

    // Check if equipment belongs to user's current farm
    if (equipment.farm.id !== userFarmId) {
      throw new ForbiddenException(
        "Equipment does not belong to your current farm",
      );
    }

    // Check if equipment is soft deleted
    if (equipment.deletedAt) {
      throw new NotFoundException("Equipment not found");
    }

    // Transform to include only required fields
    const transformedEquipment = equipment
      ? transformEquipment(equipment)
      : null;

    return {
      message: "Equipment details fetched successfully",
      data: {
        equipment: transformedEquipment,
      },
    };
  }

  async updateEquipment(
    equipmentId: string,
    userId: string,
    userFarmId: string,
    dto: UpdateEquipmentDto,
    imageBuffer?: Buffer,
    imageFilename?: string,
  ) {
    const equipment = await this.equipmentRepo.findOne({
      where: { id: equipmentId },
      relations: ["farm", "farm.owner"],
    });

    if (!equipment) {
      throw new NotFoundException("Equipment not found");
    }

    // Check if equipment belongs to user's current farm
    if (equipment.farm.id !== userFarmId) {
      throw new ForbiddenException(
        "Equipment does not belong to your current farm",
      );
    }

    // Check if equipment is soft deleted
    if (equipment.deletedAt) {
      throw new NotFoundException("Equipment not found");
    }

    const actor = { id: userId } as User;

    // Update fields if provided
    if (dto.equipmentName !== undefined) {
      if (!dto.equipmentName?.trim()) {
        throw new BadRequestException("Equipment name cannot be empty");
      }
      equipment.equipmentName = dto.equipmentName.trim();
    }

    if (dto.equipmentType !== undefined) {
      equipment.equipmentType = dto.equipmentType?.trim() || null;
    }

    if (dto.brand !== undefined) {
      equipment.brand = dto.brand?.trim() || null;
    }

    if (dto.model !== undefined) {
      equipment.model = dto.model?.trim() || null;
    }

    if (dto.serialNumber !== undefined) {
      equipment.serialNumber = dto.serialNumber?.trim() || null;
    }

    if (dto.purchaseDate !== undefined) {
      if (dto.purchaseDate) {
        const parsedDate = new Date(dto.purchaseDate);
        if (Number.isNaN(parsedDate.getTime())) {
          throw new BadRequestException("Invalid purchase date");
        }
        equipment.purchaseDate = parsedDate;
      } else {
        equipment.purchaseDate = null;
      }
    }

    if (dto.purchaseCost !== undefined) {
      equipment.purchaseCost = dto.purchaseCost?.toString() || null;
    }

    if (dto.status !== undefined) {
      equipment.status = dto.status;
    }

    if (dto.notes !== undefined) {
      equipment.notes = dto.notes?.trim() || null;
    }

    // Handle photo update
    if (imageBuffer && imageFilename) {
      const photoUrl = await this.s3Service.uploadFile(
        imageBuffer,
        imageFilename,
        "equipment-photos",
      );
      equipment.photo = photoUrl;
    }

    equipment.updatedBy = actor;

    await this.equipmentRepo.save(equipment);

    return {
      message: "Equipment updated successfully",
    };
  }

  async deleteEquipment(
    equipmentId: string,
    userId: string,
    userFarmId: string,
  ) {
    const equipment = await this.equipmentRepo.findOne({
      where: { id: equipmentId },
      relations: ["farm"],
    });

    if (!equipment) {
      throw new NotFoundException("Equipment not found");
    }

    // Check if equipment belongs to user's current farm
    if (equipment.farm.id !== userFarmId) {
      throw new ForbiddenException(
        "Equipment does not belong to your current farm",
      );
    }

    // Check if equipment is soft deleted
    if (equipment.deletedAt) {
      throw new NotFoundException("Equipment not found");
    }

    await this.equipmentRepo.softRemove(equipment);

    return {
      message: "Equipment deleted successfully",
    };
  }
}
