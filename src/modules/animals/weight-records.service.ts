import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AnimalWeightRecord } from "../../database/entities/animal-weight-record.entity";
import { Animal } from "../../database/entities/animal.entity";
import { User } from "../../database/entities/user.entity";
import { CreateWeightRecordDto } from "./dto/create-weight-record.dto";
import { ListWeightRecordsDto } from "./dto/list-weight-records.dto";
import { UpdateWeightRecordDto } from "./dto/update-weight-record.dto";

@Injectable()
export class WeightRecordsService {
  constructor(
    @InjectRepository(AnimalWeightRecord)
    private readonly weightRecordRepo: Repository<AnimalWeightRecord>,
    @InjectRepository(Animal)
    private readonly animalRepo: Repository<Animal>,
  ) {}

  async createWeightRecord(
    animalId: string,
    userId: string,
    userFarmId: string,
    dto: CreateWeightRecordDto,
  ) {
    // Check if animal exists
    const animal = await this.animalRepo.findOne({
      where: { id: animalId },
      relations: ["farm"],
    });

    if (!animal) {
      throw new NotFoundException("Animal not found");
    }

    // Check if animal is soft deleted
    if (animal.deletedAt) {
      throw new NotFoundException("Animal not found");
    }

    // Check if animal belongs to user's current farm
    if (animal.farm.id !== userFarmId) {
      throw new ForbiddenException(
        "Animal does not belong to your current farm",
      );
    }

    // Validate required fields
    if (!dto.measuredAt) {
      throw new BadRequestException("Measured at date is required");
    }

    if (dto.weight === undefined || dto.weight === null) {
      throw new BadRequestException("Weight is required");
    }

    if (!dto.weightUnit?.trim()) {
      throw new BadRequestException("Weight unit is required");
    }

    // Parse measured at date
    const measuredAt = new Date(dto.measuredAt);
    if (Number.isNaN(measuredAt.getTime())) {
      throw new BadRequestException("Invalid measured at date");
    }

    const actor = { id: userId } as User;

    const weightRecord = this.weightRecordRepo.create({
      animal,
      measuredAt,
      weight: dto.weight.toString(),
      weightUnit: dto.weightUnit.trim(),
      notes: dto.notes ?? null,
      createdBy: actor,
      updatedBy: actor,
    });

    await this.weightRecordRepo.save(weightRecord);

    const createdRecord = await this.weightRecordRepo
      .createQueryBuilder("weightRecord")
      .leftJoinAndSelect("weightRecord.animal", "animal")
      .leftJoinAndSelect("weightRecord.createdBy", "createdBy")
      .leftJoinAndSelect("weightRecord.updatedBy", "updatedBy")
      .where("weightRecord.id = :id", { id: weightRecord.id })
      .select([
        "weightRecord",
        "animal.id",
        "animal.name",
        "createdBy.id",
        "createdBy.email",
        "updatedBy.id",
        "updatedBy.email",
      ])
      .getOne();

    return {
      message: "Weight record created successfully",
      data: {
        weightRecord: createdRecord,
      },
    };
  }

