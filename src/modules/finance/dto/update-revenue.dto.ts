import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class UpdateRevenueDto {
  @ApiPropertyOptional({
    description: "Revenue date in ISO format (YYYY-MM-DD)",
    example: "2024-01-15",
  })
  @IsOptional()
  @IsDateString()
  revenueDate?: string;

  @ApiPropertyOptional({
    description: "Revenue amount",
    example: 500.75,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({
    description: "Currency type (3-letter code)",
    example: "USD",
    maxLength: 3,
  })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currencyType?: string;

  @ApiPropertyOptional({
    description: "Buyer name",
    maxLength: 255,
    example: "ABC Market",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  buyerName?: string;

  @ApiPropertyOptional({
    description: "Product sold",
    maxLength: 255,
    example: "Wheat",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  productSold?: string;

  @ApiPropertyOptional({
    description: "Quantity sold",
    example: 100,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional({
    description: "Quantity unit",
    maxLength: 50,
    example: "kg",
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  quantityUnit?: string;

  @ApiPropertyOptional({
    description: "Payment method",
    maxLength: 255,
    example: "Cash",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  paymentMethod?: string;

  @ApiPropertyOptional({
    description: "Additional notes",
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
