import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from "class-validator";

export class ListPlantingsDto {
  @ApiPropertyOptional({
    description: "Farm ID. If omitted, the user's current farm is used.",
    format: "uuid",
  })
  @IsOptional()
  @IsUUID()
  farmId?: string;

  @ApiPropertyOptional({
    description: "Page number (starts at 1)",
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Items per page",
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: "Search by crop or seed type",
    minLength: 2,
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @MinLength(2)
  search?: string;

  @ApiPropertyOptional({ description: "Filter by crop", example: "Corn" })
  @IsOptional()
  @IsString()
  crop?: string;

  @ApiPropertyOptional({
    description: "Filter by field ID",
    format: "uuid",
  })
  @IsOptional()
  @IsUUID()
  fieldId?: string;

  @ApiPropertyOptional({
    description: "Planting date from (YYYY-MM-DD)",
    format: "date",
  })
  @IsOptional()
  @IsDateString()
  plantingDateFrom?: string;

  @ApiPropertyOptional({
    description: "Planting date to (YYYY-MM-DD)",
    format: "date",
  })
  @IsOptional()
  @IsDateString()
  plantingDateTo?: string;

  @ApiPropertyOptional({
    description: "Filter by active status",
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === "") return undefined;
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      return value === "true" || value === "1";
    }
    return value;
  })
  @IsBoolean()
  isActive?: boolean;
}
