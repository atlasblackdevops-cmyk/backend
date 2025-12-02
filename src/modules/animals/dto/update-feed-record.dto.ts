import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateFeedRecordDto {
  @ApiPropertyOptional({
    description: "Quantity of feed",
    example: "25.5",
  })
  @IsOptional()
  @IsNumber()
  quantity?: number;

  @ApiPropertyOptional({
    description: "Unit of quantity measurement",
    example: "kg",
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  quantityUnit?: string;

  @ApiPropertyOptional({
    description: "Type of feed",
    example: "Hay",
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  feedType?: string;

  @ApiPropertyOptional({
    description: "Additional notes about the feed",
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
