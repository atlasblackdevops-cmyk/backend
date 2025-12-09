import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Farm } from "../../database/entities/farm.entity";
import { Field } from "../../database/entities/field.entity";
import { IrrigationRecord } from "../../database/entities/irrigation-record.entity";
import { PlantingRecord } from "../../database/entities/planting-record.entity";
import { User } from "../../database/entities/user.entity";
import { IrrigationController } from "./irrigation.controller";
import { IrrigationService } from "./irrigation.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IrrigationRecord,
      Field,
      PlantingRecord,
      Farm,
      User,
    ]),
  ],
  controllers: [IrrigationController],
  providers: [IrrigationService],
})
export class IrrigationModule {}
