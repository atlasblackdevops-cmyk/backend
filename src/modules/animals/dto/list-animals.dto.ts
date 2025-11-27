import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from "class-validator";

export class ListAnimalsDto {
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
    description: "Search term applied to name/species/breed",
    minLength: 2,
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @MinLength(2)
  search?: string;

  @ApiPropertyOptional({
    description: "Filter by gender",
    example: "Female",
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  gender?: string;

  @ApiPropertyOptional({
    description:
      "Filter by birthdate from (start date in ISO format YYYY-MM-DD)",
    example: "2020-01-01",
  })
  @IsOptional()
  @IsDateString()
  birthdateFrom?: string;

  @ApiPropertyOptional({
    description: "Filter by birthdate to (end date in ISO format YYYY-MM-DD)",
    example: "2023-12-31",
  })
  @IsOptional()
  @IsDateString()
  birthdateTo?: string;
}
