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
  MinLength,
} from "class-validator";

export class ListFieldsDto {
  @ApiPropertyOptional({
    description:
      "Farm ID to scope the query. If omitted, the user's current farm is used.",
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
    description: "Search term applied to field name or soil type",
    minLength: 1,
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @MinLength(1)
  search?: string;

  @ApiPropertyOptional({
    description: "Filter by soil type",
    example: "loamy",
  })
  @IsOptional()
  @IsString()
  soilType?: string;

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
