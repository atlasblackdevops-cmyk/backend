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
import { Field } from "./field.entity";
import { User } from "./user.entity";

@Entity({ name: "irrigation_records" })
export class IrrigationRecord {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Field, { nullable: false })
  @JoinColumn({ name: "field_id" })
  field: Field;

  @Column({ name: "irrigation_date", type: "date", nullable: true })
  irrigationDate: Date | null;

  @Column({ name: "water_volume", type: "decimal", nullable: true })
  waterVolume: string | null;

  @Column({ name: "volume_unit", type: "varchar", nullable: true })
  volumeUnit: string | null;

  @Column({ name: "irrigation_method", type: "varchar", nullable: true })
  irrigationMethod: string | null;

  @Column({ name: "duration_minutes", type: "integer", nullable: true })
  durationMinutes: number | null;

  @Column({ type: "decimal", nullable: true })
  cost: string | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

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
