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
import { PlantingRecord } from "./planting-record.entity";
import { User } from "./user.entity";

@Entity({ name: "harvests" })
export class Harvest {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Field, { nullable: false })
  @JoinColumn({ name: "field_id" })
  field: Field;

  @ManyToOne(() => PlantingRecord, { nullable: true })
  @JoinColumn({ name: "planting_record_id" })
  plantingRecord: PlantingRecord | null;

  @Column({ name: "harvest_date", type: "date", nullable: true })
  harvestDate: Date | null;

  @Column({ name: "crop_type", type: "varchar", nullable: true })
  cropType: string | null;

  @Column({ name: "yield_amount", type: "decimal", nullable: true })
  yieldAmount: string | null;

  @Column({ name: "yield_unit", type: "varchar", nullable: true })
  yieldUnit: string | null;

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
