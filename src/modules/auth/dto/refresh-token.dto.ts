import { ApiProperty } from "@nestjs/swagger";
import { IsJWT, IsNotEmpty, IsString } from "class-validator";

export class RefreshTokenDto {
  @ApiProperty()
  @IsNotEmpty({ message: "Refresh token is required" })
  @IsString({ message: "Refresh token must be a string" })
  @IsJWT({ message: "Refresh token must be a valid JWT" })
  refreshToken: string;
}
