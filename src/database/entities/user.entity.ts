import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Farm } from "./farm.entity";
import { Role } from "./role.entity";
import { UserPermission } from "./user-permission.entity";

@Entity({ name: "users" })
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index({ unique: true })
  @Column({ type: "varchar" })
  email: string;

  @Column({ type: "varchar" })
  password: string;

  @ManyToOne(() => Farm, { nullable: true })
  @JoinColumn({ name: "current_farm" })
  currentFarm: Farm | null;

  @ManyToOne(() => Role, (role) => role.users, { nullable: false })
  @JoinColumn({ name: "role_id" })
  role: Role;

  @Column({ name: "referral_code", type: "varchar", nullable: true })
  referralCode: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "referred_by" })
  referredBy: User | null;

  @Column({ name: "email_verified", type: "boolean", default: false })
  emailVerified: boolean;

  @Column({ name: "is_invited", type: "boolean", default: false })
  isInvited: boolean;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  @Column({ type: "varchar", nullable: true })
  mobile: string | null;

  @Column({ type: "varchar", nullable: true })
  name: string | null;

  @Column({ name: "profile_picture", type: "varchar", nullable: true })
  profilePicture: string | null;

  @Column({ name: "google_sub", type: "varchar", nullable: true, unique: true })
  googleSub: string | null;

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

  @OneToMany(() => Farm, (farm) => farm.owner)
  farms: Farm[];

  @OneToMany(() => UserPermission, (userPermission) => userPermission.user)
  userPermissions: UserPermission[];
}
