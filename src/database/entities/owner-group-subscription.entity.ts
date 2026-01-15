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
import { SubscriptionPayment } from "./subscription-payment.entity";
import { User } from "./user.entity";

export enum SubscriptionStatus {
  ACTIVE = "ACTIVE",
  CANCELED = "CANCELED",
  PAST_DUE = "PAST_DUE",
  UNPAID = "UNPAID",
  TRIALING = "TRIALING",
  INCOMPLETE = "INCOMPLETE",
  INCOMPLETE_EXPIRED = "INCOMPLETE_EXPIRED",
}

@Entity({ name: "owner_group_subscriptions" })
export class OwnerGroupSubscription {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column({ name: "owner_group_id", type: "uuid" })
  ownerGroupId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: "owner_id" })
  owner: User;

  /**
   * Stripe Price ID - used to fetch plan details (name, price, billing interval) from Stripe API
   */
  @Index()
  @Column({ name: "stripe_price_id", type: "varchar", length: 255 })
  stripePriceId: string;

  @Index({ unique: true })
  @Column({
    name: "stripe_subscription_id",
    type: "varchar",
    length: 255,
    unique: true,
    nullable: true,
  })
  stripeSubscriptionId: string | null;

  /**
   * Stripe Subscription Schedule ID - stored alongside subscription ID per Stripe best practices
   * Used to modify subscriptions when a schedule is attached
   */
  @Index()
  @Column({
    name: "stripe_schedule_id",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  stripeScheduleId: string | null;

  @Column({
    name: "stripe_customer_id",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  stripeCustomerId: string | null;

  /**
   * Current/default payment method on file for this subscription
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
  cardLast4: string | null; // Last 4 digits of card

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

  @Index()
  @Column({
    name: "status",
    type: "enum",
    enum: SubscriptionStatus,
  })
  status: SubscriptionStatus;

  @Column({
    name: "current_period_start",
    type: "timestamp with time zone",
    nullable: true,
  })
  currentPeriodStart: Date | null;

  @Column({
    name: "current_period_end",
    type: "timestamp with time zone",
    nullable: true,
  })
  currentPeriodEnd: Date | null;

  @Column({
    name: "cancel_at_period_end",
    type: "boolean",
    default: false,
  })
  cancelAtPeriodEnd: boolean;

  @Column({
    name: "canceled_at",
    type: "timestamp with time zone",
    nullable: true,
  })
  canceledAt: Date | null;

  @Column({
    name: "trial_start",
    type: "timestamp with time zone",
    nullable: true,
  })
  trialStart: Date | null;

  @Column({
    name: "trial_end",
    type: "timestamp with time zone",
    nullable: true,
  })
  trialEnd: Date | null;

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

  @OneToMany(
    () => SubscriptionPayment,
    (payment) => payment.ownerGroupSubscription,
  )
  payments: SubscriptionPayment[];
}
