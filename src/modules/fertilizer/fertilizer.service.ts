import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Farm } from "../../database/entities/farm.entity";
import { FertilizerRecord } from "../../database/entities/fertilizer-record.entity";
import { Field } from "../../database/entities/field.entity";
import { User } from "../../database/entities/user.entity";
import { CreateFertilizerDto } from "./dto/create-fertilizer.dto";
import { ListFertilizerDto } from "./dto/list-fertilizer.dto";
import { UpdateFertilizerDto } from "./dto/update-fertilizer.dto";

@Injectable()
export class FertilizerService {
  constructor(
    @InjectRepository(FertilizerRecord)
    private readonly fertilizerRepo: Repository<FertilizerRecord>,
    @InjectRepository(Field)
    private readonly fieldRepo: Repository<Field>,
    @InjectRepository(Farm)
    private readonly farmRepo: Repository<Farm>,
  ) {}

  async createFertilizer(
    userId: string,
    farmId: string,
    dto: CreateFertilizerDto,
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

    // Parse application date
    let applicationDate: Date | null = null;
    if (dto.applicationDate) {
      const parsedDate = new Date(dto.applicationDate);
      if (Number.isNaN(parsedDate.getTime())) {
        throw new BadRequestException("Invalid application date");
      }
      applicationDate = parsedDate;
    }

    const actor = { id: userId } as User;

    const fertilizer = this.fertilizerRepo.create({
      field,
      fertilizerType: dto.fertilizerType,
      quantity: dto.quantity,
      quantityUnit: dto.quantityUnit,
      applicationDate,
      applicationMethod: dto.applicationMethod ?? null,
      cost: dto.cost,
      notes: dto.notes ?? null,
      createdBy: actor,
      updatedBy: actor,
    });

    await this.fertilizerRepo.save(fertilizer);

    const createdFertilizer = await this.fertilizerRepo.findOne({
      where: { id: fertilizer.id },
      relations: ["field", "field.farm", "createdBy", "updatedBy"],
    });

    return {
      message: "Fertilizer record created successfully",
      data: {
        fertilizer: createdFertilizer,
      },
    };
  }

