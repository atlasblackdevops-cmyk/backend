import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import {
  MarketplaceListingCategory,
  MarketplaceListingStatus,
} from "../../../enums/marketplace.enum";

export class CreateListingDto {
  @ApiProperty({
    description: "Listing title",
    maxLength: 255,
    example: "Fresh Organic Tomatoes",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  title: string;

  @ApiPropertyOptional({
    description: "Listing description",
    example: "Fresh organic tomatoes from our farm, harvested this week",
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  description?: string;

  @ApiPropertyOptional({
    description: "Product category",
    enum: MarketplaceListingCategory,
    default: MarketplaceListingCategory.OTHER,
    example: MarketplaceListingCategory.PRODUCE,
  })
  @IsOptional()
  @IsEnum(MarketplaceListingCategory)
  category?: MarketplaceListingCategory;

  @ApiProperty({
    description: "Price per unit",
    example: 25.99,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Transform(({ value }) => (value ? parseFloat(value) : undefined))
  price: number;

  @ApiProperty({
    description: "Quantity available",
    example: 100,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Transform(({ value }) => (value ? parseFloat(value) : undefined))
  quantityAvailable: number;

  @ApiPropertyOptional({
    description: "Quantity unit (e.g., kg, lbs, pieces)",
    example: "kg",
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  quantityUnit?: string;

  @ApiPropertyOptional({
    description: "City",
    example: "Springfield",
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  city?: string;

  @ApiPropertyOptional({
    description: "State",
    example: "Illinois",
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  state?: string;

  @ApiPropertyOptional({
    description: "Country",
    example: "USA",
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  country?: string;

  @ApiPropertyOptional({
    description: "Whether shipping is available",
    default: false,
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  shippingAvailable?: boolean;

  @ApiPropertyOptional({
    description: "Listing status",
    enum: MarketplaceListingStatus,
    default: MarketplaceListingStatus.ACTIVE,
    example: MarketplaceListingStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(MarketplaceListingStatus)
  status?: MarketplaceListingStatus;
}
