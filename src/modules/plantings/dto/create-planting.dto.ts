import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";

export class CreatePlantingDto {
  @ApiProperty({
    description: "ID of the field where the planting occurred",
    format: "uuid",
  })
  @IsUUID()
  fieldId: string;

  @ApiProperty({ description: "Crop name" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  crop: string;

  @ApiPropertyOptional({ description: "Seed type" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  seedType?: string;

  @ApiProperty({
    description: "Planting date",
    type: String,
    format: "date",
  })
  @IsDateString()
  plantingDate: string;

  @ApiPropertyOptional({
    description: "Expected harvest date",
    type: String,
    format: "date",
  })
  @IsOptional()
  @IsDateString()
  expectedHarvestDate?: string;

  @ApiPropertyOptional({ description: "Quantity planted", type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  quantityPlanted?: number;

  @ApiPropertyOptional({
    description: "Unit for quantity planted (e.g., kg, lbs, bags)",
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  quantityUnit?: string;

  @ApiPropertyOptional({ description: "Seed cost", type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  seedCost?: number;

  @ApiPropertyOptional({ description: "Area covered", type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  area?: number;

  @ApiPropertyOptional({
    description: "Area unit (e.g., acres, hectares)",
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  areaUnit?: string;

  @ApiPropertyOptional({
    description: "Notes about the planting",
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description:
      "Farm ID (optional). If omitted, the user's current farm is used.",
    format: "uuid",
  })
  @IsOptional()
  @IsUUID()
  farmId?: string;

  @ApiPropertyOptional({
    description: "Whether the planting record is active",
    default: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

