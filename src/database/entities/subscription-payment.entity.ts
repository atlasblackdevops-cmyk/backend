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

  /**
   * Payment method used for this specific payment transaction
   */
  @Column({
    name: "stripe_payment_method_id",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  stripePaymentMethodId: string | null;

  @Column({
    name: "card_brand",
    type: "varchar",
    length: 50,
    nullable: true,
  })
  cardBrand: string | null; // e.g., "visa", "mastercard", "amex"

  @Column({
    name: "card_last4",
    type: "varchar",
    length: 4,
    nullable: true,
  })
  cardLast4: string | null; // Last 4 digits of card used for this payment

  @Column({
    name: "card_exp_month",
    type: "smallint",
    nullable: true,
  })
  cardExpMonth: number | null; // 1-12

  @Column({
    name: "card_exp_year",
    type: "smallint",
    nullable: true,
  })
  cardExpYear: number | null; // e.g., 2025

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
