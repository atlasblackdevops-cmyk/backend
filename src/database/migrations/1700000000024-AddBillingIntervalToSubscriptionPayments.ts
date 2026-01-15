import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBillingIntervalToSubscriptionPayments1700000000024
  implements MigrationInterface
{
  name = "AddBillingIntervalToSubscriptionPayments1700000000024";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add billing interval fields to subscription_payments table
    await queryRunner.query(`
      ALTER TABLE "subscription_payments"
        ADD COLUMN IF NOT EXISTS "billing_interval" VARCHAR(20) NULL,
        ADD COLUMN IF NOT EXISTS "billing_interval_count" SMALLINT NULL;
    `);

    // Add index on billing_interval for faster lookups by interval type
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_subscription_payments_billing_interval" 
      ON "subscription_payments" ("billing_interval");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index first
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_subscription_payments_billing_interval";
    `);

    // Remove billing interval fields from subscription_payments table
    await queryRunner.query(`
      ALTER TABLE "subscription_payments"
        DROP COLUMN IF EXISTS "billing_interval",
        DROP COLUMN IF EXISTS "billing_interval_count";
    `);
  }
}

