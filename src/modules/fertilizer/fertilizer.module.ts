import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Farm } from "../../database/entities/farm.entity";
import { FertilizerRecord } from "../../database/entities/fertilizer-record.entity";
import { Field } from "../../database/entities/field.entity";
import { User } from "../../database/entities/user.entity";
import { FertilizerController } from "./fertilizer.controller";
import { FertilizerService } from "./fertilizer.service";

@Module({
  imports: [TypeOrmModule.forFeature([FertilizerRecord, Field, Farm, User])],
  controllers: [FertilizerController],
  providers: [FertilizerService],
})
export class FertilizerModule {}
