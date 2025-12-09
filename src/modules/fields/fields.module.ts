import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Farm } from "../../database/entities/farm.entity";
import { Field } from "../../database/entities/field.entity";
import { FieldsController } from "./fields.controller";
import { FieldsService } from "./fields.service";

@Module({
  imports: [TypeOrmModule.forFeature([Field, Farm])],
  controllers: [FieldsController],
  providers: [FieldsService],
})
export class FieldsModule {}
