import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";

export class CreateFertilizerDto {
  @ApiProperty({
    description: "Field ID where fertilizer was applied",
    format: "uuid",
  })
  @IsUUID()
  @IsNotEmpty()
  fieldId: string;

  @ApiProperty({
    description: "Type of fertilizer used",
    example: "NPK 20-20-20",
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fertilizerType: string;

  @ApiProperty({
    description: "Quantity of fertilizer applied",
    example: "50",
  })
  @IsString()
  @IsNotEmpty()
  quantity: string;

  @ApiProperty({
    description: "Unit of measurement for quantity",
    example: "kg",
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  quantityUnit: string;

  @ApiProperty({
    description: "Date of fertilizer application in ISO format (YYYY-MM-DD)",
    example: "2024-06-15",
  })
  @IsDateString()
  @IsNotEmpty()
  applicationDate: string;

  @ApiProperty({
    description: "Cost of fertilizer application",
    example: "150.00",
  })
  @IsString()
  @IsNotEmpty()
  cost: string;

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
