import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Farm } from "../../database/entities/farm.entity";
import { Field } from "../../database/entities/field.entity";
import { Harvest } from "../../database/entities/harvest.entity";
import { PlantingRecord } from "../../database/entities/planting-record.entity";
import { User } from "../../database/entities/user.entity";
import { HarvestsController } from "./harvests.controller";
import { HarvestsService } from "./harvests.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Harvest, Field, PlantingRecord, Farm, User]),
  ],
  controllers: [HarvestsController],
  providers: [HarvestsService],
})
export class HarvestsModule {}
