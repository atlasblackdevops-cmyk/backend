import { ConfigifyModule } from "@itgorillaz/configify";
import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { DatabaseModule } from "./database/database.module";
import { AccessModule } from "./modules/access/access.module";
import { AuthModule } from "./modules/auth/auth.module";
import { FarmModule } from "./modules/farm/farm.module";
import { GlobalModule } from "./modules/global/global.module";
import { UsersModule } from "./modules/users/users.module";

@Module({
  imports: [
    ConfigifyModule.forRootAsync(),
    DatabaseModule,
    AuthModule,
    FarmModule,
    GlobalModule,
    AccessModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
