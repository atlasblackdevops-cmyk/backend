import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./user.entity";

@Entity({ name: "referrals" })
export class Referral {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "referred_by" })
  @Index()
  referredBy: User;

  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "referred_to" })
  @Index({ unique: true })
  referredTo: User;

  @Column({
    name: "referral_code",
    type: "varchar",
    length: 255,
    nullable: false,
  })
  referralCode: string;

  @Column({
    type: "varchar",
    length: 50,
    nullable: false,
    default: "pending",
  })
  @Index()
  status: string; // pending, completed, cancelled

  @Column({ name: "points_awarded", type: "integer", default: 0 })
  pointsAwarded: number;

  @Column({
    name: "points_awarded_at",
    type: "timestamp with time zone",
    nullable: true,
  })
  pointsAwardedAt: Date | null;

  @CreateDateColumn({
    name: "created_at",
    type: "timestamp with time zone",
    nullable: true,
  })
  @Index()
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
