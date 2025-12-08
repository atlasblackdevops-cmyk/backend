import { ConfigifyModule } from "@itgorillaz/configify";
import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { DatabaseModule } from "./database/database.module";
import { AccessModule } from "./modules/access/access.module";
import { AnimalsModule } from "./modules/animals/animals.module";
import { AuthModule } from "./modules/auth/auth.module";
import { FarmModule } from "./modules/farm/farm.module";
import { GlobalModule } from "./modules/global/global.module";
import { SharedModule } from "./modules/shared/shared.module";
import { UsersModule } from "./modules/users/users.module";
import { FieldsModule } from "./modules/fields/fields.module";
import { PlantingsModule } from "./modules/plantings/plantings.module";

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
