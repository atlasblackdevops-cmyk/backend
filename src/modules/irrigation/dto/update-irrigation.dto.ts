import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator";

export class UpdateIrrigationDto {
  @ApiPropertyOptional({
    description: "Field ID where irrigation occurred",
    format: "uuid",
  })
  @IsOptional()
  @IsUUID()
  fieldId?: string;

  @ApiPropertyOptional({
    description: "Date of irrigation in ISO format (YYYY-MM-DD)",
    example: "2024-06-15",
  })
  @IsOptional()
  @IsDateString()
  irrigationDate?: string;

  @ApiPropertyOptional({
    description: "Volume of water used",
    example: "500",
  })
  @IsOptional()
  @IsString()
  waterVolume?: string;

  @ApiPropertyOptional({
    description: "Unit of measurement for water volume",
    example: "liters",
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  volumeUnit?: string;

  @ApiPropertyOptional({
    description: "Method of irrigation",
    example: "Drip",
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  irrigationMethod?: string;

  @ApiPropertyOptional({
    description: "Duration of irrigation in minutes",
    example: 30,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @ApiPropertyOptional({
    description: "Planting record ID associated with this irrigation",
    format: "uuid",
  })
  @IsOptional()
  @IsUUID()
  plantingRecordId?: string;

  @ApiPropertyOptional({
    description: "Cost of irrigation",
    example: "50.00",
  })
  @IsOptional()
  @IsString()
  cost?: string;

  @ApiPropertyOptional({
    description: "Additional notes about the irrigation",
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
