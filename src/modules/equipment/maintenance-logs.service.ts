import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EquipmentMaintenance } from "../../database/entities/equipment-maintenance.entity";
import { Equipment } from "../../database/entities/equipment.entity";
import { User } from "../../database/entities/user.entity";
import { transformMaintenanceLog } from "../../utils/equipment-transformer.util";
import { CreateMaintenanceLogDto } from "./dto/create-maintenance-log.dto";
import { ListMaintenanceLogsDto } from "./dto/list-maintenance-logs.dto";
import { UpdateMaintenanceLogDto } from "./dto/update-maintenance-log.dto";

@Injectable()
export class MaintenanceLogsService {
  constructor(
    @InjectRepository(EquipmentMaintenance)
    private readonly maintenanceRepo: Repository<EquipmentMaintenance>,
    @InjectRepository(Equipment)
    private readonly equipmentRepo: Repository<Equipment>,
  ) {}

  async createMaintenanceLog(
    userId: string,
    farmId: string,
    dto: CreateMaintenanceLogDto,
  ) {
    const equipment = await this.equipmentRepo.findOne({
      where: { id: dto.equipmentId },
      relations: ["farm"],
    });

    if (!equipment) {
      throw new NotFoundException("Equipment not found");
    }

    // Check if equipment belongs to user's current farm
    if (equipment.farm.id !== farmId) {
      throw new ForbiddenException(
        "Equipment does not belong to your current farm",
      );
    }

    // Check if equipment is soft deleted
    if (equipment.deletedAt) {
      throw new NotFoundException("Equipment not found");
    }

    if (!dto.description?.trim()) {
      throw new BadRequestException("Description is required");
    }

    const maintenanceDate = new Date(dto.maintenanceDate);
    if (Number.isNaN(maintenanceDate.getTime())) {
      throw new BadRequestException("Invalid maintenance date");
    }

    let nextMaintenanceDate: Date | null = null;
    if (dto.nextMaintenanceDate) {
      const parsedDate = new Date(dto.nextMaintenanceDate);
      if (Number.isNaN(parsedDate.getTime())) {
        throw new BadRequestException("Invalid next maintenance date");
      }
      nextMaintenanceDate = parsedDate;
    }

    const actor = { id: userId } as User;

    const maintenance = this.maintenanceRepo.create({
      equipment,
      maintenanceDate,
      maintenanceType: dto.maintenanceType.trim(),
      description: dto.description.trim(),
      cost: dto.cost?.toString() || null,
      performedBy: dto.performedBy?.trim() || null,
      nextMaintenanceDate,
      notes: dto.notes?.trim() || null,
      createdBy: actor,
      updatedBy: actor,
    });

    await this.maintenanceRepo.save(maintenance);

    // Update equipment's last_service_at
    equipment.lastServiceAt = maintenanceDate;
    equipment.updatedBy = actor;
    await this.equipmentRepo.save(equipment);

    return {
      message: "Maintenance log created successfully",
    };
  }

