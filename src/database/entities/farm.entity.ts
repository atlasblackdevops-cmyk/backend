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
import { UserPermission } from "./user-permission.entity";
import { User } from "./user.entity";

@Entity({ name: "farms" })
export class Farm {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "farm_name", type: "varchar" })
  farmName: string;

  @Column({
    name: "farm_code",
    type: "varchar",
    length: 12,
    unique: true,
  })
  farmCode: string;

  @ManyToOne(() => User, (user) => user.farms, { nullable: false })
  @JoinColumn({ name: "owner_id" })
  owner: User;

  @Column({ type: "varchar", nullable: true })
  city: string | null;

  @Column({ type: "varchar", nullable: true })
  state: string | null;

  @Column({ type: "varchar", nullable: true })
  country: string | null;

  @Column({ type: "varchar", nullable: true })
  address: string | null;

  @Column({ name: "farm_logo", type: "varchar", nullable: true })
  farmLogo: string | null;

  @Column({ type: "decimal", nullable: true })
  latitude: string | null;

  @Column({ type: "decimal", nullable: true })
  longitude: string | null;

  @Column({ name: "total_area", type: "decimal", nullable: true })
  totalArea: string | null;

  @Column({ name: "area_unit", type: "varchar", nullable: true })
  areaUnit: string | null;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

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

  @OneToMany(() => UserPermission, (userPermission) => userPermission.farm)
  userPermissions: UserPermission[];
}
