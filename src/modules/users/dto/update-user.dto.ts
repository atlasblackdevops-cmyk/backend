import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  ValidateIf,
} from "class-validator";

export class UpdateUserDto {
  // For active/inactive toggle
  @ApiPropertyOptional({
    description: "Set user active status (only for status updates)",
  })
  @IsOptional()
  @IsBoolean({ message: "isActive must be a boolean" })
  isActive?: boolean;

  // For permission updates
  @ApiPropertyOptional({
    description:
      "Array of permission IDs to assign (only for permission updates)",
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

  // For user details update
  @ApiPropertyOptional({
    description: "Email address (only for user details update)",
  })
  @IsOptional()
  @IsString({ message: "Email must be a string" })
  @IsEmail({}, { message: "Email must be a valid email address" })
  email?: string;

  @ApiPropertyOptional({
    description: "Password (only for user details update, optional)",
  })
  @IsOptional()
  @IsString({ message: "Password must be a string" })
  @MinLength(6, { message: "Password must be at least 6 characters" })
  password?: string;

  @ApiPropertyOptional({
    description: "Role ID (only for user details update)",
  })
  @IsOptional()
  @IsUUID("4", { message: "Role ID must be a valid UUID" })
  roleId?: string;
}

