import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

export class RegisterDto {
  @ApiProperty()
  @IsNotEmpty({ message: "Email is required" })
  @IsString({ message: "Email must be a string" })
  @IsEmail({}, { message: "Email must be a valid email address" })
  email: string;

  @ApiProperty()
  @IsNotEmpty({ message: "Password is required" })
  @IsString({ message: "Password must be a string" })
  @MinLength(6, { message: "Password must be at least 6 characters" })
  password: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: "Name must be a string" })
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: "Mobile must be a string" })
  mobile?: string;
}
