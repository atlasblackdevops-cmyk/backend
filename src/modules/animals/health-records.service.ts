import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AnimalHealthRecord } from "../../database/entities/animal-health-record.entity";
import { Animal } from "../../database/entities/animal.entity";
import { User } from "../../database/entities/user.entity";
import { CreateHealthRecordDto } from "./dto/create-health-record.dto";
import { ListHealthRecordsDto } from "./dto/list-health-records.dto";
import { UpdateHealthRecordDto } from "./dto/update-health-record.dto";

@Injectable()
export class HealthRecordsService {
  constructor(
    @InjectRepository(AnimalHealthRecord)
    private readonly healthRecordRepo: Repository<AnimalHealthRecord>,
    @InjectRepository(Animal)
    private readonly animalRepo: Repository<Animal>,
  ) {}

  async createHealthRecord(
    animalId: string,
    userId: string,
    userFarmId: string,
    dto: CreateHealthRecordDto,
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
    if (!dto.recordType?.trim()) {
      throw new BadRequestException("Record type is required");
    }

    if (!dto.name?.trim()) {
      throw new BadRequestException("Name is required");
    }

    // Parse next due date if provided
    let nextDueDate: Date | null = null;
    if (dto.nextDueDate) {
      const parsedDate = new Date(dto.nextDueDate);
      if (Number.isNaN(parsedDate.getTime())) {
        throw new BadRequestException("Invalid next due date");
      }
      nextDueDate = parsedDate;
    }

    const actor = { id: userId } as User;

    const healthRecord = this.healthRecordRepo.create({
      animal,
      recordType: dto.recordType.trim(),
      name: dto.name.trim(),
      cost: dto.cost ? dto.cost.toString() : null,
      nextDueDate,
      description: dto.description ?? null,
      createdBy: actor,
      updatedBy: actor,
    });

    await this.healthRecordRepo.save(healthRecord);

    const createdRecord = await this.healthRecordRepo
      .createQueryBuilder("healthRecord")
      .leftJoinAndSelect("healthRecord.animal", "animal")
      .leftJoinAndSelect("healthRecord.createdBy", "createdBy")
      .leftJoinAndSelect("healthRecord.updatedBy", "updatedBy")
      .where("healthRecord.id = :id", { id: healthRecord.id })
      .select([
        "healthRecord",
        "animal.id",
        "animal.name",
        "createdBy.id",
        "createdBy.email",
        "updatedBy.id",
        "updatedBy.email",
      ])
      .getOne();

    return {
      message: "Health record created successfully",
      data: {
        healthRecord: createdRecord,
      },
    };
  }

  async updateHealthRecord(
    animalId: string,
    recordId: string,
    userId: string,
    userFarmId: string,
    dto: UpdateHealthRecordDto,
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

    // Check if health record exists
    const healthRecord = await this.healthRecordRepo.findOne({
      where: { id: recordId, animal: { id: animalId } },
      relations: ["animal"],
    });

    if (!healthRecord) {
      throw new NotFoundException("Health record not found");
    }

    // Check if health record is soft deleted
    if (healthRecord.deletedAt) {
      throw new NotFoundException("Health record not found");
    }

    // Update fields if provided
    if (dto.recordType !== undefined) {
      if (!dto.recordType?.trim()) {
        throw new BadRequestException("Record type cannot be empty");
      }
      healthRecord.recordType = dto.recordType.trim();
    }

    if (dto.name !== undefined) {
      if (!dto.name?.trim()) {
        throw new BadRequestException("Name cannot be empty");
      }
      healthRecord.name = dto.name.trim();
    }

    if (dto.cost !== undefined) {
      healthRecord.cost = dto.cost ? dto.cost.toString() : null;
    }

    if (dto.nextDueDate !== undefined) {
      if (dto.nextDueDate) {
        const parsedDate = new Date(dto.nextDueDate);
        if (Number.isNaN(parsedDate.getTime())) {
          throw new BadRequestException("Invalid next due date");
        }
        healthRecord.nextDueDate = parsedDate;
      } else {
        healthRecord.nextDueDate = null;
      }
    }

    if (dto.description !== undefined) {
      healthRecord.description = dto.description ?? null;
    }

    // Update updatedBy
    const actor = { id: userId } as User;
    healthRecord.updatedBy = actor;

    await this.healthRecordRepo.save(healthRecord);

    const updatedRecord = await this.healthRecordRepo
      .createQueryBuilder("healthRecord")
      .leftJoinAndSelect("healthRecord.animal", "animal")
      .leftJoinAndSelect("healthRecord.createdBy", "createdBy")
      .leftJoinAndSelect("healthRecord.updatedBy", "updatedBy")
      .where("healthRecord.id = :id", { id: healthRecord.id })
      .select([
        "healthRecord",
        "animal.id",
        "animal.name",
        "createdBy.id",
        "createdBy.email",
        "updatedBy.id",
        "updatedBy.email",
      ])
      .getOne();

    return {
      message: "Health record updated successfully",
      data: {
        healthRecord: updatedRecord,
      },
    };
  }

  async listHealthRecords(
    animalId: string,
    userId: string,
    userFarmId: string,
    query: ListHealthRecordsDto,
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

    const qb = this.healthRecordRepo
      .createQueryBuilder("healthRecord")
      .leftJoinAndSelect("healthRecord.animal", "animal")
      .leftJoinAndSelect("healthRecord.createdBy", "createdBy")
      .leftJoinAndSelect("healthRecord.updatedBy", "updatedBy")
      .where("animal.id = :animalId", { animalId })
      .andWhere("healthRecord.deletedAt IS NULL")
      .select([
        "healthRecord",
        "animal.id",
        "animal.name",
        "createdBy.id",
        "createdBy.email",
        "updatedBy.id",
        "updatedBy.email",
      ])
      .orderBy("healthRecord.createdAt", "DESC");

    // Apply date range filter
    if (query.dateFrom) {
      qb.andWhere("DATE(healthRecord.createdAt) >= :dateFrom", {
        dateFrom: query.dateFrom,
      });
    }

    if (query.dateTo) {
      qb.andWhere("DATE(healthRecord.createdAt) <= :dateTo", {
        dateTo: query.dateTo,
      });
    }

    const total = await qb.getCount();
    const healthRecords = await qb.skip(skip).take(limit).getMany();

    return {
      message: "Health records fetched successfully",
      data: {
        healthRecords,
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
