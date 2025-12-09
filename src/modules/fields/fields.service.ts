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
import { CreateFieldDto } from "./dto/create-field.dto";
import { ListFieldsDto } from "./dto/list-fields.dto";
import { UpdateFieldDto } from "./dto/update-field.dto";

@Injectable()
export class FieldsService {
  constructor(
    @InjectRepository(Field)
    private readonly fieldRepo: Repository<Field>,
    @InjectRepository(Farm)
    private readonly farmRepo: Repository<Farm>,
  ) {}

  private toNumber(value: any) {
    return value === null || value === undefined ? null : Number(value);
  }

  private mapField(field: Field) {
    return {
      id: field.id,
      farmId: field.farm?.id ?? null,
      fieldName: field.fieldName,
      fieldSize: this.toNumber(field.fieldSize),
      sizeUnit: field.sizeUnit,
      soilType: field.soilType,
      isActive: field.isActive,
      notes: field.notes,
      createdAt: field.createdAt,
      updatedAt: field.updatedAt,
    };
  }

  async createField(userId: string, farmId: string, dto: CreateFieldDto) {
    const farm = await this.farmRepo.findOne({ where: { id: farmId } });
    if (!farm) {
      throw new NotFoundException("Farm not found");
    }

    if (!dto.fieldName?.trim()) {
      throw new BadRequestException("Field name is required");
    }

    const field = this.fieldRepo.create({
      farm,
      fieldName: dto.fieldName.trim(),
      fieldSize:
        dto.fieldSize === undefined || dto.fieldSize === null
          ? null
          : dto.fieldSize.toString(),
      sizeUnit: dto.sizeUnit ?? null,
      soilType: dto.soilType ?? null,
      isActive: dto.isActive ?? true,
      notes: dto.notes?.trim() ?? null,
      createdBy: { id: userId } as any,
    });

    await this.fieldRepo.save(field);

    const createdField = await this.fieldRepo.findOne({
      where: { id: field.id },
      relations: ["farm"],
    });

    return {
      message: "Field created successfully",
      data: {
        field: createdField ? this.mapField(createdField) : null,
      },
    };
  }

  async listFields(farmId: string, query: ListFieldsDto) {
    const farmExists = await this.farmRepo.exist({ where: { id: farmId } });
    if (!farmExists) {
      throw new NotFoundException("Farm not found");
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const qb = this.fieldRepo
      .createQueryBuilder("field")
      .leftJoinAndSelect("field.farm", "farm")
      .where("farm.id = :farmId", { farmId })
      .andWhere("field.deletedAt IS NULL")
      .orderBy("field.createdAt", "DESC");

    if (query.search) {
      qb.andWhere(
        `(LOWER(field.fieldName) LIKE LOWER(:search)
          OR LOWER(field.soilType) LIKE LOWER(:search))`,
        { search: `%${query.search}%` },
      );
    }

    if (query.soilType) {
      qb.andWhere("LOWER(field.soilType) = LOWER(:soilType)", {
        soilType: query.soilType,
      });
    }

    if (typeof query.isActive === "boolean") {
      qb.andWhere("field.isActive = :isActive", { isActive: query.isActive });
    }

    const total = await qb.getCount();
    const fields = await qb.skip(skip).take(limit).getMany();

    return {
      message: "Fields fetched successfully",
      data: {
        fields: fields.map((f) => this.mapField(f)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async listActiveFields(farmId: string, limit = 1000) {
    const farmExists = await this.farmRepo.exist({ where: { id: farmId } });
    if (!farmExists) {
      throw new NotFoundException("Farm not found");
    }

    const fields = await this.fieldRepo.find({
      where: { farm: { id: farmId }, isActive: true, deletedAt: null },
      order: { fieldName: "ASC" },
      take: limit,
    });

    return {
      message: "Active fields fetched successfully",
      data: {
        fields: fields.map((f) => this.mapField(f)),
      },
    };
  }

  async getFieldDetails(fieldId: string, farmId: string) {
    const field = await this.fieldRepo.findOne({
      where: { id: fieldId },
      relations: ["farm"],
    });

    if (!field || field.deletedAt) {
      throw new NotFoundException("Field not found");
    }

    if (field.farm.id !== farmId) {
      throw new ForbiddenException(
        "Field does not belong to your current farm",
      );
    }

    return {
      message: "Field details fetched successfully",
      data: {
        field: this.mapField(field),
      },
    };
  }

  async updateField(
    fieldId: string,
    farmId: string,
    userId: string,
    dto: UpdateFieldDto,
  ) {
    const field = await this.fieldRepo.findOne({
      where: { id: fieldId },
      relations: ["farm"],
    });

    if (!field || field.deletedAt) {
      throw new NotFoundException("Field not found");
    }

    if (field.farm.id !== farmId) {
      throw new ForbiddenException(
        "Field does not belong to your current farm",
      );
    }

    if (dto.fieldName !== undefined) {
      if (!dto.fieldName?.trim()) {
        throw new BadRequestException("Field name cannot be empty");
      }
      field.fieldName = dto.fieldName.trim();
    }

    if (dto.fieldSize !== undefined) {
      field.fieldSize =
        dto.fieldSize === null ? null : dto.fieldSize.toString();
    }

    if (dto.sizeUnit !== undefined) {
      field.sizeUnit = dto.sizeUnit ?? null;
    }

    if (dto.soilType !== undefined) {
      field.soilType = dto.soilType ?? null;
    }

    if (dto.notes !== undefined) {
      field.notes = dto.notes?.trim() ?? null;
    }

    if (typeof dto.isActive === "boolean") {
      field.isActive = dto.isActive;
    }

    // Track updater if column exists
    if ((field as any).updatedBy !== undefined) {
      (field as any).updatedBy = { id: userId } as any;
    }

    await this.fieldRepo.save(field);

    const updatedField = await this.fieldRepo.findOne({
      where: { id: field.id },
      relations: ["farm"],
    });

    return {
      message: "Field updated successfully",
      data: {
        field: updatedField ? this.mapField(updatedField) : null,
      },
    };
  }

  async deleteField(fieldId: string, farmId: string, userId: string) {
    const field = await this.fieldRepo.findOne({
      where: { id: fieldId },
      relations: ["farm"],
    });

    if (!field || field.deletedAt) {
      throw new NotFoundException("Field not found");
    }

    if (field.farm.id !== farmId) {
      throw new ForbiddenException(
        "Field does not belong to your current farm",
      );
    }

    field.deletedAt = new Date();
    field.isActive = false;

    if ((field as any).updatedBy !== undefined) {
      (field as any).updatedBy = { id: userId } as any;
    }

    await this.fieldRepo.save(field);

    return { message: "Field deleted successfully" };
  }
}
