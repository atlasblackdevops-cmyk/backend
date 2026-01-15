import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator";

export class CreateExpenseDto {
  @ApiPropertyOptional({
    description: "Expense category ID",
    format: "uuid",
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    description: "Other category name (required if categoryId is not provided)",
    maxLength: 255,
    example: "Custom Category",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  otherCategoryName?: string;

  @ApiProperty({
    description: "Expense date in ISO format (YYYY-MM-DD)",
    example: "2024-01-15",
  })
  @IsDateString()
  @IsNotEmpty()
  expenseDate: string;

  @ApiProperty({
    description: "Expense amount",
    example: 150.5,
    minimum: 0,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  amount: number;

  @ApiProperty({
    description: "Currency type (3-letter code)",
    example: "USD",
    maxLength: 3,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(3)
  currencyType: string;

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
