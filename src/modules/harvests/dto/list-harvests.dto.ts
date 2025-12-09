import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDateString, IsInt, IsOptional, Max, Min } from "class-validator";

export class ListHarvestsDto {
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
    description:
      "Filter by harvest date from (start date in ISO format YYYY-MM-DD)",
    example: "2024-01-01",
  })
  @IsOptional()
  @IsDateString()
  harvestDateFrom?: string;

  @ApiPropertyOptional({
    description:
      "Filter by harvest date to (end date in ISO format YYYY-MM-DD)",
    example: "2024-12-31",
  })
  @IsOptional()
  @IsDateString()
  harvestDateTo?: string;
}
