import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPaymentMethodFieldsToSubscriptions1700000000022
  implements MigrationInterface
{
  name = "AddPaymentMethodFieldsToSubscriptions1700000000022";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add payment method fields to owner_group_subscriptions table
    await queryRunner.query(`
      ALTER TABLE "owner_group_subscriptions"
        ADD COLUMN IF NOT EXISTS "stripe_payment_method_id" VARCHAR(255) NULL,
        ADD COLUMN IF NOT EXISTS "card_brand" VARCHAR(50) NULL,
        ADD COLUMN IF NOT EXISTS "card_last4" VARCHAR(4) NULL,
        ADD COLUMN IF NOT EXISTS "card_exp_month" SMALLINT NULL,
        ADD COLUMN IF NOT EXISTS "card_exp_year" SMALLINT NULL;
    `);

    // Add payment method fields to subscription_payments table
    await queryRunner.query(`
      ALTER TABLE "subscription_payments"
        ADD COLUMN IF NOT EXISTS "stripe_payment_method_id" VARCHAR(255) NULL,
        ADD COLUMN IF NOT EXISTS "card_brand" VARCHAR(50) NULL,
        ADD COLUMN IF NOT EXISTS "card_last4" VARCHAR(4) NULL,
        ADD COLUMN IF NOT EXISTS "card_exp_month" SMALLINT NULL,
        ADD COLUMN IF NOT EXISTS "card_exp_year" SMALLINT NULL;
    `);

    // Add index on stripe_payment_method_id for owner_group_subscriptions (optional, for faster lookups)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_owner_group_subscriptions_stripe_payment_method_id" 
      ON "owner_group_subscriptions" ("stripe_payment_method_id");
    `);

    // Add index on stripe_payment_method_id for subscription_payments (optional, for faster lookups)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_subscription_payments_stripe_payment_method_id" 
      ON "subscription_payments" ("stripe_payment_method_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_subscription_payments_stripe_payment_method_id";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_owner_group_subscriptions_stripe_payment_method_id";
    `);

    // Remove payment method fields from subscription_payments table
    await queryRunner.query(`
      ALTER TABLE "subscription_payments"
        DROP COLUMN IF EXISTS "stripe_payment_method_id",
        DROP COLUMN IF EXISTS "card_brand",
        DROP COLUMN IF EXISTS "card_last4",
        DROP COLUMN IF EXISTS "card_exp_month",
        DROP COLUMN IF EXISTS "card_exp_year";
    `);

    // Remove payment method fields from owner_group_subscriptions table
    await queryRunner.query(`
      ALTER TABLE "owner_group_subscriptions"
        DROP COLUMN IF EXISTS "stripe_payment_method_id",
        DROP COLUMN IF EXISTS "card_brand",
        DROP COLUMN IF EXISTS "card_last4",
        DROP COLUMN IF EXISTS "card_exp_month",
        DROP COLUMN IF EXISTS "card_exp_year";
    `);
  }
}
