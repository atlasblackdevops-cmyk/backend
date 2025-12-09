import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";

export class CreateHarvestDto {
  @ApiProperty({
    description: "Field ID where the harvest occurred",
    format: "uuid",
  })
  @IsUUID()
  @IsNotEmpty()
  fieldId: string;

  @ApiProperty({
    description: "Date of harvest in ISO format (YYYY-MM-DD)",
    example: "2024-06-15",
  })
  @IsDateString()
  @IsNotEmpty()
  harvestDate: string;

  @ApiProperty({
    description: "Type of crop harvested",
    example: "Wheat",
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  cropType: string;

  @ApiProperty({
    description: "Amount of yield harvested",
    example: "1000",
  })
  @IsString()
  @IsNotEmpty()
  yieldAmount: string;

  @ApiProperty({
    description: "Unit of measurement for yield",
    example: "kg",
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  yieldUnit: string;

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
