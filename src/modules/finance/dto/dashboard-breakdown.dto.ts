import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export enum BreakdownType {
  EXPENSE_CATEGORIES = "expense-categories",
  TOP_VENDORS = "top-vendors",
  TOP_BUYERS = "top-buyers",
  REVENUE_BY_PRODUCT = "revenue-by-product",
  PAYMENT_METHODS = "payment-methods",
  RECENT_TRANSACTIONS = "recent-transactions",
  ALL = "all",
}

export class DashboardBreakdownDto {
  @ApiPropertyOptional({
    description: "Start date for breakdown (ISO format YYYY-MM-DD)",
    example: "2024-01-01",
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: "End date for breakdown (ISO format YYYY-MM-DD)",
    example: "2024-12-31",
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: "Type of breakdown to retrieve",
    enum: BreakdownType,
    example: BreakdownType.ALL,
    default: BreakdownType.ALL,
  })
  @IsOptional()
  @IsEnum(BreakdownType)
  type?: BreakdownType = BreakdownType.ALL;

  @ApiPropertyOptional({
    description: "Limit for top items (e.g., top 10 categories)",
    default: 10,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: "Filter by currency type (3-letter code)",
    example: "USD",
    maxLength: 3,
  })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;
}
