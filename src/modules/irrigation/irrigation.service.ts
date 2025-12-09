import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Farm } from "../../database/entities/farm.entity";
import { Field } from "../../database/entities/field.entity";
import { IrrigationRecord } from "../../database/entities/irrigation-record.entity";
import { PlantingRecord } from "../../database/entities/planting-record.entity";
import { User } from "../../database/entities/user.entity";
import { CreateIrrigationDto } from "./dto/create-irrigation.dto";
import { ListIrrigationDto } from "./dto/list-irrigation.dto";
import { UpdateIrrigationDto } from "./dto/update-irrigation.dto";

@Injectable()
export class IrrigationService {
  constructor(
    @InjectRepository(IrrigationRecord)
    private readonly irrigationRepo: Repository<IrrigationRecord>,
    @InjectRepository(Field)
    private readonly fieldRepo: Repository<Field>,
    @InjectRepository(PlantingRecord)
    private readonly plantingRecordRepo: Repository<PlantingRecord>,
    @InjectRepository(Farm)
    private readonly farmRepo: Repository<Farm>,
  ) {}

  async createIrrigation(
    userId: string,
    farmId: string,
    dto: CreateIrrigationDto,
  ) {
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

    // Parse irrigation date
    let irrigationDate: Date | null = null;
    if (dto.irrigationDate) {
      const parsedDate = new Date(dto.irrigationDate);
      if (Number.isNaN(parsedDate.getTime())) {
        throw new BadRequestException("Invalid irrigation date");
      }
      irrigationDate = parsedDate;
    }

    const actor = { id: userId } as User;

    const irrigation = this.irrigationRepo.create({
      field,
      plantingRecord,
      irrigationDate,
      waterVolume: dto.waterVolume,
      volumeUnit: dto.volumeUnit,
      irrigationMethod: dto.irrigationMethod,
      durationMinutes: dto.durationMinutes,
      cost: dto.cost ?? null,
      notes: dto.notes ?? null,
      createdBy: actor,
      updatedBy: actor,
    });

    await this.irrigationRepo.save(irrigation);

    const createdIrrigation = await this.irrigationRepo.findOne({
      where: { id: irrigation.id },
      relations: [
        "field",
        "field.farm",
        "plantingRecord",
        "createdBy",
        "updatedBy",
      ],
    });

    return {
      message: "Irrigation record created successfully",
      data: {
        irrigation: createdIrrigation,
      },
    };
  }

