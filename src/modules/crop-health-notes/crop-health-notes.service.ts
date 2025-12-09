import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { CropHealthNoteImage } from "../../database/entities/crop-health-note-image.entity";
import { CropHealthNote } from "../../database/entities/crop-health-note.entity";
import { Farm } from "../../database/entities/farm.entity";
import { Field } from "../../database/entities/field.entity";
import { User } from "../../database/entities/user.entity";
import { S3Service } from "../../services/s3.service";
import { CreateCropHealthNoteDto } from "./dto/create-crop-health-note.dto";
import { ListCropHealthNoteDto } from "./dto/list-crop-health-note.dto";
import { UpdateCropHealthNoteDto } from "./dto/update-crop-health-note.dto";

interface FileData {
  buffer: Buffer;
  filename: string;
}

@Injectable()
export class CropHealthNotesService {
  constructor(
    @InjectRepository(CropHealthNote)
    private readonly cropHealthNoteRepo: Repository<CropHealthNote>,
    @InjectRepository(CropHealthNoteImage)
    private readonly cropHealthNoteImageRepo: Repository<CropHealthNoteImage>,
    @InjectRepository(Field)
    private readonly fieldRepo: Repository<Field>,
    @InjectRepository(Farm)
    private readonly farmRepo: Repository<Farm>,
    private readonly s3Service: S3Service,
    private readonly dataSource: DataSource,
  ) {}

  async createCropHealthNote(
    userId: string,
    farmId: string,
    dto: CreateCropHealthNoteDto,
    files: FileData[],
    imageNotes?: string[],
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

    // Parse note date
    let noteDate: Date | null = null;
    if (dto.noteDate) {
      const parsedDate = new Date(dto.noteDate);
      if (Number.isNaN(parsedDate.getTime())) {
        throw new BadRequestException("Invalid note date");
      }
      noteDate = parsedDate;
    }

    // Normalize image notes array (index-based mapping) - only if files exist
    const normalizedNotes: (string | null)[] = [];
    if (files && files.length > 0) {
      if (imageNotes && imageNotes.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const note = imageNotes[i]?.trim() || null;
          normalizedNotes.push(note);
        }
      } else {
        // Fill with nulls if no notes provided
        normalizedNotes.push(...new Array(files.length).fill(null));
      }
    }

    // Upload images to S3 first (before transaction) - only if files provided
    const uploadedImageKeys: string[] = [];
    if (files && files.length > 0) {
      try {
        for (const file of files) {
          const imageKey = await this.s3Service.uploadFile(
            file.buffer,
            file.filename,
            "crop-health-notes",
          );
          uploadedImageKeys.push(imageKey);
        }
      } catch (error) {
        // Clean up uploaded images if any failed
        for (const key of uploadedImageKeys) {
          try {
            await this.s3Service.deleteFile(key);
          } catch (deleteError) {
            console.error(`Failed to delete S3 file ${key}:`, deleteError);
          }
        }
        throw new BadRequestException(
          `Failed to upload images: ${error.message || "Unknown error"}`,
        );
      }
    }

    // Start transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const actor = { id: userId } as User;

      // Create crop health note
      const cropHealthNote = queryRunner.manager.create(CropHealthNote, {
        field,
        noteDate,
        healthStatus: dto.healthStatus ?? null,
        description: dto.description ?? null,
        actionTaken: dto.actionTaken ?? null,
        notedBy: actor,
        createdBy: actor,
        updatedBy: actor,
      });

      const savedNote = await queryRunner.manager.save(cropHealthNote);

      // Create image records only if images were uploaded
      if (uploadedImageKeys.length > 0) {
        const imageRecords = uploadedImageKeys.map((imageKey, index) => {
          return queryRunner.manager.create(CropHealthNoteImage, {
            cropHealthNote: savedNote,
            imageKey,
            notes: normalizedNotes[index] ?? null,
          });
        });

        await queryRunner.manager.save(imageRecords);
      }

      // Commit transaction
      await queryRunner.commitTransaction();

      // Fetch created note with relations
      const createdNote = await this.cropHealthNoteRepo.findOne({
        where: { id: savedNote.id },
        relations: [
          "field",
          "field.farm",
          "notedBy",
          "createdBy",
          "updatedBy",
          "images",
        ],
      });

      // Attach presigned URLs to images
      if (createdNote && createdNote.images) {
        for (const image of createdNote.images) {
          const presignedUrl = await this.s3Service.getPresignedUrl(
            image.imageKey,
          );
          (image as any).imageUrl = presignedUrl;
        }
      }

