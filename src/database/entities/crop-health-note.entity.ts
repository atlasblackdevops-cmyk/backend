import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { CropHealthNoteImage } from "./crop-health-note-image.entity";
import { Field } from "./field.entity";
import { User } from "./user.entity";

@Entity({ name: "crop_health_notes" })
export class CropHealthNote {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Field, { nullable: false })
  @JoinColumn({ name: "field_id" })
  field: Field;

  @Column({ name: "note_date", type: "date", nullable: true })
  noteDate: Date | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "noted_by" })
  notedBy: User | null;

  @Column({ name: "health_status", type: "varchar", nullable: true })
  healthStatus: string | null;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({ name: "action_taken", type: "text", nullable: true })
  actionTaken: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "created_by" })
  createdBy: User | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "updated_by" })
  updatedBy: User | null;

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

  @OneToMany(() => CropHealthNoteImage, (image) => image.cropHealthNote, {
    cascade: false,
  })
  images: CropHealthNoteImage[];
}
