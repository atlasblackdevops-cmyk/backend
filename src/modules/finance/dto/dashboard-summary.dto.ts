import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export enum PeriodType {
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  YEARLY = "yearly",
}

export enum CompareWith {
  PREVIOUS_PERIOD = "previous_period",
  PREVIOUS_MONTH = "previous_month",
  PREVIOUS_YEAR = "previous_year",
}

export class DashboardSummaryDto {
  @ApiPropertyOptional({
    description: "Start date for summary period (ISO format YYYY-MM-DD)",
    example: "2024-01-01",
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: "End date for summary period (ISO format YYYY-MM-DD)",
    example: "2024-12-31",
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: "Filter by currency type (3-letter code)",
    example: "USD",
    maxLength: 3,
  })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({
    description: "Period type for comparison",
    enum: PeriodType,
    example: PeriodType.MONTHLY,
  })
  @IsOptional()
  @IsEnum(PeriodType)
  period?: PeriodType;

  @ApiPropertyOptional({
    description: "What to compare with",
    enum: CompareWith,
    example: CompareWith.PREVIOUS_PERIOD,
  })
  @IsOptional()
  @IsEnum(CompareWith)
  compareWith?: CompareWith;
}
