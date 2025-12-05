import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { AnimalHealthRecord } from "../../database/entities/animal-health-record.entity";
import { Animal } from "../../database/entities/animal.entity";
import { HealthRecordImage } from "../../database/entities/health-record-image.entity";
import { User } from "../../database/entities/user.entity";
import { S3Service } from "../../services/s3.service";
import { CreateHealthRecordDto } from "./dto/create-health-record.dto";
import { ListHealthRecordsDto } from "./dto/list-health-records.dto";
import { UpdateHealthRecordDto } from "./dto/update-health-record.dto";

@Injectable()
export class HealthRecordsService {
  constructor(
    @InjectRepository(AnimalHealthRecord)
    private readonly healthRecordRepo: Repository<AnimalHealthRecord>,
    @InjectRepository(HealthRecordImage)
    private readonly healthRecordImageRepo: Repository<HealthRecordImage>,
    @InjectRepository(Animal)
    private readonly animalRepo: Repository<Animal>,
    private readonly s3Service: S3Service,
  ) {}

  async createHealthRecord(
    animalId: string,
    userId: string,
    userFarmId: string,
    dto: CreateHealthRecordDto,
    images?: Array<{ buffer: Buffer; filename: string }>,
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

    // Upload images if provided
    if (images && images.length > 0) {
      const imagePromises = images.map(async (image) => {
        const imageKey = await this.s3Service.uploadFile(
          image.buffer,
          image.filename,
          "health-record-images",
        );

        const healthRecordImage = this.healthRecordImageRepo.create({
          healthRecord,
          imageKey,
        });

        return this.healthRecordImageRepo.save(healthRecordImage);
      });

      await Promise.all(imagePromises);
    }

    const createdRecord = await this.healthRecordRepo
      .createQueryBuilder("healthRecord")
      .leftJoinAndSelect("healthRecord.animal", "animal")
      .leftJoinAndSelect("healthRecord.createdBy", "createdBy")
      .leftJoinAndSelect("healthRecord.updatedBy", "updatedBy")
      .leftJoinAndSelect("healthRecord.images", "images")
      .where("healthRecord.id = :id", { id: healthRecord.id })
      .andWhere("images.deletedAt IS NULL")
      .select([
        "healthRecord",
        "animal.id",
        "animal.name",
        "createdBy.id",
        "createdBy.email",
        "updatedBy.id",
        "updatedBy.email",
        "images.id",
        "images.imageKey",
      ])
      .getOne();

    // Attach presigned URLs to images
    const recordImages = createdRecord?.images || [];
    if (recordImages.length > 0) {
      const imagesWithUrls = await Promise.all(
        recordImages.map(async (img) => {
          if (!img.imageKey) {
            console.error(`Image ${img.id} has no imageKey`);
            return {
              id: img.id,
              imageKey: null,
              imageUrl: null,
            };
          }

          const imageUrl = await this.s3Service.getPresignedUrl(img.imageKey);
          if (!imageUrl) {
            console.error(
              `Failed to generate presigned URL for imageKey: ${img.imageKey}`,
            );
          }

          return {
            id: img.id,
            imageKey: img.imageKey,
            imageUrl,
          };
        }),
      );
      (createdRecord as any).images = imagesWithUrls;
    } else {
      (createdRecord as any).images = [];
    }

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
    newImages?: Array<{ buffer: Buffer; filename: string }>,
    deletedImageKeys?: string[],
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

    // Handle image deletion if specific image keys are provided
    if (deletedImageKeys && deletedImageKeys.length > 0) {
      // Get existing images that match the keys to delete
      const imagesToDelete = await this.healthRecordImageRepo.find({
        where: {
          healthRecord: { id: healthRecord.id },
          imageKey: In(deletedImageKeys),
        },
      });

      if (imagesToDelete.length > 0) {
        // Delete from S3 and database (hard delete - permanent removal)
        const deletePromises = imagesToDelete.map(async (img) => {
          try {
            // Delete from S3 first
            await this.s3Service.deleteFile(img.imageKey);
          } catch (error) {
            // Log error but continue with database deletion
            console.error(`Failed to delete S3 file ${img.imageKey}:`, error);
          }
          // Hard delete from database (permanent removal)
          return this.healthRecordImageRepo.delete(img.id);
        });

        await Promise.all(deletePromises);
      }
    }

    // Handle new image uploads if provided
    if (newImages && newImages.length > 0) {
      // Check total images count (existing + new) doesn't exceed 10
      const existingImagesCount = await this.healthRecordImageRepo.count({
        where: {
          healthRecord: { id: healthRecord.id },
        },
      });

      const totalImagesAfterAdd = existingImagesCount + newImages.length;
      if (totalImagesAfterAdd > 10) {
        throw new BadRequestException(
          `Cannot add ${newImages.length} image(s). Maximum 10 images allowed per health record. Currently have ${existingImagesCount} image(s).`,
        );
      }

      // Upload new images
      const uploadPromises = newImages.map(async (image) => {
        const imageKey = await this.s3Service.uploadFile(
          image.buffer,
          image.filename,
          "health-record-images",
        );

        const healthRecordImage = this.healthRecordImageRepo.create({
          healthRecord,
          imageKey,
        });

        return this.healthRecordImageRepo.save(healthRecordImage);
      });

      await Promise.all(uploadPromises);
    }

    // Reload the health record with images after update
    // Use a fresh query to ensure we get the latest images
    const updatedRecord = await this.healthRecordRepo
      .createQueryBuilder("healthRecord")
      .leftJoinAndSelect("healthRecord.animal", "animal")
      .leftJoinAndSelect("healthRecord.createdBy", "createdBy")
      .leftJoinAndSelect("healthRecord.updatedBy", "updatedBy")
      .leftJoinAndSelect("healthRecord.images", "images")
      .where("healthRecord.id = :id", { id: healthRecord.id })
      .select([
        "healthRecord",
        "animal.id",
        "animal.name",
        "createdBy.id",
        "createdBy.email",
        "updatedBy.id",
        "updatedBy.email",
        "images.id",
        "images.imageKey",
      ])
      .getOne();

    // Attach presigned URLs to images
    const recordImages = updatedRecord?.images || [];
    if (recordImages.length > 0) {
      const imagesWithUrls = await Promise.all(
        recordImages.map(async (img) => {
          if (!img.imageKey) {
            console.error(`Image ${img.id} has no imageKey`);
            return {
              id: img.id,
              imageKey: null,
              imageUrl: null,
            };
          }

          const imageUrl = await this.s3Service.getPresignedUrl(img.imageKey);
          if (!imageUrl) {
            console.error(
              `Failed to generate presigned URL for imageKey: ${img.imageKey}`,
            );
          }

          return {
            id: img.id,
            imageKey: img.imageKey,
            imageUrl,
          };
        }),
      );
      (updatedRecord as any).images = imagesWithUrls;
    } else {
      (updatedRecord as any).images = [];
    }

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
      .leftJoinAndSelect(
        "healthRecord.images",
        "images",
        "images.deletedAt IS NULL",
      )
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
        "images.id",
        "images.imageKey",
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

    // Attach presigned URLs to images for each health record
    const healthRecordsWithImages = await Promise.all(
      healthRecords.map(async (record) => {
        const recordImages = record.images || [];
        // No need to filter by deletedAt since we're doing hard delete

        if (recordImages.length > 0) {
          const imagesWithUrls = await Promise.all(
            recordImages.map(async (img) => {
              if (!img.imageKey) {
                console.error(`Image ${img.id} has no imageKey`);
                return {
                  id: img.id,
                  imageKey: null,
                  imageUrl: null,
                };
              }

              const imageUrl = await this.s3Service.getPresignedUrl(
                img.imageKey,
              );
              if (!imageUrl) {
                console.error(
                  `Failed to generate presigned URL for imageKey: ${img.imageKey}`,
                );
              }

              return {
                id: img.id,
                imageKey: img.imageKey,
                imageUrl,
              };
            }),
          );
          (record as any).images = imagesWithUrls;
        } else {
          (record as any).images = [];
        }
        return record;
      }),
    );

    return {
      message: "Health records fetched successfully",
      data: {
        healthRecords: healthRecordsWithImages,
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
