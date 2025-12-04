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
import { Animal } from "./animal.entity";
import { HealthRecordImage } from "./health-record-image.entity";
import { User } from "./user.entity";

@Entity({ name: "animal_health_records" })
export class AnimalHealthRecord {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Animal, { nullable: false })
  @JoinColumn({ name: "animal_id" })
  animal: Animal;

  @Column({ name: "record_type", type: "varchar" })
  recordType: string;

  @Column({ type: "varchar" })
  name: string;

  @Column({ type: "decimal", nullable: true })
  cost: string | null;

  @Column({ name: "next_due_date", type: "date", nullable: true })
  nextDueDate: Date | null;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @OneToMany(() => HealthRecordImage, (image) => image.healthRecord, {
    cascade: false,
  })
  images: HealthRecordImage[];

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
}
