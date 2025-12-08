import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateFieldDto {
  @ApiProperty({ description: "Name of the field" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fieldName: string;

  @ApiPropertyOptional({
    description: "Size of the field (numeric value)",
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  fieldSize?: number;

  @ApiPropertyOptional({
    description: "Unit for the field size (e.g., acres, hectares)",
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sizeUnit?: string;

  @ApiPropertyOptional({
    description: "Soil type for the field (e.g., loamy, sandy)",
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  soilType?: string;

  @ApiPropertyOptional({
    description: "Whether the field is active",
    default: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: "Additional notes about the field",
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

