import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export enum GroupByType {
  DAY = "day",
  WEEK = "week",
  MONTH = "month",
  YEAR = "year",
}

export class DashboardTrendsDto {
  @ApiProperty({
    description: "Start date for trends (ISO format YYYY-MM-DD)",
    example: "2024-01-01",
  })
  @IsDateString()
  @IsNotEmpty()
  dateFrom: string;

  @ApiProperty({
    description: "End date for trends (ISO format YYYY-MM-DD)",
    example: "2024-12-31",
  })
  @IsDateString()
  @IsNotEmpty()
  dateTo: string;

  @ApiProperty({
    description: "How to group the data",
    enum: GroupByType,
    example: GroupByType.MONTH,
  })
  @IsEnum(GroupByType)
  @IsNotEmpty()
  groupBy: GroupByType;

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
