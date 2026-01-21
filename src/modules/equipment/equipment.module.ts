import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EquipmentMaintenance } from "../../database/entities/equipment-maintenance.entity";
import { Equipment } from "../../database/entities/equipment.entity";
import { Farm } from "../../database/entities/farm.entity";
import { SharedModule } from "../shared/shared.module";
import { EquipmentController } from "./equipment.controller";
import { EquipmentService } from "./equipment.service";
import { MaintenanceLogsController } from "./maintenance-logs.controller";
import { MaintenanceLogsService } from "./maintenance-logs.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Equipment, EquipmentMaintenance, Farm]),
    SharedModule,
  ],
  controllers: [EquipmentController, MaintenanceLogsController],
  providers: [EquipmentService, MaintenanceLogsService],
  exports: [EquipmentService, MaintenanceLogsService],
})
export class EquipmentModule {}
