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

@Entity({ name: "fertilizer_records" })
export class FertilizerRecord {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Field, { nullable: false })
  @JoinColumn({ name: "field_id" })
  field: Field;

  @Column({ name: "fertilizer_type", type: "varchar", nullable: true })
  fertilizerType: string | null;

  @Column({ type: "decimal", nullable: true })
  quantity: string | null;

  @Column({ name: "quantity_unit", type: "varchar", nullable: true })
  quantityUnit: string | null;

  @Column({ name: "application_date", type: "date", nullable: true })
  applicationDate: Date | null;

  @Column({ name: "application_method", type: "varchar", nullable: true })
  applicationMethod: string | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ type: "decimal", nullable: true })
  cost: string | null;

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
