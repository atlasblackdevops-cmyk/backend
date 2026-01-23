import { ConfigifyModule } from "@itgorillaz/configify";
import { Module } from "@nestjs/common";
import { CommandRunnerModule } from "nest-commander";
import { DatabaseModule } from "../database/database.module";
import { GlobalModule } from "../modules/global/global.module";
import { BackfillOwnerGroupIdCommand } from "./backfill-owner-group-id.command";
import { CreateAdminUserCommand } from "./create-admin-user.command";
// import { GenerateReferralCodesCommand } from "./generate-referral-codes.command";
import { SeedBreedsCommand } from "./seed-breeds.command";
import { SeedExpenseCategoriesCommand } from "./seed-expense-categories.command";
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
    SeedExpenseCategoriesCommand,
    BackfillOwnerGroupIdCommand,
    // GenerateReferralCodesCommand, //
  ],
})
export class CommandsModule {}
