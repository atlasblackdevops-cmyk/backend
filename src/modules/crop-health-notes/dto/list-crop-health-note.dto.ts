import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from "class-validator";

export class ListCropHealthNoteDto {
  @ApiPropertyOptional({
    description: "Page number (starts at 1)",
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Items per page",
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: "Filter by field ID",
    format: "uuid",
  })
  @IsOptional()
  @IsUUID()
  fieldId?: string;

  @ApiPropertyOptional({
    description:
      "Filter by note date from (start date in ISO format YYYY-MM-DD)",
    example: "2024-01-01",
  })
  @IsOptional()
  @IsDateString()
  noteDateFrom?: string;

  @ApiPropertyOptional({
    description: "Filter by note date to (end date in ISO format YYYY-MM-DD)",
    example: "2024-12-31",
  })
  @IsOptional()
  @IsDateString()
  noteDateTo?: string;
}
