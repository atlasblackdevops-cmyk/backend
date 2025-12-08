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
import { Field } from "./field.entity";
import { Harvest } from "./harvest.entity";
import { User } from "./user.entity";

@Entity({ name: "planting_records" })
export class PlantingRecord {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Field, (field) => field.plantingRecords, { nullable: false })
  @JoinColumn({ name: "field_id" })
  field: Field;

  @Column({ name: "crop_name", type: "varchar" })
  cropName: string;

  @Column({ name: "seed_type", type: "varchar", nullable: true })
  seedType: string | null;

  @Column({ name: "planting_date", type: "date", nullable: true })
  plantingDate: Date | null;

  @Column({ name: "expected_harvest_date", type: "date", nullable: true })
  expectedHarvestDate: Date | null;

  @Column({ name: "quantity_planted", type: "decimal", nullable: true })
  quantityPlanted: string | null;

  @Column({ name: "quantity_unit", type: "varchar", nullable: true })
  quantityUnit: string | null;

  @Column({ name: "seed_cost", type: "decimal", nullable: true })
  seedCost: string | null;

  @Column({ type: "decimal", nullable: true })
  area: string | null;

  @Column({ type: "varchar", nullable: true })
  unit: string | null;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

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

  @OneToMany(() => Harvest, (harvest) => harvest.plantingRecord)
  harvests: Harvest[];
}
