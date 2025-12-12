import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class YieldBySeasonDto {
  @ApiPropertyOptional({
    description: "Filter by crop type",
    example: "Corn",
  })
  @IsOptional()
  @IsString()
  cropType?: string;
}