      return {
        message: "Crop health note created successfully",
        data: {
          note: createdNote,
        },
      };
    } catch (error) {
      // Rollback transaction
      await queryRunner.rollbackTransaction();

      // Clean up uploaded S3 files
      for (const key of uploadedImageKeys) {
        try {
          await this.s3Service.deleteFile(key);
        } catch (deleteError) {
          console.error(`Failed to delete S3 file ${key}:`, deleteError);
        }
      }

      throw new BadRequestException(
        `Failed to create crop health note: ${error.message || "Unknown error"}`,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async listCropHealthNotes(farmId: string, query: ListCropHealthNoteDto) {
    const farmExists = await this.farmRepo.exist({
      where: { id: farmId, deletedAt: null, isActive: true },
    });
    if (!farmExists) {
      throw new NotFoundException("Farm not found");
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const qb = this.cropHealthNoteRepo
      .createQueryBuilder("note")
      .leftJoinAndSelect("note.field", "field")
      .leftJoinAndSelect("field.farm", "farm")
      .leftJoinAndSelect("note.notedBy", "notedBy")
      .leftJoinAndSelect("note.createdBy", "createdBy")
      .leftJoinAndSelect("note.updatedBy", "updatedBy")
      .leftJoinAndSelect("note.images", "images")
      .where("farm.id = :farmId", { farmId })
      .andWhere("note.deletedAt IS NULL")
      .orderBy("note.noteDate", "DESC")
      .addOrderBy("note.createdAt", "DESC");

    // Filter by field
    if (query.fieldId) {
      qb.andWhere("field.id = :fieldId", { fieldId: query.fieldId });
    }

    // Filter by note date range
    if (query.noteDateFrom) {
      qb.andWhere("note.noteDate >= :noteDateFrom", {
        noteDateFrom: query.noteDateFrom,
      });
    }

    if (query.noteDateTo) {
      qb.andWhere("note.noteDate <= :noteDateTo", {
        noteDateTo: query.noteDateTo,
      });
    }

    const total = await qb.getCount();
    const notes = await qb.skip(skip).take(limit).getMany();

    // Attach presigned URLs to images
    for (const note of notes) {
      if (note.images) {
        for (const image of note.images) {
          const presignedUrl = await this.s3Service.getPresignedUrl(
            image.imageKey,
          );
          (image as any).imageUrl = presignedUrl;
        }
      }
    }

    return {
      message: "Crop health notes fetched successfully",
      data: {
        notes,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async getCropHealthNoteDetails(
    noteId: string,
    userId: string,
    userFarmId: string,
  ) {
    const note = await this.cropHealthNoteRepo
      .createQueryBuilder("note")
      .leftJoinAndSelect("note.field", "field")
      .leftJoinAndSelect("field.farm", "farm")
      .leftJoinAndSelect("note.notedBy", "notedBy")
      .leftJoinAndSelect("note.createdBy", "createdBy")
      .leftJoinAndSelect("note.updatedBy", "updatedBy")
      .leftJoinAndSelect("note.images", "images")
      .where("note.id = :noteId", { noteId })
      .andWhere("note.deletedAt IS NULL")
      .andWhere("farm.id = :userFarmId", { userFarmId })
      .getOne();

    if (!note) {
      throw new NotFoundException(
        "Crop health note not found or does not belong to your current farm",
      );
    }

    // Attach presigned URLs to images
    if (note.images) {
      for (const image of note.images) {
        const presignedUrl = await this.s3Service.getPresignedUrl(
          image.imageKey,
        );
        (image as any).imageUrl = presignedUrl;
      }
    }

    return {
      message: "Crop health note details fetched successfully",
      data: {
        note,
      },
    };
  }

  async updateCropHealthNote(
    noteId: string,
    userId: string,
    userFarmId: string,
    dto: UpdateCropHealthNoteDto,
    files?: FileData[],
    imageNotes?: string[],
  ) {
    const note = await this.cropHealthNoteRepo
      .createQueryBuilder("note")
      .leftJoinAndSelect("note.field", "field")
      .leftJoinAndSelect("field.farm", "farm")
      .leftJoinAndSelect("note.images", "images")
      .where("note.id = :noteId", { noteId })
      .andWhere("note.deletedAt IS NULL")
      .andWhere("farm.id = :userFarmId", { userFarmId })
      .getOne();

    if (!note) {
      throw new NotFoundException(
        "Crop health note not found or does not belong to your current farm",
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

      note.field = field;
    }

    // Update note date if provided
    if (dto.noteDate !== undefined) {
      if (dto.noteDate) {
        const parsedDate = new Date(dto.noteDate);
        if (Number.isNaN(parsedDate.getTime())) {
          throw new BadRequestException("Invalid note date");
        }
        note.noteDate = parsedDate;
      } else {
        note.noteDate = null;
      }
    }

    // Update other fields
    if (dto.healthStatus !== undefined) {
      note.healthStatus = dto.healthStatus ?? null;
    }

    if (dto.description !== undefined) {
      note.description = dto.description ?? null;
    }

    if (dto.actionTaken !== undefined) {
      note.actionTaken = dto.actionTaken ?? null;
    }

    // Handle image replacement if files are provided
    const oldImageKeys: string[] = [];
    if (files && files.length > 0) {
      // Store old image keys for cleanup
      if (note.images) {
        oldImageKeys.push(...note.images.map((img) => img.imageKey));
      }

      // Normalize image notes array
      const normalizedNotes: (string | null)[] = [];
      if (imageNotes && imageNotes.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const noteText = imageNotes[i]?.trim() || null;
          normalizedNotes.push(noteText);
        }
      } else {
        normalizedNotes.push(...new Array(files.length).fill(null));
      }

      // Upload new images to S3
      const uploadedImageKeys: string[] = [];
      try {
        for (const file of files) {
          const imageKey = await this.s3Service.uploadFile(
            file.buffer,
            file.filename,
            "crop-health-notes",
          );
          uploadedImageKeys.push(imageKey);
        }
      } catch (error) {
        // Clean up uploaded images if any failed
        for (const key of uploadedImageKeys) {
          try {
            await this.s3Service.deleteFile(key);
          } catch (deleteError) {
            console.error(`Failed to delete S3 file ${key}:`, deleteError);
          }
        }
        throw new BadRequestException(
          `Failed to upload images: ${error.message || "Unknown error"}`,
        );
      }

      // Start transaction
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // Soft delete old images
        if (note.images && note.images.length > 0) {
          for (const image of note.images) {
            image.deletedAt = new Date();
            await queryRunner.manager.save(image);
          }
        }

        // Create new image records
        const imageRecords = uploadedImageKeys.map((imageKey, index) => {
          return queryRunner.manager.create(CropHealthNoteImage, {
            cropHealthNote: note,
            imageKey,
            notes: normalizedNotes[index] ?? null,
          });
        });

        await queryRunner.manager.save(imageRecords);

        // Update note
        const actor = { id: userId } as User;
        note.updatedBy = actor;
        await queryRunner.manager.save(note);

        // Commit transaction
        await queryRunner.commitTransaction();

        // Delete old images from S3 after successful DB update
        for (const key of oldImageKeys) {
          try {
            await this.s3Service.deleteFile(key);
          } catch (deleteError) {
            console.error(`Failed to delete old S3 file ${key}:`, deleteError);
          }
        }
      } catch (error) {
        // Rollback transaction
        await queryRunner.rollbackTransaction();

        // Clean up newly uploaded S3 files
        for (const key of uploadedImageKeys) {
          try {
            await this.s3Service.deleteFile(key);
          } catch (deleteError) {
            console.error(`Failed to delete S3 file ${key}:`, deleteError);
          }
        }

        throw new BadRequestException(
          `Failed to update crop health note: ${error.message || "Unknown error"}`,
        );
      } finally {
        await queryRunner.release();
      }
    } else {
      // No new images, just update the note
      const actor = { id: userId } as User;
      note.updatedBy = actor;
      await this.cropHealthNoteRepo.save(note);
    }

    // Fetch updated note with relations
    const updatedNote = await this.cropHealthNoteRepo.findOne({
      where: { id: note.id },
      relations: [
        "field",
        "field.farm",
        "notedBy",
        "createdBy",
        "updatedBy",
        "images",
      ],
    });

    // Attach presigned URLs to images
    if (updatedNote && updatedNote.images) {
      for (const image of updatedNote.images) {
        const presignedUrl = await this.s3Service.getPresignedUrl(
          image.imageKey,
        );
        (image as any).imageUrl = presignedUrl;
      }
    }

    return {
      message: "Crop health note updated successfully",
      data: {
        note: updatedNote,
      },
    };
  }

  async deleteCropHealthNote(
    noteId: string,
    userId: string,
    userFarmId: string,
  ) {
    const note = await this.cropHealthNoteRepo
      .createQueryBuilder("note")
      .leftJoinAndSelect("note.field", "field")
      .leftJoinAndSelect("field.farm", "farm")
      .leftJoinAndSelect("note.images", "images")
      .where("note.id = :noteId", { noteId })
      .andWhere("note.deletedAt IS NULL")
      .andWhere("farm.id = :userFarmId", { userFarmId })
      .getOne();

    if (!note) {
      throw new NotFoundException(
        "Crop health note not found or does not belong to your current farm",
      );
    }

    // Store image keys for S3 cleanup
    const imageKeys: string[] = [];
    if (note.images) {
      imageKeys.push(...note.images.map((img) => img.imageKey));
    }

    // Start transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Soft delete images
      if (note.images && note.images.length > 0) {
        for (const image of note.images) {
          image.deletedAt = new Date();
          await queryRunner.manager.save(image);
        }
      }

      // Soft delete note
      const actor = { id: userId } as User;
      note.deletedAt = new Date();
      note.updatedBy = actor;
      await queryRunner.manager.save(note);

      // Commit transaction
      await queryRunner.commitTransaction();

      // Delete images from S3 after successful DB update
      for (const key of imageKeys) {
        try {
          await this.s3Service.deleteFile(key);
        } catch (deleteError) {
          console.error(`Failed to delete S3 file ${key}:`, deleteError);
        }
      }

      return {
        message: "Crop health note deleted successfully",
      };
    } catch (error) {
      // Rollback transaction
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(
        `Failed to delete crop health note: ${error.message || "Unknown error"}`,
      );
    } finally {
      await queryRunner.release();
    }
  }
}
