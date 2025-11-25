import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthConfig } from "../../config/auth.config";
import { GoogleConfig } from "../../config/google.config";
import { Farm } from "../../database/entities/farm.entity";
import { Role } from "../../database/entities/role.entity";
import { User } from "../../database/entities/user.entity";
import { BcryptService } from "../../services/bcrypt.service";
import { GoogleService } from "../../services/google.service";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAccessStrategy } from "./strategies/jwt-access.strategy";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, Farm]),
    JwtModule.registerAsync({
      inject: [AuthConfig],
      useFactory: (auth: AuthConfig) => ({
        secret: auth.accessSecret,
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAccessStrategy,
    BcryptService,
    GoogleService,
    GoogleConfig,
  ],
  exports: [AuthService],
})
export class AuthModule {}
