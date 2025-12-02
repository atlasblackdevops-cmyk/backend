import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class UpdateWeightRecordDto {
  @ApiPropertyOptional({
    description: "Date and time when weight was measured (ISO format)",
    example: "2024-01-15T10:30:00Z",
  })
  @IsOptional()
  @IsDateString()
  measuredAt?: string;

  @ApiPropertyOptional({
    description: "Weight value",
    example: "450.5",
  })
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional({
    description: "Unit of weight measurement",
    example: "kg",
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  weightUnit?: string;

  @ApiPropertyOptional({
    description: "Additional notes about the weight measurement",
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
