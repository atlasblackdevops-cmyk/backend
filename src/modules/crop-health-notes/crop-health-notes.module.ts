import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CropHealthNoteImage } from "../../database/entities/crop-health-note-image.entity";
import { CropHealthNote } from "../../database/entities/crop-health-note.entity";
import { Farm } from "../../database/entities/farm.entity";
import { Field } from "../../database/entities/field.entity";
import { User } from "../../database/entities/user.entity";
import { CropHealthNotesController } from "./crop-health-notes.controller";
import { CropHealthNotesService } from "./crop-health-notes.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CropHealthNote,
      CropHealthNoteImage,
      Field,
      Farm,
      User,
    ]),
  ],
  controllers: [CropHealthNotesController],
  providers: [CropHealthNotesService],
})
export class CropHealthNotesModule {}
