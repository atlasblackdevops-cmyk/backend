import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Animal } from "../../database/entities/animal.entity";
import { Farm } from "../../database/entities/farm.entity";
import { AnimalsController } from "./animals.controller";
import { AnimalsService } from "./animals.service";

@Module({
  imports: [TypeOrmModule.forFeature([Animal, Farm])],
  controllers: [AnimalsController],
  providers: [AnimalsService],
})
export class AnimalsModule {}
