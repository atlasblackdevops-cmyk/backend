import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Farm } from "../../database/entities/farm.entity";
import { Field } from "../../database/entities/field.entity";
import { PlantingRecord } from "../../database/entities/planting-record.entity";
import { User } from "../../database/entities/user.entity";
import { CreatePlantingDto } from "./dto/create-planting.dto";
import { ListPlantingsDto } from "./dto/list-plantings.dto";
import { UpdatePlantingDto } from "./dto/update-planting.dto";

@Injectable()
export class PlantingsService {
  constructor(
    @InjectRepository(PlantingRecord)
    private readonly plantingRepo: Repository<PlantingRecord>,
    @InjectRepository(Field)
    private readonly fieldRepo: Repository<Field>,
    @InjectRepository(Farm)
    private readonly farmRepo: Repository<Farm>,
  ) {}

  private toNumber(value: any) {
    return value === null || value === undefined ? null : Number(value);
  }

  private mapPlanting(record: PlantingRecord) {
    return {
      id: record.id,
      fieldId: record.field?.id ?? null,
      fieldName: record.field?.fieldName,
      crop: record.cropName,
      seedType: record.seedType,
      plantingDate: record.plantingDate,
      expectedHarvestDate: record.expectedHarvestDate,
      quantityPlanted: this.toNumber(record.quantityPlanted),
      quantityUnit: record.quantityUnit,
      seedCost: this.toNumber(record.seedCost),
      area: this.toNumber(record.area),
      areaUnit: record.unit,
      notes: record.notes,
      isActive: record.isActive ?? true,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private parseDate(input?: string) {
    if (!input) return null;
    const parsed = new Date(input);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException("Invalid date format");
    }
    return parsed;
  }

  async createPlanting(userId: string, farmId: string, dto: CreatePlantingDto) {
    const farmExists = await this.farmRepo.exist({ where: { id: farmId } });
    if (!farmExists) {
      throw new NotFoundException("Farm not found");
    }

    const field = await this.fieldRepo.findOne({
      where: { id: dto.fieldId },
      relations: ["farm"],
    });

    if (!field || field.deletedAt) {
      throw new NotFoundException("Field not found");
    }

    if (field.farm.id !== farmId) {
      throw new ForbiddenException("Field does not belong to this farm");
    }

    if (!dto.crop?.trim()) {
      throw new BadRequestException("Crop is required");
    }

    const plantingDate = this.parseDate(dto.plantingDate);
    const expectedHarvestDate = this.parseDate(dto.expectedHarvestDate);

    const planting = this.plantingRepo.create({
      field,
      cropName: dto.crop.trim(),
      seedType: dto.seedType?.trim() ?? null,
      plantingDate,
      expectedHarvestDate,
      quantityPlanted:
        dto.quantityPlanted === undefined || dto.quantityPlanted === null
          ? null
          : dto.quantityPlanted.toString(),
      quantityUnit: dto.quantityUnit ?? null,
      seedCost:
        dto.seedCost === undefined || dto.seedCost === null
          ? null
          : dto.seedCost.toString(),
      area:
        dto.area === undefined || dto.area === null
          ? null
          : dto.area.toString(),
      unit: dto.areaUnit ?? null,
      notes: dto.notes?.trim() ?? null,
      isActive: dto.isActive ?? true,
      createdBy: { id: userId } as User,
      updatedBy: { id: userId } as User,
    });

    await this.plantingRepo.save(planting);

    const created = await this.plantingRepo.findOne({
      where: { id: planting.id },
      relations: ["field", "field.farm"],
    });

    return {
      message: "Planting created successfully",
      data: {
        planting: created ? this.mapPlanting(created) : null,
      },
    };
  }

  async listPlantings(farmId: string, query: ListPlantingsDto) {
    const farmExists = await this.farmRepo.exist({ where: { id: farmId } });
    if (!farmExists) {
      throw new NotFoundException("Farm not found");
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const qb = this.plantingRepo
      .createQueryBuilder("planting")
      .leftJoinAndSelect("planting.field", "field")
      .leftJoinAndSelect("field.farm", "farm")
      .where("farm.id = :farmId", { farmId })
      .andWhere("planting.deletedAt IS NULL")
      .orderBy("planting.createdAt", "DESC");

    if (query.search) {
      qb.andWhere(
        `(LOWER(planting.cropName) LIKE LOWER(:search)
          OR LOWER(planting.seedType) LIKE LOWER(:search))`,
        { search: `%${query.search}%` },
      );
    }

    if (query.crop) {
      qb.andWhere("LOWER(planting.cropName) = LOWER(:crop)", {
        crop: query.crop,
      });
    }

    if (query.fieldId) {
      qb.andWhere("field.id = :fieldId", { fieldId: query.fieldId });
    }

    if (query.plantingDateFrom) {
      qb.andWhere("planting.plantingDate >= :from", {
        from: query.plantingDateFrom,
      });
    }

    if (query.plantingDateTo) {
      qb.andWhere("planting.plantingDate <= :to", {
        to: query.plantingDateTo,
      });
    }

    if (typeof query.isActive === "boolean") {
      qb.andWhere("planting.isActive = :isActive", {
        isActive: query.isActive,
      });
    }

    const total = await qb.getCount();
    const plantings = await qb.skip(skip).take(limit).getMany();

    return {
      message: "Plantings fetched successfully",
      data: {
        plantings: plantings.map((p) => this.mapPlanting(p)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async getPlantingDetails(plantingId: string, farmId: string) {
    const planting = await this.plantingRepo.findOne({
      where: { id: plantingId },
      relations: ["field", "field.farm"],
    });

    if (!planting || planting.deletedAt) {
      throw new NotFoundException("Planting not found");
    }

    if (planting.field.farm.id !== farmId) {
      throw new ForbiddenException(
        "Planting does not belong to your current farm",
      );
    }

    return {
      message: "Planting details fetched successfully",
      data: {
        planting: this.mapPlanting(planting),
      },
    };
  }

  async updatePlanting(
    plantingId: string,
    farmId: string,
    userId: string,
    dto: UpdatePlantingDto,
  ) {
    const planting = await this.plantingRepo.findOne({
      where: { id: plantingId },
      relations: ["field", "field.farm"],
    });

    if (!planting || planting.deletedAt) {
      throw new NotFoundException("Planting not found");
    }

    if (planting.field.farm.id !== farmId) {
      throw new ForbiddenException(
        "Planting does not belong to your current farm",
      );
    }

    if (dto.fieldId && dto.fieldId !== planting.field.id) {
      const newField = await this.fieldRepo.findOne({
        where: { id: dto.fieldId },
        relations: ["farm"],
      });

      if (!newField || newField.deletedAt) {
        throw new NotFoundException("Field not found");
      }

      if (newField.farm.id !== farmId) {
        throw new ForbiddenException("Field does not belong to this farm");
      }

      planting.field = newField;
    }

    if (dto.crop !== undefined) {
      if (!dto.crop?.trim()) {
        throw new BadRequestException("Crop cannot be empty");
      }
      planting.cropName = dto.crop.trim();
    }

    if (dto.seedType !== undefined) {
      planting.seedType = dto.seedType?.trim() ?? null;
    }

    if (dto.plantingDate !== undefined) {
      planting.plantingDate = this.parseDate(dto.plantingDate);
    }

    if (dto.expectedHarvestDate !== undefined) {
      planting.expectedHarvestDate = this.parseDate(dto.expectedHarvestDate);
    }

    if (dto.quantityPlanted !== undefined) {
      planting.quantityPlanted =
        dto.quantityPlanted === null ? null : dto.quantityPlanted.toString();
    }

    if (dto.quantityUnit !== undefined) {
      planting.quantityUnit = dto.quantityUnit ?? null;
    }

    if (dto.seedCost !== undefined) {
      planting.seedCost =
        dto.seedCost === null ? null : dto.seedCost.toString();
    }

    if (dto.area !== undefined) {
      planting.area = dto.area === null ? null : dto.area.toString();
    }

    if (dto.areaUnit !== undefined) {
      planting.unit = dto.areaUnit ?? null;
    }

    if (dto.notes !== undefined) {
      planting.notes = dto.notes?.trim() ?? null;
    }

    if (typeof dto.isActive === "boolean") {
      planting.isActive = dto.isActive;
    }

    planting.updatedBy = { id: userId } as User;

    await this.plantingRepo.save(planting);

    const updated = await this.plantingRepo.findOne({
      where: { id: planting.id },
      relations: ["field", "field.farm"],
    });

    return {
      message: "Planting updated successfully",
      data: {
        planting: updated ? this.mapPlanting(updated) : null,
      },
    };
  }

  async deletePlanting(plantingId: string, farmId: string, userId: string) {
    const planting = await this.plantingRepo.findOne({
      where: { id: plantingId },
      relations: ["field", "field.farm"],
    });

    if (!planting || planting.deletedAt) {
      throw new NotFoundException("Planting not found");
    }

    if (planting.field.farm.id !== farmId) {
      throw new ForbiddenException(
        "Planting does not belong to your current farm",
      );
    }

    planting.deletedAt = new Date();
    planting.isActive = false;
    planting.updatedBy = { id: userId } as User;

    await this.plantingRepo.save(planting);

    return { message: "Planting deleted successfully" };
  }
}
