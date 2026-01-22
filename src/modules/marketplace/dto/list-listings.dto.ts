import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEnum, IsOptional, IsString, Min } from "class-validator";
import {
  MarketplaceListingCategory,
  MarketplaceListingStatus,
} from "../../../enums/marketplace.enum";

export class ListListingsDto {
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
    description: "Filter by status",
    enum: MarketplaceListingStatus,
    example: MarketplaceListingStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(MarketplaceListingStatus)
  status?: MarketplaceListingStatus;

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
}
