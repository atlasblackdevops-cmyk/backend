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
import { Equipment } from "./equipment.entity";
import { User } from "./user.entity";

@Entity({ name: "equipment_maintenance" })
export class EquipmentMaintenance {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Equipment, { nullable: false })
  @JoinColumn({ name: "equipment_id" })
  equipment: Equipment;

  @Column({ name: "maintenance_date", type: "date", nullable: false })
  maintenanceDate: Date;

  @Column({ name: "maintenance_type", type: "varchar", length: 100 })
  maintenanceType: string; // routine, repair, inspection

  @Column({ type: "text" })
  description: string;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  cost: string | null;

  @Column({
    name: "performed_by",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  performedBy: string | null; // mechanic or company name

  @Column({ name: "next_maintenance_date", type: "date", nullable: true })
  nextMaintenanceDate: Date | null;

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
