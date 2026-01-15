import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPlanInfoToSubscriptionPayments1700000000023
  implements MigrationInterface
{
  name = "AddPlanInfoToSubscriptionPayments1700000000023";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add plan info and period date fields to subscription_payments table
    await queryRunner.query(`
      ALTER TABLE "subscription_payments"
        ADD COLUMN IF NOT EXISTS "stripe_price_id" VARCHAR(255) NULL,
        ADD COLUMN IF NOT EXISTS "period_start" TIMESTAMP WITH TIME ZONE NULL,
        ADD COLUMN IF NOT EXISTS "period_end" TIMESTAMP WITH TIME ZONE NULL;
    `);

    // Add index on stripe_price_id for faster lookups by plan
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_subscription_payments_stripe_price_id" 
      ON "subscription_payments" ("stripe_price_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index first
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_subscription_payments_stripe_price_id";
    `);

    // Remove plan info and period date fields from subscription_payments table
    await queryRunner.query(`
      ALTER TABLE "subscription_payments"
        DROP COLUMN IF EXISTS "stripe_price_id",
        DROP COLUMN IF EXISTS "period_start",
        DROP COLUMN IF EXISTS "period_end";
    `);
  }
}