  async listIrrigation(farmId: string, query: ListIrrigationDto) {
    const farmExists = await this.farmRepo.exist({
      where: { id: farmId, deletedAt: null, isActive: true },
    });
    if (!farmExists) {
      throw new NotFoundException("Farm not found");
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const qb = this.irrigationRepo
      .createQueryBuilder("irrigation")
      .leftJoinAndSelect("irrigation.field", "field")
      .leftJoinAndSelect("field.farm", "farm")
      .leftJoinAndSelect("irrigation.plantingRecord", "plantingRecord")
      .leftJoinAndSelect("irrigation.createdBy", "createdBy")
      .leftJoinAndSelect("irrigation.updatedBy", "updatedBy")
      .where("farm.id = :farmId", { farmId })
      .andWhere("irrigation.deletedAt IS NULL")
      .orderBy("irrigation.irrigationDate", "DESC");

    // Filter by field
    if (query.fieldId) {
      qb.andWhere("field.id = :fieldId", { fieldId: query.fieldId });
    }

    // Filter by planting record
    if (query.plantingRecordId) {
      qb.andWhere("plantingRecord.id = :plantingRecordId", {
        plantingRecordId: query.plantingRecordId,
      });
    }

    // Filter by irrigation date range
    if (query.irrigationDateFrom) {
      qb.andWhere("irrigation.irrigationDate >= :irrigationDateFrom", {
        irrigationDateFrom: query.irrigationDateFrom,
      });
    }

    if (query.irrigationDateTo) {
      qb.andWhere("irrigation.irrigationDate <= :irrigationDateTo", {
        irrigationDateTo: query.irrigationDateTo,
      });
    }

    const total = await qb.getCount();
    const irrigations = await qb.skip(skip).take(limit).getMany();

    return {
      message: "Irrigation records fetched successfully",
      data: {
        irrigations,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async getIrrigationDetails(
    irrigationId: string,
    userId: string,
    userFarmId: string,
  ) {
    const irrigation = await this.irrigationRepo
      .createQueryBuilder("irrigation")
      .leftJoinAndSelect("irrigation.field", "field")
      .leftJoinAndSelect("field.farm", "farm")
      .leftJoinAndSelect("irrigation.plantingRecord", "plantingRecord")
      .leftJoinAndSelect("irrigation.createdBy", "createdBy")
      .leftJoinAndSelect("irrigation.updatedBy", "updatedBy")
      .where("irrigation.id = :irrigationId", { irrigationId })
      .andWhere("irrigation.deletedAt IS NULL")
      .andWhere("farm.id = :userFarmId", { userFarmId })
      .getOne();

    if (!irrigation) {
      throw new NotFoundException(
        "Irrigation record not found or does not belong to your current farm",
      );
    }

    return {
      message: "Irrigation record details fetched successfully",
      data: {
        irrigation,
      },
    };
  }

  async updateIrrigation(
    irrigationId: string,
    userId: string,
    userFarmId: string,
    dto: UpdateIrrigationDto,
  ) {
    const irrigation = await this.irrigationRepo
      .createQueryBuilder("irrigation")
      .leftJoinAndSelect("irrigation.field", "field")
      .leftJoinAndSelect("field.farm", "farm")
      .leftJoinAndSelect("irrigation.plantingRecord", "plantingRecord")
      .where("irrigation.id = :irrigationId", { irrigationId })
      .andWhere("irrigation.deletedAt IS NULL")
      .andWhere("farm.id = :userFarmId", { userFarmId })
      .getOne();

    if (!irrigation) {
      throw new NotFoundException(
        "Irrigation record not found or does not belong to your current farm",
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

      irrigation.field = field;
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

        irrigation.plantingRecord = plantingRecord;
      } else {
        irrigation.plantingRecord = null;
      }
    }

    // Update irrigation date if provided
    if (dto.irrigationDate !== undefined) {
      if (dto.irrigationDate) {
        const parsedDate = new Date(dto.irrigationDate);
        if (Number.isNaN(parsedDate.getTime())) {
          throw new BadRequestException("Invalid irrigation date");
        }
        irrigation.irrigationDate = parsedDate;
      } else {
        irrigation.irrigationDate = null;
      }
    }

    // Update water volume if provided
    if (dto.waterVolume !== undefined) {
      irrigation.waterVolume = dto.waterVolume ?? null;
    }

    // Update volume unit if provided
    if (dto.volumeUnit !== undefined) {
      irrigation.volumeUnit = dto.volumeUnit ?? null;
    }

    // Update irrigation method if provided
    if (dto.irrigationMethod !== undefined) {
      irrigation.irrigationMethod = dto.irrigationMethod ?? null;
    }

    // Update duration minutes if provided
    if (dto.durationMinutes !== undefined) {
      irrigation.durationMinutes = dto.durationMinutes ?? null;
    }

    // Update cost if provided
    if (dto.cost !== undefined) {
      irrigation.cost = dto.cost ?? null;
    }

    // Update notes if provided
    if (dto.notes !== undefined) {
      irrigation.notes = dto.notes ?? null;
    }

    // Update updatedBy
    const actor = { id: userId } as User;
    irrigation.updatedBy = actor;

    await this.irrigationRepo.save(irrigation);

    // Fetch updated irrigation with relations
    const updatedIrrigation = await this.irrigationRepo.findOne({
      where: { id: irrigation.id },
      relations: [
        "field",
        "field.farm",
        "plantingRecord",
        "createdBy",
        "updatedBy",
      ],
    });

    return {
      message: "Irrigation record updated successfully",
      data: {
        irrigation: updatedIrrigation,
      },
    };
  }

  async deleteIrrigation(
    irrigationId: string,
    userId: string,
    userFarmId: string,
  ) {
    const irrigation = await this.irrigationRepo
      .createQueryBuilder("irrigation")
      .leftJoinAndSelect("irrigation.field", "field")
      .leftJoinAndSelect("field.farm", "farm")
      .where("irrigation.id = :irrigationId", { irrigationId })
      .andWhere("irrigation.deletedAt IS NULL")
      .andWhere("farm.id = :userFarmId", { userFarmId })
      .getOne();

    if (!irrigation) {
      throw new NotFoundException(
        "Irrigation record not found or does not belong to your current farm",
      );
    }

    // Soft delete - set deletedAt and updatedBy
    const actor = { id: userId } as User;
    irrigation.deletedAt = new Date();
    irrigation.updatedBy = actor;

    await this.irrigationRepo.save(irrigation);

    return {
      message: "Irrigation record deleted successfully",
    };
  }
}
