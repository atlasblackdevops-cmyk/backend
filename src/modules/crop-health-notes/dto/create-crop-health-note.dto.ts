import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";

export class CreateCropHealthNoteDto {
  @ApiProperty({
    description: "Field ID where the crop health note is recorded",
    format: "uuid",
  })
  @IsUUID()
  @IsNotEmpty()
  fieldId: string;

  @ApiProperty({
    description: "Date of the crop health note in ISO format (YYYY-MM-DD)",
    example: "2024-06-15",
  })
  @IsDateString()
  @IsNotEmpty()
  noteDate: string;

  @ApiPropertyOptional({
    description: "Health status of the crop",
    example: "Healthy",
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  healthStatus?: string;

  @ApiPropertyOptional({
    description: "Description of the crop health observation",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: "Action taken based on the observation",
  })
  @IsOptional()
  @IsString()
  actionTaken?: string;

  @ApiPropertyOptional({
    description:
      "Array of notes for each image (index-based: imageNotes[0] for images[0]). Only needed if images are provided.",
    type: [String],
    example: ["First image note", "", "Third image note"],
  })
  @IsOptional()
  imageNotes?: string[];
}
