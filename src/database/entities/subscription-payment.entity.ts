import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { OwnerGroupSubscription } from "./owner-group-subscription.entity";

export enum PaymentStatus {
  SUCCEEDED = "SUCCEEDED",
  PENDING = "PENDING",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
}

@Entity({ name: "subscription_payments" })
export class SubscriptionPayment {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(
    () => OwnerGroupSubscription,
    (subscription) => subscription.payments,
    { nullable: false, onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "owner_group_subscription_id" })
  ownerGroupSubscription: OwnerGroupSubscription;

  @Index({ unique: true })
  @Column({
    name: "stripe_payment_intent_id",
    type: "varchar",
    length: 255,
    unique: true,
  })
  stripePaymentIntentId: string;

  @Column({
    name: "stripe_invoice_id",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  stripeInvoiceId: string | null;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  amount: number;

  @Column({ type: "varchar", length: 3, default: "usd" })
  currency: string;

  @Index()
  @Column({
    name: "status",
    type: "enum",
    enum: PaymentStatus,
  })
  status: PaymentStatus;

  @Column({
    name: "paid_at",
    type: "timestamp with time zone",
    nullable: true,
  })
  paidAt: Date | null;

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
}
