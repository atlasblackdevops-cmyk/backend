import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class UpdateHealthRecordDto {
  @ApiPropertyOptional({
    description: "Type of health record",
    example: "Vaccination",
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  recordType?: string;

  @ApiPropertyOptional({
    description: "Name of the health record",
    example: "Annual Vaccination",
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    description: "Cost of the health record",
    example: "150.00",
  })
  @IsOptional()
  @IsNumber()
  cost?: number;

  @ApiPropertyOptional({
    description: "Next due date in ISO format (YYYY-MM-DD)",
  })
  @IsOptional()
  @IsDateString()
  nextDueDate?: string;

  @ApiPropertyOptional({
    description: "Description of the health record",
  })
  @IsOptional()
  @IsString()
  description?: string;
}
