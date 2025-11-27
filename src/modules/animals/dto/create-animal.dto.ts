import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateAnimalDto {
  @ApiProperty({
    description: "Display name of the animal",
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: "Animal species",
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  species?: string;

  @ApiPropertyOptional({
    description: "Animal breed",
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  breed?: string;

  @ApiPropertyOptional({
    description: "Animal gender",
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  gender?: string;

  @ApiPropertyOptional({
    description: "Birthdate in ISO format (YYYY-MM-DD)",
  })
  @IsOptional()
  @IsDateString()
  birthdate?: string;
}

