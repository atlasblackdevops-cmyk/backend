import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Farm } from "../../database/entities/farm.entity";
import { Field } from "../../database/entities/field.entity";
import { Harvest } from "../../database/entities/harvest.entity";
import { PlantingRecord } from "../../database/entities/planting-record.entity";
import { User } from "../../database/entities/user.entity";
import { CreateHarvestDto } from "./dto/create-harvest.dto";
import { ListHarvestsDto } from "./dto/list-harvests.dto";
import { UpdateHarvestDto } from "./dto/update-harvest.dto";
import { YieldBySeasonDto } from "./dto/yield-by-season.dto";

@Injectable()
export class HarvestsService {
  constructor(
    @InjectRepository(Harvest)
    private readonly harvestRepo: Repository<Harvest>,
    @InjectRepository(Field)
    private readonly fieldRepo: Repository<Field>,
    @InjectRepository(PlantingRecord)
    private readonly plantingRecordRepo: Repository<PlantingRecord>,
    @InjectRepository(Farm)
    private readonly farmRepo: Repository<Farm>,
  ) {}

  async createHarvest(userId: string, farmId: string, dto: CreateHarvestDto) {
    // Check farm exists
    const farm = await this.farmRepo.findOne({
      where: { id: farmId, deletedAt: null, isActive: true },
    });

    if (!farm) {
      throw new NotFoundException("Farm not found");
    }

    // Check field exists and belongs to the farm
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

    // Check planting record exists and belongs to the farm (if provided)
    let plantingRecord: PlantingRecord | null = null;
    if (dto.plantingRecordId) {
      plantingRecord = await this.plantingRecordRepo
        .createQueryBuilder("plantingRecord")
        .leftJoinAndSelect("plantingRecord.field", "field")
        .leftJoinAndSelect("field.farm", "farm")
        .where("plantingRecord.id = :plantingRecordId", {
          plantingRecordId: dto.plantingRecordId,
        })
        .andWhere("plantingRecord.deletedAt IS NULL")
        .andWhere("farm.id = :farmId", { farmId })
        .getOne();

      if (!plantingRecord) {
        throw new NotFoundException(
          "Planting record not found or does not belong to your current farm",
        );
      }
    }

    // Parse harvest date
    let harvestDate: Date | null = null;
    if (dto.harvestDate) {
      const parsedDate = new Date(dto.harvestDate);
      if (Number.isNaN(parsedDate.getTime())) {
        throw new BadRequestException("Invalid harvest date");
      }
      harvestDate = parsedDate;
    }

    const actor = { id: userId } as User;

    const harvest = this.harvestRepo.create({
      field,
      plantingRecord,
      harvestDate,
      cropType: dto.cropType,
      yieldAmount: dto.yieldAmount,
      yieldUnit: dto.yieldUnit,
      notes: dto.notes ?? null,
      createdBy: actor,
      updatedBy: actor,
    });

    await this.harvestRepo.save(harvest);

    const createdHarvest = await this.harvestRepo.findOne({
      where: { id: harvest.id },
      relations: [
        "field",
        "field.farm",
        "plantingRecord",
        "createdBy",
        "updatedBy",
      ],
    });

    return {
      message: "Harvest created successfully",
      data: {
        harvest: createdHarvest,
      },
    };
  }

