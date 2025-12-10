import { ConfigifyModule } from "@itgorillaz/configify";
import { Module } from "@nestjs/common";
import { CommandRunnerModule } from "nest-commander";
import { DatabaseModule } from "../database/database.module";
import { GlobalModule } from "../modules/global/global.module";
import { CreateAdminUserCommand } from "./create-admin-user.command";
import { SeedBreedsCommand } from "./seed-breeds.command";
import { SeedPermissionsCommand } from "./seed-permissions.command";
import { SeedSpeciesCommand } from "./seed-species.command";
import { SeedSuperAdminCommand } from "./seed-super-admin.command";

@Module({
  imports: [
    ConfigifyModule.forRootAsync(),
    DatabaseModule,
    CommandRunnerModule,
    GlobalModule,
  ],
  controllers: [],
  providers: [
    CreateAdminUserCommand,
    SeedSuperAdminCommand,
    SeedPermissionsCommand,
    SeedSpeciesCommand,
    SeedBreedsCommand,
  ],
})
export class CommandsModule {}
