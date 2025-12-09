import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from "class-validator";

class ExistingImageNoteDto {
  @ApiPropertyOptional({
    description:
      "ID of the existing image to update (can use 'id' or 'imageId')",
    format: "uuid",
  })
  @Transform(({ obj }) => obj.imageId || obj.id)
  @IsUUID()
  imageId: string;

  @ApiPropertyOptional({
    description: "Updated note for this image",
    nullable: true,
  })
  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class UpdateCropHealthNoteDto {
  @ApiPropertyOptional({
    description: "Field ID where the crop health note is recorded",
    format: "uuid",
  })
  @IsOptional()
  @IsUUID()
  fieldId?: string;

  @ApiPropertyOptional({
    description: "Date of the crop health note in ISO format (YYYY-MM-DD)",
    example: "2024-06-15",
  })
  @IsOptional()
  @IsDateString()
  noteDate?: string;

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
      "Array of notes for new images (index-based: imageNotes[0] for images[0]). Only used when uploading new images.",
    type: [String],
    example: ["First image note", "", "Third image note"],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageNotes?: string[];

  @ApiPropertyOptional({
    description:
      "Array of existing image notes to update. Allows updating notes for existing images without re-uploading them.",
    type: [ExistingImageNoteDto],
    example: [
      {
        imageId: "123e4567-e89b-12d3-a456-426614174000",
        notes: "Updated note",
      },
      { imageId: "123e4567-e89b-12d3-a456-426614174001", notes: null },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExistingImageNoteDto)
  existingImageNotes?: ExistingImageNoteDto[];

  @ApiPropertyOptional({
    description:
      "Array of image IDs to delete. These images will be permanently removed.",
    type: [String],
    format: "uuid",
    example: ["123e4567-e89b-12d3-a456-426614174002"],
  })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  deleteImageIds?: string[];
}
