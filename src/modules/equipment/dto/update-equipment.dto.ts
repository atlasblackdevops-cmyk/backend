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

export class UpdateEquipmentDto {
  @ApiPropertyOptional({
    description: "Equipment name",
    maxLength: 255,
    example: "John Deere Tractor",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  equipmentName?: string;

  @ApiPropertyOptional({
    description: "Equipment type (tractor, harvester, sprayer, etc.)",
    maxLength: 100,
    example: "tractor",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  equipmentType?: string;

  @ApiPropertyOptional({
    description: "Brand name",
    maxLength: 100,
    example: "John Deere",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  brand?: string;

  @ApiPropertyOptional({
    description: "Model name",
    maxLength: 100,
    example: "9R 370",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  model?: string;

  @ApiPropertyOptional({
    description: "Serial number",
    maxLength: 100,
    example: "JD123456789",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  serialNumber?: string;

  @ApiPropertyOptional({
    description: "Purchase date in ISO format (YYYY-MM-DD)",
    example: "2020-05-15",
  })
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @ApiPropertyOptional({
    description: "Purchase cost",
    example: 150000.0,
  })
  @IsOptional()
  @Transform(({ value }) => (value ? parseFloat(value) : undefined))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  purchaseCost?: number;

  @ApiPropertyOptional({
    description: "Equipment status",
    enum: ["operational", "under_maintenance", "broken", "retired"],
    example: "operational",
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  status?: string;

  @ApiPropertyOptional({
    description: "Additional notes",
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
