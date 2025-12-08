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
import { CropHealthNote } from "./crop-health-note.entity";
import { Farm } from "./farm.entity";
import { FertilizerRecord } from "./fertilizer-record.entity";
import { Harvest } from "./harvest.entity";
import { IrrigationRecord } from "./irrigation-record.entity";
import { PlantingRecord } from "./planting-record.entity";
import { User } from "./user.entity";

@Entity({ name: "fields" })
export class Field {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Farm, { nullable: false })
  @JoinColumn({ name: "farm_id" })
  farm: Farm;

  @Column({ name: "field_name", type: "varchar" })
  fieldName: string;

  @Column({ name: "field_size", type: "decimal", nullable: true })
  fieldSize: string | null;

  @Column({ name: "size_unit", type: "varchar", nullable: true })
  sizeUnit: string | null;

  @Column({ name: "soil_type", type: "varchar", nullable: true })
  soilType: string | null;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "created_by" })
  createdBy: User | null;

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

  @OneToMany(() => PlantingRecord, (plantingRecord) => plantingRecord.field)
  plantingRecords: PlantingRecord[];

  @OneToMany(() => Harvest, (harvest) => harvest.field)
  harvests: Harvest[];

  @OneToMany(
    () => FertilizerRecord,
    (fertilizerRecord) => fertilizerRecord.field,
  )
  fertilizerRecords: FertilizerRecord[];

  @OneToMany(
    () => IrrigationRecord,
    (irrigationRecord) => irrigationRecord.field,
  )
  irrigationRecords: IrrigationRecord[];

  @OneToMany(() => CropHealthNote, (cropHealthNote) => cropHealthNote.field)
  cropHealthNotes: CropHealthNote[];
}
