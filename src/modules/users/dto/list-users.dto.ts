import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from "class-validator";

export class ListUsersDto {
  @ApiPropertyOptional({
    description: "Page number (starts from 1)",
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "Page must be an integer" })
  @Min(1, { message: "Page must be at least 1" })
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Number of items per page",
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "Limit must be an integer" })
  @Min(1, { message: "Limit must be at least 1" })
  @Max(100, { message: "Limit cannot exceed 100" })
  limit?: number = 10;

  @ApiPropertyOptional({
    description: "Filter by role ID",
  })
  @IsOptional()
  @IsUUID("4", { message: "Role ID must be a valid UUID" })
  roleId?: string;

  @ApiPropertyOptional({
    description: "Filter by active status (true for active, false for inactive)",
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === "true" || value === true) return true;
    if (value === "false" || value === false) return false;
    return undefined;
  })
  @IsBoolean({ message: "isActive must be a boolean" })
  isActive?: boolean;
}

