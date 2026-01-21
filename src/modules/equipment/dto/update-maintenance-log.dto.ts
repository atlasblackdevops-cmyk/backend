import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class UpdateMaintenanceLogDto {
  @ApiPropertyOptional({
    description: "Maintenance date in ISO format (YYYY-MM-DD)",
    example: "2024-01-15",
  })
  @IsOptional()
  @IsDateString()
  maintenanceDate?: string;

  @ApiPropertyOptional({
    description: "Maintenance type (routine, repair, inspection)",
    enum: ["routine", "repair", "inspection"],
    example: "routine",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  maintenanceType?: string;

  @ApiPropertyOptional({
    description: "Description of the maintenance work",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: "Cost of the maintenance",
    example: 500.0,
  })
  @IsOptional()
  @Transform(({ value }) => (value ? parseFloat(value) : undefined))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  cost?: number;

  @ApiPropertyOptional({
    description: "Who performed the maintenance (mechanic or company name)",
    maxLength: 255,
    example: "ABC Repair Services",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  performedBy?: string;

  @ApiPropertyOptional({
    description: "Next maintenance date in ISO format (YYYY-MM-DD)",
    example: "2024-04-15",
  })
  @IsOptional()
  @IsDateString()
  nextMaintenanceDate?: string;

  @ApiPropertyOptional({
    description: "Additional notes",
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
