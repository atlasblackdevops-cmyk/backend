import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AnimalFeed } from "../../database/entities/animal-feed.entity";
import { Animal } from "../../database/entities/animal.entity";
import { User } from "../../database/entities/user.entity";
import { CreateFeedRecordDto } from "./dto/create-feed-record.dto";
import { ListFeedRecordsDto } from "./dto/list-feed-records.dto";
import { UpdateFeedRecordDto } from "./dto/update-feed-record.dto";

@Injectable()
export class FeedRecordsService {
  constructor(
    @InjectRepository(AnimalFeed)
    private readonly feedRecordRepo: Repository<AnimalFeed>,
    @InjectRepository(Animal)
    private readonly animalRepo: Repository<Animal>,
  ) {}

  async createFeedRecord(
    animalId: string,
    userId: string,
    userFarmId: string,
    dto: CreateFeedRecordDto,
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
    if (dto.quantity === undefined || dto.quantity === null) {
      throw new BadRequestException("Quantity is required");
    }

    if (!dto.quantityUnit?.trim()) {
      throw new BadRequestException("Quantity unit is required");
    }

    if (!dto.feedType?.trim()) {
      throw new BadRequestException("Feed type is required");
    }

    const actor = { id: userId } as User;

    const feedRecord = this.feedRecordRepo.create({
      animal,
      quantity: dto.quantity.toString(),
      quantityUnit: dto.quantityUnit.trim(),
      feedType: dto.feedType.trim(),
      notes: dto.notes ?? null,
      createdBy: actor,
      updatedBy: actor,
    });

    await this.feedRecordRepo.save(feedRecord);

    const createdRecord = await this.feedRecordRepo
      .createQueryBuilder("feedRecord")
      .leftJoinAndSelect("feedRecord.animal", "animal")
      .leftJoinAndSelect("feedRecord.createdBy", "createdBy")
      .leftJoinAndSelect("feedRecord.updatedBy", "updatedBy")
      .where("feedRecord.id = :id", { id: feedRecord.id })
      .select([
        "feedRecord",
        "animal.id",
        "animal.name",
        "createdBy.id",
        "createdBy.email",
        "updatedBy.id",
        "updatedBy.email",
      ])
      .getOne();

    return {
      message: "Feed record created successfully",
      data: {
        feedRecord: createdRecord,
      },
    };
  }

  async updateFeedRecord(
    animalId: string,
    recordId: string,
    userId: string,
    userFarmId: string,
    dto: UpdateFeedRecordDto,
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

    // Check if feed record exists
    const feedRecord = await this.feedRecordRepo.findOne({
      where: { id: recordId, animal: { id: animalId } },
      relations: ["animal"],
    });

    if (!feedRecord) {
      throw new NotFoundException("Feed record not found");
    }

    // Check if feed record is soft deleted
    if (feedRecord.deletedAt) {
      throw new NotFoundException("Feed record not found");
    }

    // Update fields if provided
    if (dto.quantity !== undefined) {
      if (dto.quantity === null) {
        throw new BadRequestException("Quantity cannot be null");
      }
      feedRecord.quantity = dto.quantity.toString();
    }

    if (dto.quantityUnit !== undefined) {
      if (!dto.quantityUnit?.trim()) {
        throw new BadRequestException("Quantity unit cannot be empty");
      }
      feedRecord.quantityUnit = dto.quantityUnit.trim();
    }

    if (dto.feedType !== undefined) {
      if (!dto.feedType?.trim()) {
        throw new BadRequestException("Feed type cannot be empty");
      }
      feedRecord.feedType = dto.feedType.trim();
    }

    if (dto.notes !== undefined) {
      feedRecord.notes = dto.notes ?? null;
    }

    // Update updatedBy
    const actor = { id: userId } as User;
    feedRecord.updatedBy = actor;

    await this.feedRecordRepo.save(feedRecord);

    const updatedRecord = await this.feedRecordRepo
      .createQueryBuilder("feedRecord")
      .leftJoinAndSelect("feedRecord.animal", "animal")
      .leftJoinAndSelect("feedRecord.createdBy", "createdBy")
      .leftJoinAndSelect("feedRecord.updatedBy", "updatedBy")
      .where("feedRecord.id = :id", { id: feedRecord.id })
      .select([
        "feedRecord",
        "animal.id",
        "animal.name",
        "createdBy.id",
        "createdBy.email",
        "updatedBy.id",
        "updatedBy.email",
      ])
      .getOne();

    return {
      message: "Feed record updated successfully",
      data: {
        feedRecord: updatedRecord,
      },
    };
  }

  async listFeedRecords(
    animalId: string,
    userId: string,
    userFarmId: string,
    query: ListFeedRecordsDto,
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

    const qb = this.feedRecordRepo
      .createQueryBuilder("feedRecord")
      .leftJoinAndSelect("feedRecord.animal", "animal")
      .leftJoinAndSelect("feedRecord.createdBy", "createdBy")
      .leftJoinAndSelect("feedRecord.updatedBy", "updatedBy")
      .where("animal.id = :animalId", { animalId })
      .andWhere("feedRecord.deletedAt IS NULL")
      .select([
        "feedRecord",
        "animal.id",
        "animal.name",
        "createdBy.id",
        "createdBy.email",
        "updatedBy.id",
        "updatedBy.email",
      ])
      .orderBy("feedRecord.createdAt", "DESC");

    // Apply date range filter
    if (query.dateFrom) {
      qb.andWhere("DATE(feedRecord.createdAt) >= :dateFrom", {
        dateFrom: query.dateFrom,
      });
    }

    if (query.dateTo) {
      qb.andWhere("DATE(feedRecord.createdAt) <= :dateTo", {
        dateTo: query.dateTo,
      });
    }

    const total = await qb.getCount();
    const feedRecords = await qb.skip(skip).take(limit).getMany();

    return {
      message: "Feed records fetched successfully",
      data: {
        feedRecords,
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
