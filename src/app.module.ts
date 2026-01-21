import { ConfigifyModule } from "@itgorillaz/configify";
import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { DatabaseModule } from "./database/database.module";
import { AccessModule } from "./modules/access/access.module";
import { AnimalsModule } from "./modules/animals/animals.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CropHealthNotesModule } from "./modules/crop-health-notes/crop-health-notes.module";
import { EquipmentModule } from "./modules/equipment/equipment.module";
import { FarmModule } from "./modules/farm/farm.module";
import { FertilizerModule } from "./modules/fertilizer/fertilizer.module";
import { FieldsModule } from "./modules/fields/fields.module";
import { FinanceModule } from "./modules/finance/finance.module";
import { GlobalModule } from "./modules/global/global.module";
import { HarvestsModule } from "./modules/harvests/harvests.module";
import { IrrigationModule } from "./modules/irrigation/irrigation.module";
import { PlantingsModule } from "./modules/plantings/plantings.module";
import { SharedModule } from "./modules/shared/shared.module";
import { SubscriptionModule } from "./modules/subscription/subscription.module";
import { UsersModule } from "./modules/users/users.module";

@Module({
  imports: [
    ConfigifyModule.forRootAsync(),
    DatabaseModule,
    SharedModule,
    AuthModule,
    FarmModule,
    GlobalModule,
    AccessModule,
    UsersModule,
    AnimalsModule,
    FieldsModule,
    PlantingsModule,
    HarvestsModule,
    IrrigationModule,
    FertilizerModule,
    CropHealthNotesModule,
    SubscriptionModule,
    FinanceModule,
    EquipmentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