  async listMaintenanceLogs(farmId: string, query: ListMaintenanceLogsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const qb = this.maintenanceRepo
      .createQueryBuilder("maintenance")
      .leftJoinAndSelect("maintenance.equipment", "equipment")
      .leftJoinAndSelect("equipment.farm", "farm")
      .leftJoinAndSelect("farm.owner", "owner")
      .leftJoinAndSelect("maintenance.createdBy", "createdBy")
      .leftJoinAndSelect("maintenance.updatedBy", "updatedBy")
      .where("farm.id = :farmId", { farmId })
      .andWhere("maintenance.deletedAt IS NULL")
      .orderBy("maintenance.maintenanceDate", "DESC");

    if (query.equipmentId) {
      qb.andWhere("equipment.id = :equipmentId", {
        equipmentId: query.equipmentId,
      });
    }

    if (query.maintenanceType) {
      qb.andWhere(
        "LOWER(maintenance.maintenanceType) = LOWER(:maintenanceType)",
        {
          maintenanceType: query.maintenanceType,
        },
      );
    }

    if (query.maintenanceDateFrom) {
      qb.andWhere("maintenance.maintenanceDate >= :maintenanceDateFrom", {
        maintenanceDateFrom: query.maintenanceDateFrom,
      });
    }

    if (query.maintenanceDateTo) {
      qb.andWhere("maintenance.maintenanceDate <= :maintenanceDateTo", {
        maintenanceDateTo: query.maintenanceDateTo,
      });
    }

    const total = await qb.getCount();
    const maintenanceLogs = await qb.skip(skip).take(limit).getMany();

    // Transform to include only required fields
    const transformedLogs = maintenanceLogs.map(transformMaintenanceLog);

    return {
      message: "Maintenance logs fetched successfully",
      data: {
        maintenanceLogs: transformedLogs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async getMaintenanceLogDetails(
    maintenanceLogId: string,
    userId: string,
    userFarmId: string,
  ) {
    const maintenance = await this.maintenanceRepo.findOne({
      where: { id: maintenanceLogId },
      relations: [
        "equipment",
        "equipment.farm",
        "equipment.farm.owner",
        "createdBy",
        "updatedBy",
      ],
    });

    if (!maintenance) {
      throw new NotFoundException("Maintenance log not found");
    }

    // Check if maintenance log belongs to user's current farm
    if (maintenance.equipment.farm.id !== userFarmId) {
      throw new ForbiddenException(
        "Maintenance log does not belong to your current farm",
      );
    }

    // Check if maintenance log is soft deleted
    if (maintenance.deletedAt) {
      throw new NotFoundException("Maintenance log not found");
    }

    // Transform to include only required fields
    const transformedMaintenance = maintenance
      ? transformMaintenanceLog(maintenance)
      : null;

    return {
      message: "Maintenance log details fetched successfully",
      data: {
        maintenanceLog: transformedMaintenance,
      },
    };
  }

  async updateMaintenanceLog(
    maintenanceLogId: string,
    userId: string,
    userFarmId: string,
    dto: UpdateMaintenanceLogDto,
  ) {
    const maintenance = await this.maintenanceRepo.findOne({
      where: { id: maintenanceLogId },
      relations: ["equipment", "equipment.farm"],
    });

    if (!maintenance) {
      throw new NotFoundException("Maintenance log not found");
    }

    // Check if maintenance log belongs to user's current farm
    if (maintenance.equipment.farm.id !== userFarmId) {
      throw new ForbiddenException(
        "Maintenance log does not belong to your current farm",
      );
    }

    // Check if maintenance log is soft deleted
    if (maintenance.deletedAt) {
      throw new NotFoundException("Maintenance log not found");
    }

    const actor = { id: userId } as User;

    // Update fields if provided
    if (dto.maintenanceDate !== undefined) {
      if (dto.maintenanceDate) {
        const parsedDate = new Date(dto.maintenanceDate);
        if (Number.isNaN(parsedDate.getTime())) {
          throw new BadRequestException("Invalid maintenance date");
        }
        maintenance.maintenanceDate = parsedDate;
      } else {
        throw new BadRequestException("Maintenance date is required");
      }
    }

    if (dto.maintenanceType !== undefined) {
      maintenance.maintenanceType = dto.maintenanceType.trim();
    }

    if (dto.description !== undefined) {
      if (!dto.description?.trim()) {
        throw new BadRequestException("Description cannot be empty");
      }
      maintenance.description = dto.description.trim();
    }

    if (dto.cost !== undefined) {
      maintenance.cost = dto.cost?.toString() || null;
    }

    if (dto.performedBy !== undefined) {
      maintenance.performedBy = dto.performedBy?.trim() || null;
    }

    if (dto.nextMaintenanceDate !== undefined) {
      if (dto.nextMaintenanceDate) {
        const parsedDate = new Date(dto.nextMaintenanceDate);
        if (Number.isNaN(parsedDate.getTime())) {
          throw new BadRequestException("Invalid next maintenance date");
        }
        maintenance.nextMaintenanceDate = parsedDate;
      } else {
        maintenance.nextMaintenanceDate = null;
      }
    }

    if (dto.notes !== undefined) {
      maintenance.notes = dto.notes?.trim() || null;
    }

    maintenance.updatedBy = actor;

    await this.maintenanceRepo.save(maintenance);

    return {
      message: "Maintenance log updated successfully",
    };
  }

  async deleteMaintenanceLog(
    maintenanceLogId: string,
    userId: string,
    userFarmId: string,
  ) {
    const maintenance = await this.maintenanceRepo.findOne({
      where: { id: maintenanceLogId },
      relations: ["equipment", "equipment.farm"],
    });

    if (!maintenance) {
      throw new NotFoundException("Maintenance log not found");
    }

    // Check if maintenance log belongs to user's current farm
    if (maintenance.equipment.farm.id !== userFarmId) {
      throw new ForbiddenException(
        "Maintenance log does not belong to your current farm",
      );
    }

    // Check if maintenance log is soft deleted
    if (maintenance.deletedAt) {
      throw new NotFoundException("Maintenance log not found");
    }

    await this.maintenanceRepo.softRemove(maintenance);

    return {
      message: "Maintenance log deleted successfully",
    };
  }
}
