import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";

export class UpdateFertilizerDto {
  @ApiPropertyOptional({
    description: "Field ID where fertilizer was applied",
    format: "uuid",
  })
  @IsOptional()
  @IsUUID()
  fieldId?: string;

  @ApiPropertyOptional({
    description: "Type of fertilizer used",
    example: "NPK 20-20-20",
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fertilizerType?: string;

  @ApiPropertyOptional({
    description: "Quantity of fertilizer applied",
    example: "50",
  })
  @IsOptional()
  @IsString()
  quantity?: string;

  @ApiPropertyOptional({
    description: "Unit of measurement for quantity",
    example: "kg",
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  quantityUnit?: string;

  @ApiPropertyOptional({
    description: "Date of fertilizer application in ISO format (YYYY-MM-DD)",
    example: "2024-06-15",
  })
  @IsOptional()
  @IsDateString()
  applicationDate?: string;

  @ApiPropertyOptional({
    description: "Cost of fertilizer application",
    example: "150.00",
  })
  @IsOptional()
  @IsString()
  cost?: string;

  @ApiPropertyOptional({
    description: "Method of fertilizer application",
    example: "Broadcast",
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  applicationMethod?: string;

  @ApiPropertyOptional({
    description: "Additional notes about the fertilizer application",
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
