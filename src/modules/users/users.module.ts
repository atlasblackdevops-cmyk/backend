import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FarmMember } from "../../database/entities/farm-member.entity";
import { Farm } from "../../database/entities/farm.entity";
import { Permission } from "../../database/entities/permission.entity";
import { Role } from "../../database/entities/role.entity";
import { UserPermission } from "../../database/entities/user-permission.entity";
import { User } from "../../database/entities/user.entity";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Role,
      Farm,
      FarmMember,
      Permission,
      UserPermission,
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
