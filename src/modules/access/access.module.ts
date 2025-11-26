import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Permission } from "../../database/entities/permission.entity";
import { Role } from "../../database/entities/role.entity";
import { AccessController } from "./access.controller";
import { AccessService } from "./access.service";

@Module({
  imports: [TypeOrmModule.forFeature([Permission, Role])],
  controllers: [AccessController],
  providers: [AccessService],
  exports: [AccessService],
})
export class AccessModule {}