  async listFertilizer(farmId: string, query: ListFertilizerDto) {
    const farmExists = await this.farmRepo.exist({
      where: { id: farmId, deletedAt: null, isActive: true },
    });
    if (!farmExists) {
      throw new NotFoundException("Farm not found");
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const qb = this.fertilizerRepo
      .createQueryBuilder("fertilizer")
      .leftJoinAndSelect("fertilizer.field", "field")
      .leftJoinAndSelect("field.farm", "farm")
      .leftJoinAndSelect("fertilizer.createdBy", "createdBy")
      .leftJoinAndSelect("fertilizer.updatedBy", "updatedBy")
      .where("farm.id = :farmId", { farmId })
      .andWhere("fertilizer.deletedAt IS NULL")
      .orderBy("fertilizer.applicationDate", "DESC");

    // Filter by field
    if (query.fieldId) {
      qb.andWhere("field.id = :fieldId", { fieldId: query.fieldId });
    }

    // Filter by application date range
    if (query.applicationDateFrom) {
      qb.andWhere("fertilizer.applicationDate >= :applicationDateFrom", {
        applicationDateFrom: query.applicationDateFrom,
      });
    }

    if (query.applicationDateTo) {
      qb.andWhere("fertilizer.applicationDate <= :applicationDateTo", {
        applicationDateTo: query.applicationDateTo,
      });
    }

    const total = await qb.getCount();
    const fertilizers = await qb.skip(skip).take(limit).getMany();

    return {
      message: "Fertilizer records fetched successfully",
      data: {
        fertilizers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async getFertilizerDetails(
    fertilizerId: string,
    userId: string,
    userFarmId: string,
  ) {
    const fertilizer = await this.fertilizerRepo
      .createQueryBuilder("fertilizer")
      .leftJoinAndSelect("fertilizer.field", "field")
      .leftJoinAndSelect("field.farm", "farm")
      .leftJoinAndSelect("fertilizer.createdBy", "createdBy")
      .leftJoinAndSelect("fertilizer.updatedBy", "updatedBy")
      .where("fertilizer.id = :fertilizerId", { fertilizerId })
      .andWhere("fertilizer.deletedAt IS NULL")
      .andWhere("farm.id = :userFarmId", { userFarmId })
      .getOne();

    if (!fertilizer) {
      throw new NotFoundException(
        "Fertilizer record not found or does not belong to your current farm",
      );
    }

    return {
      message: "Fertilizer record details fetched successfully",
      data: {
        fertilizer,
      },
    };
  }

  async updateFertilizer(
    fertilizerId: string,
    userId: string,
    userFarmId: string,
    dto: UpdateFertilizerDto,
  ) {
    const fertilizer = await this.fertilizerRepo
      .createQueryBuilder("fertilizer")
      .leftJoinAndSelect("fertilizer.field", "field")
      .leftJoinAndSelect("field.farm", "farm")
      .where("fertilizer.id = :fertilizerId", { fertilizerId })
      .andWhere("fertilizer.deletedAt IS NULL")
      .andWhere("farm.id = :userFarmId", { userFarmId })
      .getOne();

    if (!fertilizer) {
      throw new NotFoundException(
        "Fertilizer record not found or does not belong to your current farm",
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

      fertilizer.field = field;
    }

    // Update fertilizer type if provided
    if (dto.fertilizerType !== undefined) {
      fertilizer.fertilizerType = dto.fertilizerType ?? null;
    }

    // Update quantity if provided
    if (dto.quantity !== undefined) {
      fertilizer.quantity = dto.quantity ?? null;
    }

    // Update quantity unit if provided
    if (dto.quantityUnit !== undefined) {
      fertilizer.quantityUnit = dto.quantityUnit ?? null;
    }

    // Update application date if provided
    if (dto.applicationDate !== undefined) {
      if (dto.applicationDate) {
        const parsedDate = new Date(dto.applicationDate);
        if (Number.isNaN(parsedDate.getTime())) {
          throw new BadRequestException("Invalid application date");
        }
        fertilizer.applicationDate = parsedDate;
      } else {
        fertilizer.applicationDate = null;
      }
    }

    // Update application method if provided
    if (dto.applicationMethod !== undefined) {
      fertilizer.applicationMethod = dto.applicationMethod ?? null;
    }

    // Update cost if provided
    if (dto.cost !== undefined) {
      fertilizer.cost = dto.cost ?? null;
    }

    // Update notes if provided
    if (dto.notes !== undefined) {
      fertilizer.notes = dto.notes ?? null;
    }

    // Update updatedBy
    const actor = { id: userId } as User;
    fertilizer.updatedBy = actor;

    await this.fertilizerRepo.save(fertilizer);

    // Fetch updated fertilizer with relations
    const updatedFertilizer = await this.fertilizerRepo.findOne({
      where: { id: fertilizer.id },
      relations: ["field", "field.farm", "createdBy", "updatedBy"],
    });

    return {
      message: "Fertilizer record updated successfully",
      data: {
        fertilizer: updatedFertilizer,
      },
    };
  }

  async deleteFertilizer(
    fertilizerId: string,
    userId: string,
    userFarmId: string,
  ) {
    const fertilizer = await this.fertilizerRepo
      .createQueryBuilder("fertilizer")
      .leftJoinAndSelect("fertilizer.field", "field")
      .leftJoinAndSelect("field.farm", "farm")
      .where("fertilizer.id = :fertilizerId", { fertilizerId })
      .andWhere("fertilizer.deletedAt IS NULL")
      .andWhere("farm.id = :userFarmId", { userFarmId })
      .getOne();

    if (!fertilizer) {
      throw new NotFoundException(
        "Fertilizer record not found or does not belong to your current farm",
      );
    }

    // Soft delete - set deletedAt and updatedBy
    const actor = { id: userId } as User;
    fertilizer.deletedAt = new Date();
    fertilizer.updatedBy = actor;

    await this.fertilizerRepo.save(fertilizer);

    return {
      message: "Fertilizer record deleted successfully",
    };
  }

  async getFertilizerCostSummary(farmId: string) {
    const farmExists = await this.farmRepo.exist({
      where: { id: farmId, deletedAt: null, isActive: true },
    });
    if (!farmExists) {
      throw new NotFoundException("Farm not found");
    }

    // Single optimized query: Get all fields with their fertilizer cost totals
    // LEFT JOIN ensures fields with no fertilizer records are included (with 0 cost)
    const results = await this.fieldRepo
      .createQueryBuilder("field")
      .innerJoin("field.farm", "farm")
      .leftJoin(
        "field.fertilizerRecords",
        "fertilizer",
        "fertilizer.deletedAt IS NULL",
      )
      .where("farm.id = :farmId", { farmId })
      .andWhere("farm.deletedAt IS NULL")
      .andWhere("farm.isActive = true")
      .andWhere("field.deletedAt IS NULL")
      .select("field.id", "fieldId")
      .addSelect("field.fieldName", "fieldName")
      .addSelect(
        "COALESCE(SUM(CAST(fertilizer.cost AS DECIMAL)), 0)",
        "totalCost",
      )
      .groupBy("field.id")
      .addGroupBy("field.fieldName")
      .orderBy("field.fieldName", "ASC")
      .getRawMany();

    const summary = results.map((item) => ({
      fieldId: item.fieldId,
      fieldName: item.fieldName,
      totalCost: Number(item.totalCost) || 0,
    }));

    const totalCost = summary.reduce((sum, field) => sum + field.totalCost, 0);

    return {
      message: "Fertilizer cost summary fetched successfully",
      data: {
        summary,
        totalFields: summary.length,
        totalCost,
      },
    };
  }
}
