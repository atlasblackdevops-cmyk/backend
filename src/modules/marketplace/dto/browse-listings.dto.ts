import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEnum, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { MarketplaceListingCategory } from "../../../enums/marketplace.enum";

export class BrowseListingsDto {
  @ApiPropertyOptional({
    description: "Page number",
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : 1))
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: "Items per page",
    example: 10,
    minimum: 1,
  })
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : 10))
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({
    description: "Search term (searches in title and description)",
    example: "tomatoes",
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: "Filter by category",
    enum: MarketplaceListingCategory,
    example: MarketplaceListingCategory.PRODUCE,
  })
  @IsOptional()
  @IsEnum(MarketplaceListingCategory)
  category?: MarketplaceListingCategory;

  @ApiPropertyOptional({
    description: "Filter by city",
    example: "Springfield",
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: "Filter by state",
    example: "Illinois",
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({
    description: "Filter by country",
    example: "USA",
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    description:
      "Filter by maximum distance in kilometers (requires latitude and longitude)",
    example: 50,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => (value ? parseFloat(value) : undefined))
  maxDistance?: number;

  @ApiPropertyOptional({
    description: "Latitude for distance calculation",
    example: 39.7817,
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value ? parseFloat(value) : undefined))
  latitude?: number;

  @ApiPropertyOptional({
    description: "Longitude for distance calculation",
    example: -89.6501,
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value ? parseFloat(value) : undefined))
  longitude?: number;
}
