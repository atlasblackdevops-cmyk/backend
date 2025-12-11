import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";

export class UpdateAnimalDto {
  @ApiPropertyOptional({
    description: "Display name of the animal",
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiProperty({
    description: "Animal species ID (UUID)",
  })
  @IsUUID()
  @IsNotEmpty()
  speciesId: string;

  @ApiProperty({
    description: "Animal breed ID (UUID)",
  })
  @IsUUID()
  @IsNotEmpty()
  breedId: string;

  @ApiProperty({
    description: "Animal gender/sex",
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  gender: string;

  @ApiPropertyOptional({
    description: "Birthdate in ISO format (YYYY-MM-DD)",
  })
  @IsOptional()
  @IsDateString()
  birthdate?: string;
}
