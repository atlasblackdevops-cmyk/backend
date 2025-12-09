import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";

export class UpdateHarvestDto {
  @ApiPropertyOptional({
    description: "Field ID where the harvest occurred",
    format: "uuid",
  })
  @IsOptional()
  @IsUUID()
  fieldId?: string;

  @ApiPropertyOptional({
    description: "Date of harvest in ISO format (YYYY-MM-DD)",
    example: "2024-06-15",
  })
  @IsOptional()
  @IsDateString()
  harvestDate?: string;

  @ApiPropertyOptional({
    description: "Type of crop harvested",
    example: "Wheat",
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  cropType?: string;

  @ApiPropertyOptional({
    description: "Amount of yield harvested",
    example: "1000",
  })
  @IsOptional()
  @IsString()
  yieldAmount?: string;

  @ApiPropertyOptional({
    description: "Unit of measurement for yield",
    example: "kg",
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  yieldUnit?: string;

  @ApiPropertyOptional({
    description: "Planting record ID associated with this harvest",
    format: "uuid",
  })
  @IsOptional()
  @IsUUID()
  plantingRecordId?: string;

  @ApiPropertyOptional({
    description: "Additional notes about the harvest",
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
