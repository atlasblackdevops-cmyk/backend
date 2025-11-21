import { ConfigifyModule } from "@itgorillaz/configify";
import { Module } from "@nestjs/common";
import { CommandRunnerModule } from "nest-commander";
import { DatabaseModule } from "../database/database.module";
import { GlobalModule } from "../modules/global/global.module";
import { CreateAdminUserCommand } from "./create-admin-user.command";
import { SeedSuperAdminCommand } from "./seed-super-admin.command";

@Module({
  imports: [
    ConfigifyModule.forRootAsync(),
    DatabaseModule,
    CommandRunnerModule,
    GlobalModule,
  ],
  controllers: [],
  providers: [CreateAdminUserCommand, SeedSuperAdminCommand],
})
export class CommandsModule {}
