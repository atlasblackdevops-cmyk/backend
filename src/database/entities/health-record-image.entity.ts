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
import { AnimalHealthRecord } from "./animal-health-record.entity";

@Entity({ name: "health_record_images" })
export class HealthRecordImage {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => AnimalHealthRecord, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "health_record_id" })
  healthRecord: AnimalHealthRecord;

  @Column({ name: "image_key", type: "varchar", length: 500 })
  imageKey: string;

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
