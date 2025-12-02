import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateWeightRecordDto {
  @ApiProperty({
    description: "Date and time when weight was measured (ISO format)",
    example: "2024-01-15T10:30:00Z",
  })
  @IsDateString()
  @IsNotEmpty()
  measuredAt: string;

  @ApiProperty({
    description: "Weight value",
    example: "450.5",
  })
  @IsNumber()
  @IsNotEmpty()
  weight: number;

  @ApiProperty({
    description: "Unit of weight measurement",
    example: "kg",
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  weightUnit: string;

  @ApiPropertyOptional({
    description: "Additional notes about the weight measurement",
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
