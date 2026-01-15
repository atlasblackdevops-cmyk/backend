import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSubscriptionTables1700000000021
  implements MigrationInterface
{
  name = "CreateSubscriptionTables1700000000021";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create owner_group_subscriptions table
    await queryRunner.query(`
      CREATE TYPE "subscription_status_enum" AS ENUM (
        'ACTIVE', 
        'CANCELED', 
        'PAST_DUE', 
        'UNPAID', 
        'TRIALING', 
        'INCOMPLETE', 
        'INCOMPLETE_EXPIRED'
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "owner_group_subscriptions" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "owner_group_id" UUID NOT NULL,
        "owner_id" UUID NOT NULL,
        "stripe_price_id" VARCHAR(255) NOT NULL,
        "stripe_subscription_id" VARCHAR(255) UNIQUE NULL,
        "stripe_customer_id" VARCHAR(255) NULL,
        "status" subscription_status_enum NOT NULL,
        "current_period_start" TIMESTAMPTZ NULL,
        "current_period_end" TIMESTAMPTZ NULL,
        "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT FALSE,
        "canceled_at" TIMESTAMPTZ NULL,
        "trial_start" TIMESTAMPTZ NULL,
        "trial_end" TIMESTAMPTZ NULL,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "fk_owner_group_subscriptions_owner" 
          FOREIGN KEY ("owner_id") REFERENCES "users" ("id") 
          ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_owner_group_subscriptions_owner_group_id" 
      ON "owner_group_subscriptions" ("owner_group_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_owner_group_subscriptions_owner_id" 
      ON "owner_group_subscriptions" ("owner_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_owner_group_subscriptions_status" 
      ON "owner_group_subscriptions" ("status");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_owner_group_subscriptions_stripe_subscription_id" 
      ON "owner_group_subscriptions" ("stripe_subscription_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_owner_group_subscriptions_stripe_price_id" 
      ON "owner_group_subscriptions" ("stripe_price_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_owner_group_subscriptions_active" 
      ON "owner_group_subscriptions" ("owner_group_id", "status") 
      WHERE "status" = 'ACTIVE' AND "deleted_at" IS NULL;
    `);

    // Create subscription_payments table
    await queryRunner.query(`
      CREATE TYPE "payment_status_enum" AS ENUM (
        'SUCCEEDED', 
        'PENDING', 
        'FAILED', 
        'REFUNDED'
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "subscription_payments" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "owner_group_subscription_id" UUID NOT NULL,
        "stripe_payment_intent_id" VARCHAR(255) NOT NULL UNIQUE,
        "stripe_invoice_id" VARCHAR(255) NULL,
        "amount" DECIMAL(10, 2) NOT NULL,
        "currency" VARCHAR(3) NOT NULL DEFAULT 'usd',
        "status" payment_status_enum NOT NULL,
        "paid_at" TIMESTAMPTZ NULL,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT "fk_subscription_payments_subscription" 
          FOREIGN KEY ("owner_group_subscription_id") REFERENCES "owner_group_subscriptions" ("id") 
          ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_subscription_payments_owner_group_subscription_id" 
      ON "subscription_payments" ("owner_group_subscription_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_subscription_payments_status" 
      ON "subscription_payments" ("status");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "subscription_payments";
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "payment_status_enum";
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "owner_group_subscriptions";
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "subscription_status_enum";
    `);
  }
}
