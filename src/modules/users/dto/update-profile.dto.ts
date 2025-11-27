import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: "Full name of the user",
    example: "John Doe",
  })
  @IsOptional()
  @IsString({ message: "Name must be a string" })
  @MaxLength(255, { message: "Name must not exceed 255 characters" })
  name?: string;

  @ApiPropertyOptional({
    description: "Email address of the user",
    example: "user@example.com",
  })
  @IsOptional()
  @IsEmail({}, { message: "Email must be a valid email address" })
  @MaxLength(255, { message: "Email must not exceed 255 characters" })
  email?: string;
}
