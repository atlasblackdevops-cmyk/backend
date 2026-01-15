import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator";

export class UpdateExpenseDto {
  @ApiPropertyOptional({
    description: "Expense category ID",
    format: "uuid",
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    description: "Other category name",
    maxLength: 255,
    example: "Custom Category",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  otherCategoryName?: string;

  @ApiPropertyOptional({
    description: "Expense date in ISO format (YYYY-MM-DD)",
    example: "2024-01-15",
  })
  @IsOptional()
  @IsDateString()
  expenseDate?: string;

  @ApiPropertyOptional({
    description: "Expense amount",
    example: 150.5,
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
    description: "Vendor name",
    maxLength: 255,
    example: "John's Farm Supply",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  vendor?: string;

  @ApiPropertyOptional({
    description: "Expense description",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: "Payment method",
    maxLength: 255,
    example: "Credit Card",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  paymentMethod?: string;
}
