import { Configuration, Value } from "@itgorillaz/configify";
import { IsNotEmpty, IsString } from "class-validator";

@Configuration()
export class AuthConfig {
  @Value("JWT_ACCESS_SECRET")
  @IsNotEmpty()
  @IsString()
  accessSecret: string;

  @Value("JWT_ACCESS_EXPIRES", { default: "15m" })
  @IsString()
  accessExpires: string;

  @Value("JWT_REFRESH_SECRET")
  @IsNotEmpty()
  @IsString()
  refreshSecret: string;

  @Value("JWT_REFRESH_EXPIRES", { default: "7d" })
  @IsString()
  refreshExpires: string;
}
