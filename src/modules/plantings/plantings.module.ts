import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Farm } from "../../database/entities/farm.entity";
import { Field } from "../../database/entities/field.entity";
import { PlantingRecord } from "../../database/entities/planting-record.entity";
import { PlantingsController } from "./plantings.controller";
import { PlantingsService } from "./plantings.service";

@Module({
  imports: [TypeOrmModule.forFeature([PlantingRecord, Field, Farm])],
  controllers: [PlantingsController],
  providers: [PlantingsService],
})
export class PlantingsModule {}
