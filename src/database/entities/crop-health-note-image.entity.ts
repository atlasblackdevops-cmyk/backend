import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { CropHealthNote } from "./crop-health-note.entity";

@Entity({ name: "crop_health_note_images" })
export class CropHealthNoteImage {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => CropHealthNote, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "crop_health_note_id" })
  cropHealthNote: CropHealthNote;

  @Column({ name: "image_key", type: "varchar", length: 500 })
  imageKey: string;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({
    name: "created_at",
    type: "timestamp with time zone",
    nullable: true,
  })
  createdAt: Date | null;

  @UpdateDateColumn({
    name: "updated_at",
    type: "timestamp with time zone",
    nullable: true,
  })
  updatedAt: Date | null;

  @DeleteDateColumn({
    name: "deleted_at",
    type: "timestamp with time zone",
    nullable: true,
  })
  deletedAt: Date | null;
}
