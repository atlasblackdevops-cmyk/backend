import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FarmMember } from "../../database/entities/farm-member.entity";
import { Farm } from "../../database/entities/farm.entity";
import { Role } from "../../database/entities/role.entity";
import { User } from "../../database/entities/user.entity";
import { FarmController } from "./farm.controller";
import { FarmService } from "./farm.service";

@Module({
  imports: [TypeOrmModule.forFeature([Farm, User, Role, FarmMember])],
  controllers: [FarmController],
  providers: [FarmService],
  exports: [FarmService],
})
export class FarmModule {}
