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
}
