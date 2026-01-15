import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Farm } from "../../database/entities/farm.entity";
import { Revenue } from "../../database/entities/revenue.entity";
import { User } from "../../database/entities/user.entity";
import { CreateRevenueDto } from "./dto/create-revenue.dto";
import { ListRevenuesDto } from "./dto/list-revenues.dto";
import { UpdateRevenueDto } from "./dto/update-revenue.dto";

@Injectable()
export class RevenuesService {
  constructor(
    @InjectRepository(Revenue)
    private readonly revenueRepo: Repository<Revenue>,
    @InjectRepository(Farm)
    private readonly farmRepo: Repository<Farm>,
  ) {}

  async createRevenue(userId: string, farmId: string, dto: CreateRevenueDto) {
    // Check farm exists
    const farm = await this.farmRepo.findOne({
      where: { id: farmId, deletedAt: null, isActive: true },
    });

    if (!farm) {
      throw new NotFoundException("Farm not found");
    }

    // Parse revenue date
    const revenueDate = new Date(dto.revenueDate);
    if (Number.isNaN(revenueDate.getTime())) {
      throw new BadRequestException("Invalid revenue date");
    }

    const actor = { id: userId } as User;

    const revenue = this.revenueRepo.create({
      farm,
      revenueDate,
      amount: dto.amount,
      currencyType: dto.currencyType,
      buyerName: dto.buyerName ?? null,
      productSold: dto.productSold ?? null,
      quantity: dto.quantity ?? null,
      quantityUnit: dto.quantityUnit ?? null,
      paymentMethod: dto.paymentMethod ?? null,
      notes: dto.notes ?? null,
      createdBy: actor,
      updatedBy: actor,
    });

    await this.revenueRepo.save(revenue);

    const createdRevenue = await this.revenueRepo
      .createQueryBuilder("revenue")
      .leftJoinAndSelect("revenue.farm", "farm")
      .leftJoin("revenue.createdBy", "createdBy")
      .leftJoin("revenue.updatedBy", "updatedBy")
      .addSelect(["createdBy.id", "createdBy.name"])
      .addSelect(["updatedBy.id", "updatedBy.name"])
      .where("revenue.id = :id", { id: revenue.id })
      .getOne();

    return {
      message: "Revenue created successfully",
      data: {
        revenue: createdRevenue,
      },
    };
  }

  async listRevenues(farmId: string, query: ListRevenuesDto) {
    const farmExists = await this.farmRepo.exist({
      where: { id: farmId, deletedAt: null, isActive: true },
    });
    if (!farmExists) {
      throw new NotFoundException("Farm not found");
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const qb = this.revenueRepo
      .createQueryBuilder("revenue")
      .leftJoinAndSelect("revenue.farm", "farm")
      .leftJoin("revenue.createdBy", "createdBy")
      .leftJoin("revenue.updatedBy", "updatedBy")
      .addSelect(["createdBy.id", "createdBy.name"])
      .addSelect(["updatedBy.id", "updatedBy.name"])
      .where("farm.id = :farmId", { farmId })
      .andWhere("revenue.deletedAt IS NULL")
      .orderBy("revenue.revenueDate", "DESC");

    // Filter by revenue date range
    if (query.revenueDateFrom) {
      qb.andWhere("revenue.revenueDate >= :revenueDateFrom", {
        revenueDateFrom: query.revenueDateFrom,
      });
    }

    if (query.revenueDateTo) {
      qb.andWhere("revenue.revenueDate <= :revenueDateTo", {
        revenueDateTo: query.revenueDateTo,
      });
    }

    // Search by buyer name or product sold
    if (query.search) {
      qb.andWhere(
        "(revenue.buyerName ILIKE :search OR revenue.productSold ILIKE :search)",
        {
          search: `%${query.search}%`,
        },
      );
    }

    const total = await qb.getCount();
    const revenues = await qb.skip(skip).take(limit).getMany();

    return {
      message: "Revenues fetched successfully",
      data: {
        revenues,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async getRevenueDetails(revenueId: string, userId: string, farmId: string) {
    const revenue = await this.revenueRepo
      .createQueryBuilder("revenue")
      .leftJoinAndSelect("revenue.farm", "farm")
      .leftJoin("revenue.createdBy", "createdBy")
      .leftJoin("revenue.updatedBy", "updatedBy")
      .addSelect(["createdBy.id", "createdBy.name"])
      .addSelect(["updatedBy.id", "updatedBy.name"])
      .where("revenue.id = :revenueId", { revenueId })
      .andWhere("revenue.deletedAt IS NULL")
      .andWhere("farm.id = :farmId", { farmId })
      .getOne();

    if (!revenue) {
      throw new NotFoundException("Revenue not found");
    }

    return {
      message: "Revenue details fetched successfully",
      data: {
        revenue,
      },
    };
  }

  async updateRevenue(
    revenueId: string,
    userId: string,
    farmId: string,
    dto: UpdateRevenueDto,
  ) {
    const revenue = await this.revenueRepo.findOne({
      where: {
        id: revenueId,
        deletedAt: null,
        farm: { id: farmId },
      },
    });

    if (!revenue) {
      throw new NotFoundException("Revenue not found");
    }

    // Update fields
    if (dto.revenueDate !== undefined) {
      const revenueDate = new Date(dto.revenueDate);
      if (Number.isNaN(revenueDate.getTime())) {
        throw new BadRequestException("Invalid revenue date");
      }
      revenue.revenueDate = revenueDate;
    }

    if (dto.amount !== undefined) {
      revenue.amount = dto.amount;
    }

    if (dto.currencyType !== undefined) {
      revenue.currencyType = dto.currencyType;
    }

    if (dto.buyerName !== undefined) {
      revenue.buyerName = dto.buyerName ?? null;
    }

    if (dto.productSold !== undefined) {
      revenue.productSold = dto.productSold ?? null;
    }

    if (dto.quantity !== undefined) {
      revenue.quantity = dto.quantity ?? null;
    }

    if (dto.quantityUnit !== undefined) {
      revenue.quantityUnit = dto.quantityUnit ?? null;
    }

    if (dto.paymentMethod !== undefined) {
      revenue.paymentMethod = dto.paymentMethod ?? null;
    }

    if (dto.notes !== undefined) {
      revenue.notes = dto.notes ?? null;
    }

    const actor = { id: userId } as User;
    revenue.updatedBy = actor;

    await this.revenueRepo.save(revenue);

    const updatedRevenue = await this.revenueRepo
      .createQueryBuilder("revenue")
      .leftJoinAndSelect("revenue.farm", "farm")
      .leftJoin("revenue.createdBy", "createdBy")
      .leftJoin("revenue.updatedBy", "updatedBy")
      .addSelect(["createdBy.id", "createdBy.name"])
      .addSelect(["updatedBy.id", "updatedBy.name"])
      .where("revenue.id = :id", { id: revenue.id })
      .getOne();

    return {
      message: "Revenue updated successfully",
      data: {
        revenue: updatedRevenue,
      },
    };
  }

  async deleteRevenue(revenueId: string, userId: string, farmId: string) {
    const revenue = await this.revenueRepo.findOne({
      where: {
        id: revenueId,
        deletedAt: null,
        farm: { id: farmId },
      },
    });

    if (!revenue) {
      throw new NotFoundException("Revenue not found");
    }

    revenue.deletedAt = new Date();
    await this.revenueRepo.save(revenue);

    return {
      message: "Revenue deleted successfully",
    };
  }
}
