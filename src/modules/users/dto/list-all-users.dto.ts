import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class ListAllUsersDto {
  @ApiPropertyOptional({
    description:
      "Search term to filter users by email or name (case-insensitive partial match)",
    example: "john",
  })
  @IsOptional()
  @IsString({ message: "Search must be a string" })
  search?: string;

  @ApiPropertyOptional({
    description: "Page number (starts from 1)",
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "Page must be an integer" })
  @Min(1, { message: "Page must be at least 1" })
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Number of items per page",
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "Limit must be an integer" })
  @Min(1, { message: "Limit must be at least 1" })
  @Max(100, { message: "Limit cannot exceed 100" })
  limit?: number = 10;
}