  async updateWeightRecord(
    animalId: string,
    recordId: string,
    userId: string,
    userFarmId: string,
    dto: UpdateWeightRecordDto,
  ) {
    // Check if animal exists
    const animal = await this.animalRepo.findOne({
      where: { id: animalId },
      relations: ["farm"],
    });

    if (!animal) {
      throw new NotFoundException("Animal not found");
    }

    // Check if animal is soft deleted
    if (animal.deletedAt) {
      throw new NotFoundException("Animal not found");
    }

    // Check if animal belongs to user's current farm
    if (animal.farm.id !== userFarmId) {
      throw new ForbiddenException(
        "Animal does not belong to your current farm",
      );
    }

    // Check if weight record exists
    const weightRecord = await this.weightRecordRepo.findOne({
      where: { id: recordId, animal: { id: animalId } },
      relations: ["animal"],
    });

    if (!weightRecord) {
      throw new NotFoundException("Weight record not found");
    }

    // Check if weight record is soft deleted
    if (weightRecord.deletedAt) {
      throw new NotFoundException("Weight record not found");
    }

    // Update fields if provided
    if (dto.measuredAt !== undefined) {
      if (!dto.measuredAt) {
        throw new BadRequestException("Measured at date cannot be empty");
      }
      const parsedDate = new Date(dto.measuredAt);
      if (Number.isNaN(parsedDate.getTime())) {
        throw new BadRequestException("Invalid measured at date");
      }
      weightRecord.measuredAt = parsedDate;
    }

    if (dto.weight !== undefined) {
      if (dto.weight === null) {
        throw new BadRequestException("Weight cannot be null");
      }
      weightRecord.weight = dto.weight.toString();
    }

    if (dto.weightUnit !== undefined) {
      if (!dto.weightUnit?.trim()) {
        throw new BadRequestException("Weight unit cannot be empty");
      }
      weightRecord.weightUnit = dto.weightUnit.trim();
    }

    if (dto.notes !== undefined) {
      weightRecord.notes = dto.notes ?? null;
    }

    // Update updatedBy
    const actor = { id: userId } as User;
    weightRecord.updatedBy = actor;

    await this.weightRecordRepo.save(weightRecord);

    const updatedRecord = await this.weightRecordRepo
      .createQueryBuilder("weightRecord")
      .leftJoinAndSelect("weightRecord.animal", "animal")
      .leftJoinAndSelect("weightRecord.createdBy", "createdBy")
      .leftJoinAndSelect("weightRecord.updatedBy", "updatedBy")
      .where("weightRecord.id = :id", { id: weightRecord.id })
      .select([
        "weightRecord",
        "animal.id",
        "animal.name",
        "createdBy.id",
        "createdBy.email",
        "updatedBy.id",
        "updatedBy.email",
      ])
      .getOne();

    return {
      message: "Weight record updated successfully",
      data: {
        weightRecord: updatedRecord,
      },
    };
  }

  async listWeightRecords(
    animalId: string,
    userId: string,
    userFarmId: string,
    query: ListWeightRecordsDto,
  ) {
    // Check if animal exists
    const animal = await this.animalRepo.findOne({
      where: { id: animalId },
      relations: ["farm"],
    });

    if (!animal) {
      throw new NotFoundException("Animal not found");
    }

    // Check if animal is soft deleted
    if (animal.deletedAt) {
      throw new NotFoundException("Animal not found");
    }

    // Check if animal belongs to user's current farm
    if (animal.farm.id !== userFarmId) {
      throw new ForbiddenException(
        "Animal does not belong to your current farm",
      );
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const qb = this.weightRecordRepo
      .createQueryBuilder("weightRecord")
      .leftJoinAndSelect("weightRecord.animal", "animal")
      .leftJoinAndSelect("weightRecord.createdBy", "createdBy")
      .leftJoinAndSelect("weightRecord.updatedBy", "updatedBy")
      .where("animal.id = :animalId", { animalId })
      .andWhere("weightRecord.deletedAt IS NULL")
      .select([
        "weightRecord",
        "animal.id",
        "animal.name",
        "createdBy.id",
        "createdBy.email",
        "updatedBy.id",
        "updatedBy.email",
      ])
      .orderBy("weightRecord.measuredAt", "DESC");

    // Apply date range filter on measuredAt
    if (query.dateFrom) {
      qb.andWhere("DATE(weightRecord.measuredAt) >= :dateFrom", {
        dateFrom: query.dateFrom,
      });
    }

    if (query.dateTo) {
      qb.andWhere("DATE(weightRecord.measuredAt) <= :dateTo", {
        dateTo: query.dateTo,
      });
    }

    const total = await qb.getCount();
    const weightRecords = await qb.skip(skip).take(limit).getMany();

    return {
      message: "Weight records fetched successfully",
      data: {
        weightRecords,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }
}
