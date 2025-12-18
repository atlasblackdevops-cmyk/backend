import {
  BadRequestException,
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
    const farmExists = await this.farmRepo.exist({
      where: { id: farmId, deletedAt: null, isActive: true },
    });
    if (!farmExists) {
      throw new NotFoundException("Farm not found");
    }

    const field = await this.fieldRepo.findOne({
      where: {
        id: dto.fieldId,
        deletedAt: null,
        farm: { id: farmId },
      },
    });

    if (!field) {
      throw new NotFoundException(
        "Field not found or does not belong to your current farm",
      );
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
    const farmExists = await this.farmRepo.exist({
      where: { id: farmId, deletedAt: null, isActive: true },
    });
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
      where: {
        id: plantingId,
        deletedAt: null,
        field: { farm: { id: farmId } },
      },
      relations: {
        field: {
          farm: true,
        },
      },
    });

    if (!planting) {
      throw new NotFoundException(
        "Planting not found or not part of your farm",
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
      where: {
        id: plantingId,
        deletedAt: null,
        field: { farm: { id: farmId } },
      },
      relations: ["field", "field.farm"],
    });

    if (!planting) {
      throw new NotFoundException(
        "Planting not found or not part of your farm",
      );
    }

    if (dto.fieldId && dto.fieldId !== planting.field.id) {
      const newField = await this.fieldRepo.findOne({
        where: { id: dto.fieldId, deletedAt: null, farm: { id: farmId } },
        relations: ["farm"],
      });

      if (!newField) {
        throw new NotFoundException("Field not found");
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
      where: {
        id: plantingId,
        deletedAt: null,
        field: { farm: { id: farmId } },
      },
      relations: ["field", "field.farm"],
    });

    if (!planting) {
      throw new NotFoundException(
        "Planting not found or not part of your farm",
      );
    }

    planting.deletedAt = new Date();
    planting.isActive = false;
    planting.updatedBy = { id: userId } as User;

    await this.plantingRepo.save(planting);

    return { message: "Planting deleted successfully" };
  }

  async getPlantingStats(farmId: string) {
    // Single query to get all active plantings with field info
    const activePlantings = await this.plantingRepo
      .createQueryBuilder("planting")
      .innerJoinAndSelect("planting.field", "field")
      .innerJoin("field.farm", "farm")
      .where("farm.id = :farmId", { farmId })
      .andWhere("farm.deletedAt IS NULL")
      .andWhere("farm.isActive = true")
      .andWhere("planting.deletedAt IS NULL")
      .andWhere("planting.isActive = true")
      .andWhere("field.deletedAt IS NULL")
      .orderBy("planting.plantingDate", "DESC")
      .getMany();

    // Single query to get all fields (for empty fields calculation)
    const allFields = await this.fieldRepo
      .createQueryBuilder("field")
      .innerJoin("field.farm", "farm")
      .where("farm.id = :farmId", { farmId })
      .andWhere("field.deletedAt IS NULL")
      .select([
        "field.id",
        "field.fieldName",
        "field.fieldSize",
        "field.sizeUnit",
      ])
      .getMany();

    // Early return if farm has no fields
    if (allFields.length === 0) {
      // throw new NotFoundException("Farm not found");
      return {
        message: "Planting statistics fetched successfully",
        data:{},
      };
    }


    // Single pass processing: build all data structures simultaneously
    const plantingsByField = new Map<string, any>();
    const cropStats = new Map<
      string,
      { count: number; totalArea: number; fields: Set<string> }
    >();
    const fieldsWithPlantings = new Set<string>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    const upcomingHarvests: any[] = [];
    let totalAreaPlanted = 0;

    // Single iteration to process all plantings
    for (const planting of activePlantings) {
      const field = planting.field;
      const fieldId = field.id;
      const area = planting.area ? Number(planting.area) : 0;
      const cropName = planting.cropName;

      // Group by field
      if (!plantingsByField.has(fieldId)) {
        plantingsByField.set(fieldId, {
          fieldId,
          fieldName: field.fieldName,
          fieldSize: field.fieldSize ? Number(field.fieldSize) : null,
          sizeUnit: field.sizeUnit,
          plantings: [],
        });
        fieldsWithPlantings.add(fieldId);
      }

      plantingsByField.get(fieldId)!.plantings.push({
        id: planting.id,
        cropName,
        seedType: planting.seedType,
        plantingDate: planting.plantingDate,
        expectedHarvestDate: planting.expectedHarvestDate,
        quantityPlanted: planting.quantityPlanted
          ? Number(planting.quantityPlanted)
          : null,
        quantityUnit: planting.quantityUnit,
        area: area || null,
        areaUnit: planting.unit,
      });

      // Crop statistics
      if (!cropStats.has(cropName)) {
        cropStats.set(cropName, { count: 0, totalArea: 0, fields: new Set() });
      }
      const cropStat = cropStats.get(cropName)!;
      cropStat.count++;
      cropStat.fields.add(fieldId);
      cropStat.totalArea += area;

      // Total area
      totalAreaPlanted += area;

      // Upcoming harvests
      if (planting.expectedHarvestDate) {
        const harvestDate = new Date(planting.expectedHarvestDate);
        harvestDate.setHours(0, 0, 0, 0);
        if (harvestDate >= today && harvestDate <= thirtyDaysFromNow) {
          upcomingHarvests.push({
            id: planting.id,
            cropName,
            fieldName: field.fieldName,
            expectedHarvestDate: planting.expectedHarvestDate,
            daysUntilHarvest: Math.ceil(
              (harvestDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
            ),
          });
        }
      }
    }

    // Sort upcoming harvests once
    upcomingHarvests.sort(
      (a, b) =>
        new Date(a.expectedHarvestDate).getTime() -
        new Date(b.expectedHarvestDate).getTime(),
    );

    // Fields without plantings (single pass filter)
    const fieldsWithNoActivePlantings = allFields
      .filter((field) => !fieldsWithPlantings.has(field.id))
      .map((field) => ({
        fieldId: field.id,
        fieldName: field.fieldName,
        fieldSize: field.fieldSize ? Number(field.fieldSize) : null,
        sizeUnit: field.sizeUnit,
      }));

    return {
      message: "Planting statistics fetched successfully",
      data: {
        summary: {
          totalActivePlantings: activePlantings.length,
          totalFieldsWithPlantings: plantingsByField.size,
          totalFields: allFields.length,
          totalFieldsWithoutPlantings: fieldsWithNoActivePlantings.length,
          totalAreaPlanted,
          uniqueCrops: cropStats.size,
          upcomingHarvestsCount: upcomingHarvests.length,
        },
        plantingsByField: Array.from(plantingsByField.values()),
        fieldsWithNoActivePlantings,
        cropBreakdown: Array.from(cropStats.entries()).map(
          ([cropName, stat]) => ({
            cropName,
            plantingCount: stat.count,
            totalArea: stat.totalArea,
            fieldsCount: stat.fields.size,
          }),
        ),
        upcomingHarvests,
      },
    };
  }
}
