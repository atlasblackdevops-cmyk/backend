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
import { EquipmentMaintenance } from "./equipment-maintenance.entity";
import { Farm } from "./farm.entity";
import { User } from "./user.entity";

@Entity({ name: "equipment" })
export class Equipment {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Farm, { nullable: false })
  @JoinColumn({ name: "farm_id" })
  farm: Farm;

  @Column({ name: "equipment_name", type: "varchar", length: 255 })
  equipmentName: string;

  @Column({
    name: "equipment_type",
    type: "varchar",
    length: 100,
    nullable: true,
  })
  equipmentType: string | null; // tractor, harvester, sprayer, etc.

  @Column({ type: "varchar", length: 100, nullable: true })
  brand: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  model: string | null;

  @Column({
    name: "serial_number",
    type: "varchar",
    length: 100,
    nullable: true,
  })
  serialNumber: string | null;

  @Column({ name: "purchase_date", type: "date", nullable: true })
  purchaseDate: Date | null;

  @Column({
    name: "purchase_cost",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
  })
  purchaseCost: string | null;

  @Column({ type: "text", nullable: true })
  photo: string | null;

  @Column({ type: "varchar", length: 100, default: "operational" })
  status: string; // operational, under_maintenance, broken, retired

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ name: "last_service_at", type: "date", nullable: true })
  lastServiceAt: Date | null;

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

  @OneToMany(() => EquipmentMaintenance, (maintenance) => maintenance.equipment)
  maintenanceLogs: EquipmentMaintenance[];
}