  async listHarvests(farmId: string, query: ListHarvestsDto) {
    const farmExists = await this.farmRepo.exist({
      where: { id: farmId, deletedAt: null, isActive: true },
    });
    if (!farmExists) {
      throw new NotFoundException("Farm not found");
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const qb = this.harvestRepo
      .createQueryBuilder("harvest")
      .leftJoinAndSelect("harvest.field", "field")
      .leftJoinAndSelect("field.farm", "farm")
      .leftJoinAndSelect("harvest.plantingRecord", "plantingRecord")
      .leftJoinAndSelect("harvest.createdBy", "createdBy")
      .leftJoinAndSelect("harvest.updatedBy", "updatedBy")
      .where("farm.id = :farmId", { farmId })
      .andWhere("harvest.deletedAt IS NULL")
      .orderBy("harvest.harvestDate", "DESC");

    // Filter by harvest date range
    if (query.harvestDateFrom) {
      qb.andWhere("harvest.harvestDate >= :harvestDateFrom", {
        harvestDateFrom: query.harvestDateFrom,
      });
    }

    if (query.harvestDateTo) {
      qb.andWhere("harvest.harvestDate <= :harvestDateTo", {
        harvestDateTo: query.harvestDateTo,
      });
    }

    const total = await qb.getCount();
    const harvests = await qb.skip(skip).take(limit).getMany();

    return {
      message: "Harvests fetched successfully",
      data: {
        harvests,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  private escapeCsvField(value: string | null | undefined): string {
    // Convert null/undefined to empty string, then check if empty
    const stringValue =
      value === null || value === undefined ? "" : String(value).trim();

    // Return "-" for empty strings
    if (stringValue === "") {
      return "-";
    }

    // If value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (
      stringValue.includes(",") ||
      stringValue.includes('"') ||
      stringValue.includes("\n")
    ) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  }

  private formatDate(date: Date | null | undefined): string {
    if (!date) {
      return "-";
    }
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  async exportHarvestsToCSV(
    farmId: string,
    query: ListHarvestsDto,
  ): Promise<string> {
    const farmExists = await this.farmRepo.exist({
      where: { id: farmId, deletedAt: null, isActive: true },
    });
    if (!farmExists) {
      throw new NotFoundException("Farm not found");
    }

    // Build query same as listHarvests but without pagination
    const qb = this.harvestRepo
      .createQueryBuilder("harvest")
      .leftJoinAndSelect("harvest.field", "field")
      .leftJoinAndSelect("field.farm", "farm")
      .leftJoinAndSelect("harvest.plantingRecord", "plantingRecord")
      .leftJoinAndSelect("harvest.createdBy", "createdBy")
      .where("farm.id = :farmId", { farmId })
      .andWhere("harvest.deletedAt IS NULL")
      .orderBy("harvest.harvestDate", "DESC");

    // Filter by harvest date range
    if (query.harvestDateFrom) {
      qb.andWhere("harvest.harvestDate >= :harvestDateFrom", {
        harvestDateFrom: query.harvestDateFrom,
      });
    }

    if (query.harvestDateTo) {
      qb.andWhere("harvest.harvestDate <= :harvestDateTo", {
        harvestDateTo: query.harvestDateTo,
      });
    }

    const harvests = await qb.getMany();

    // CSV Headers
    const headers = [
      "Field Name",
      "Planting Record Name",
      "Harvest Date",
      "Crop Type",
      "Yield Amount",
      "Yield Unit",
      "Notes",
      "Created By User Name",
    ];

    // Build CSV content
    const csvRows: string[] = [
      headers.map((h) => this.escapeCsvField(h)).join(","),
    ];

    for (const harvest of harvests) {
      const row = [
        this.escapeCsvField(harvest.field?.fieldName),
        this.escapeCsvField(harvest.plantingRecord?.cropName),
        this.formatDate(harvest.harvestDate),
        this.escapeCsvField(harvest.cropType),
        this.escapeCsvField(harvest.yieldAmount),
        this.escapeCsvField(harvest.yieldUnit),
        this.escapeCsvField(harvest.notes),
        this.escapeCsvField(harvest.createdBy?.name),
      ];
      csvRows.push(row.join(","));
    }

    return csvRows.join("\n");
  }

  async getHarvestDetails(
    harvestId: string,
    userId: string,
    userFarmId: string,
  ) {
    const harvest = await this.harvestRepo
      .createQueryBuilder("harvest")
      .leftJoinAndSelect("harvest.field", "field")
      .leftJoinAndSelect("field.farm", "farm")
      .leftJoinAndSelect("harvest.plantingRecord", "plantingRecord")
      .leftJoinAndSelect("harvest.createdBy", "createdBy")
      .leftJoinAndSelect("harvest.updatedBy", "updatedBy")
      .where("harvest.id = :harvestId", { harvestId })
      .andWhere("harvest.deletedAt IS NULL")
      .andWhere("farm.id = :userFarmId", { userFarmId })
      .getOne();

    if (!harvest) {
      throw new NotFoundException(
        "Harvest not found or does not belong to your current farm",
      );
    }

    return {
      message: "Harvest details fetched successfully",
      data: {
        harvest,
      },
    };
  }

  async updateHarvest(
    harvestId: string,
    userId: string,
    userFarmId: string,
    dto: UpdateHarvestDto,
  ) {
    const harvest = await this.harvestRepo
      .createQueryBuilder("harvest")
      .leftJoinAndSelect("harvest.field", "field")
      .leftJoinAndSelect("field.farm", "farm")
      .leftJoinAndSelect("harvest.plantingRecord", "plantingRecord")
      .where("harvest.id = :harvestId", { harvestId })
      .andWhere("harvest.deletedAt IS NULL")
      .andWhere("farm.id = :userFarmId", { userFarmId })
      .getOne();

    if (!harvest) {
      throw new NotFoundException(
        "Harvest not found or does not belong to your current farm",
      );
    }

    // Update field if provided
    if (dto.fieldId !== undefined) {
      const field = await this.fieldRepo.findOne({
        where: {
          id: dto.fieldId,
          deletedAt: null,
          farm: { id: userFarmId },
        },
      });

      if (!field) {
        throw new NotFoundException(
          "Field not found or does not belong to your current farm",
        );
      }

      harvest.field = field;
    }

    // Update planting record if provided
    if (dto.plantingRecordId !== undefined) {
      if (dto.plantingRecordId) {
        const plantingRecord = await this.plantingRecordRepo
          .createQueryBuilder("plantingRecord")
          .leftJoinAndSelect("plantingRecord.field", "field")
          .leftJoinAndSelect("field.farm", "farm")
          .where("plantingRecord.id = :plantingRecordId", {
            plantingRecordId: dto.plantingRecordId,
          })
          .andWhere("plantingRecord.deletedAt IS NULL")
          .andWhere("farm.id = :userFarmId", { userFarmId })
          .getOne();

        if (!plantingRecord) {
          throw new NotFoundException(
            "Planting record not found or does not belong to your current farm",
          );
        }

        harvest.plantingRecord = plantingRecord;
      } else {
        harvest.plantingRecord = null;
      }
    }

    // Update harvest date if provided
    if (dto.harvestDate !== undefined) {
      if (dto.harvestDate) {
        const parsedDate = new Date(dto.harvestDate);
        if (Number.isNaN(parsedDate.getTime())) {
          throw new BadRequestException("Invalid harvest date");
        }
        harvest.harvestDate = parsedDate;
      } else {
        harvest.harvestDate = null;
      }
    }

    // Update crop type if provided
    if (dto.cropType !== undefined) {
      harvest.cropType = dto.cropType ?? null;
    }

    // Update yield amount if provided
    if (dto.yieldAmount !== undefined) {
      harvest.yieldAmount = dto.yieldAmount ?? null;
    }

    // Update yield unit if provided
    if (dto.yieldUnit !== undefined) {
      harvest.yieldUnit = dto.yieldUnit ?? null;
    }

    // Update notes if provided
    if (dto.notes !== undefined) {
      harvest.notes = dto.notes ?? null;
    }

    // Update updatedBy
    const actor = { id: userId } as User;
    harvest.updatedBy = actor;

    await this.harvestRepo.save(harvest);

    // Fetch updated harvest with relations
    const updatedHarvest = await this.harvestRepo.findOne({
      where: { id: harvest.id },
      relations: [
        "field",
        "field.farm",
        "plantingRecord",
        "createdBy",
        "updatedBy",
      ],
    });

    return {
      message: "Harvest updated successfully",
      data: {
        harvest: updatedHarvest,
      },
    };
  }

  async deleteHarvest(harvestId: string, userId: string, userFarmId: string) {
    const harvest = await this.harvestRepo
      .createQueryBuilder("harvest")
      .leftJoinAndSelect("harvest.field", "field")
      .leftJoinAndSelect("field.farm", "farm")
      .where("harvest.id = :harvestId", { harvestId })
      .andWhere("harvest.deletedAt IS NULL")
      .andWhere("farm.id = :userFarmId", { userFarmId })
      .getOne();

    if (!harvest) {
      throw new NotFoundException(
        "Harvest not found or does not belong to your current farm",
      );
    }

    // Soft delete - set deletedAt and updatedBy
    const actor = { id: userId } as User;
    harvest.deletedAt = new Date();
    harvest.updatedBy = actor;

    await this.harvestRepo.save(harvest);

    return {
      message: "Harvest deleted successfully",
    };
  }

  /**
   * Helper function to determine season from a date
   * Spring: March (3), April (4), May (5)
   * Summer: June (6), July (7), August (8)
   * Fall: September (9), October (10), November (11)
   * Winter: December (12), January (1), February (2)
   */
  private getSeasonFromDate(date: Date): { year: number; season: string } {
    const month = date.getMonth() + 1; // getMonth() returns 0-11, so add 1
    const year = date.getFullYear();

    let season: string;
    if (month >= 3 && month <= 5) {
      season = "Spring";
    } else if (month >= 6 && month <= 8) {
      season = "Summer";
    } else if (month >= 9 && month <= 11) {
      season = "Fall";
    } else {
      season = "Winter";
    }

    return { year, season };
  }

  async getYieldBySeason(
    userFarmId: string,
    query: YieldBySeasonDto,
  ): Promise<{
    message: string;
    data: {
      yields: Array<{
        season: string;
        yieldAmount: number;
        yieldUnit: string;
        cropType: string;
      }>;
    };
  }> {
    // Check farm exists
    const farmExists = await this.farmRepo.exist({
      where: { id: userFarmId, deletedAt: null, isActive: true },
    });
    if (!farmExists) {
      throw new NotFoundException("Farm not found");
    }

    // Build query
    const qb = this.harvestRepo
      .createQueryBuilder("harvest")
      .leftJoinAndSelect("harvest.field", "field")
      .leftJoinAndSelect("field.farm", "farm")
      .where("farm.id = :farmId", { farmId: userFarmId })
      .andWhere("harvest.deletedAt IS NULL")
      .andWhere("harvest.harvestDate IS NOT NULL")
      .andWhere("harvest.cropType IS NOT NULL")
      .andWhere("harvest.yieldAmount IS NOT NULL")
      .andWhere("harvest.yieldUnit IS NOT NULL");

    // Filter by crop type if provided
    if (query.cropType) {
      qb.andWhere("harvest.cropType = :cropType", {
        cropType: query.cropType,
      });
    }

    const harvests = await qb.getMany();

    // Group by season and cropType, and sum yieldAmount
    const yieldMap = new Map<
      string,
      { yieldAmount: number; yieldUnit: string; cropType: string }
    >();

    for (const harvest of harvests) {
      if (!harvest.harvestDate || !harvest.cropType || !harvest.yieldAmount) {
        continue;
      }

      const { year, season } = this.getSeasonFromDate(harvest.harvestDate);
      const seasonKey = `${year} ${season}`;
      const mapKey = `${seasonKey}|${harvest.cropType}`;

      const yieldAmount = parseFloat(harvest.yieldAmount.toString()) || 0;
      const yieldUnit = harvest.yieldUnit || "kg";

      if (yieldMap.has(mapKey)) {
        const existing = yieldMap.get(mapKey)!;
        existing.yieldAmount += yieldAmount;
      } else {
        yieldMap.set(mapKey, {
          yieldAmount,
          yieldUnit,
          cropType: harvest.cropType,
        });
      }
    }

    // Convert map to array format
    const yields = Array.from(yieldMap.entries()).map(([mapKey, data]) => {
      const [season] = mapKey.split("|");
      return {
        season,
        yieldAmount: Number(data.yieldAmount.toFixed(2)),
        yieldUnit: data.yieldUnit,
        cropType: data.cropType,
      };
    });

    // Sort by season (chronologically) and cropType
    yields.sort((a, b) => {
      // Extract year and season name for comparison
      const [yearA, seasonA] = a.season.split(" ");
      const [yearB, seasonB] = b.season.split(" ");

      const yearDiff = parseInt(yearA) - parseInt(yearB);
      if (yearDiff !== 0) return yearDiff;

      // Season order: Spring (1), Summer (2), Fall (3), Winter (4)
      const seasonOrder: Record<string, number> = {
        Spring: 1,
        Summer: 2,
        Fall: 3,
        Winter: 4,
      };

      const seasonDiff =
        (seasonOrder[seasonA] || 0) - (seasonOrder[seasonB] || 0);
      if (seasonDiff !== 0) return seasonDiff;

      // If same season, sort by cropType
      return a.cropType.localeCompare(b.cropType);
    });

    return {
      message: "Yield data retrieved successfully",
      data: {
        yields,
      },
    };
  }
}
