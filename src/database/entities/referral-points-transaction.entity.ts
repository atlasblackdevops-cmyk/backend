import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Referral } from "./referral.entity";
import { User } from "./user.entity";

@Entity({ name: "referral_points_transactions" })
export class ReferralPointsTransaction {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  @Index()
  user: User;

  @ManyToOne(() => Referral, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "referral_id" })
  @Index()
  referral: Referral | null;

  @Column({
    name: "transaction_type",
    type: "varchar",
    length: 50,
    nullable: false,
  })
  @Index()
  transactionType: string; // earned, redeemed, expired, adjusted

  @Column({ type: "integer", nullable: false })
  points: number; // Positive for earned, negative for redeemed/expired

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({
    name: "created_at",
    type: "timestamp with time zone",
    nullable: true,
  })
  @Index()
  createdAt: Date | null;
}
