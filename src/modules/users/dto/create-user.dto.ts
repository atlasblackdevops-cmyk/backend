import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from "class-validator";

export class CreateUserDto {
  @ApiProperty({ description: "Full name of the user" })
  @IsNotEmpty({ message: "Name is required" })
  @IsString({ message: "Name must be a string" })
  name: string;

  @ApiProperty({ description: "Email address of the user" })
  @IsNotEmpty({ message: "Email is required" })
  @IsString({ message: "Email must be a string" })
  @IsEmail({}, { message: "Email must be a valid email address" })
  email: string;

  @ApiProperty({ description: "Password for the user account" })
  @IsNotEmpty({ message: "Password is required" })
  @IsString({ message: "Password must be a string" })
  @MinLength(6, { message: "Password must be at least 6 characters" })
  password: string;

  @ApiProperty({
    description:
      "Role ID to assign to the user (cannot be OWNER or SUPER_ADMIN)",
  })
  @IsNotEmpty({ message: "Role ID is required" })
  @IsUUID("4", { message: "Role ID must be a valid UUID" })
  roleId: string;

  @ApiPropertyOptional({
    description: "Array of permission IDs to assign to the user for this farm",
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: "Permission IDs must be an array" })
  @ArrayNotEmpty({
    message: "Permission IDs array cannot be empty if provided",
  })
  @ArrayUnique({ message: "Permission IDs must be unique" })
  @IsUUID("4", {
    each: true,
    message: "Each permission ID must be a valid UUID",
  })
  permissionIds?: string[];
}
