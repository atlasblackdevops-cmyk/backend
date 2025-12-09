import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator";

export class CreateIrrigationDto {
  @ApiProperty({
    description: "Field ID where irrigation occurred",
    format: "uuid",
  })
  @IsUUID()
  @IsNotEmpty()
  fieldId: string;

  @ApiProperty({
    description: "Date of irrigation in ISO format (YYYY-MM-DD)",
    example: "2024-06-15",
  })
  @IsDateString()
  @IsNotEmpty()
  irrigationDate: string;

  @ApiProperty({
    description: "Volume of water used",
    example: "500",
  })
  @IsString()
  @IsNotEmpty()
  waterVolume: string;

  @ApiProperty({
    description: "Unit of measurement for water volume",
    example: "liters",
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  volumeUnit: string;

  @ApiProperty({
    description: "Method of irrigation",
    example: "Drip",
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  irrigationMethod: string;

  @ApiProperty({
    description: "Duration of irrigation in minutes",
    example: 30,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  durationMinutes: number;

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
