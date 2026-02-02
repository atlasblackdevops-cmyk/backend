import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class GoogleSignInDto {
  @ApiProperty()
  @IsNotEmpty({ message: "idToken is required" })
  @IsString({ message: "idToken must be a string" })
  idToken: string;

  @ApiPropertyOptional({
    description: "Optional referral code if user was referred by someone",
    example: "ABC123XY",
  })
  @IsOptional()
  @IsString({ message: "Referral code must be a string" })
  referralCode?: string;
}
