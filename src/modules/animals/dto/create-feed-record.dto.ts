import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateFeedRecordDto {
  @ApiProperty({
    description: "Quantity of feed",
    example: "25.5",
  })
  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @ApiProperty({
    description: "Unit of quantity measurement",
    example: "kg",
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  quantityUnit: string;

  @ApiProperty({
    description: "Type of feed",
    example: "Hay",
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  feedType: string;

  @ApiPropertyOptional({
    description: "Additional notes about the feed",
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
