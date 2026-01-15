import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStripeScheduleIdToSubscriptions1700000000025
  implements MigrationInterface
{
  name = "AddStripeScheduleIdToSubscriptions1700000000025";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add stripe_schedule_id field to owner_group_subscriptions table
    // This stores the Stripe Subscription Schedule ID alongside subscription ID per Stripe best practices
    await queryRunner.query(`
      ALTER TABLE "owner_group_subscriptions"
        ADD COLUMN IF NOT EXISTS "stripe_schedule_id" VARCHAR(255) NULL;
    `);

    // Add index on stripe_schedule_id for faster lookups
    // This is useful when querying subscriptions by schedule ID
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_owner_group_subscriptions_stripe_schedule_id" 
      ON "owner_group_subscriptions" ("stripe_schedule_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index first
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_owner_group_subscriptions_stripe_schedule_id";
    `);

    // Remove stripe_schedule_id field from owner_group_subscriptions table
    await queryRunner.query(`
      ALTER TABLE "owner_group_subscriptions"
        DROP COLUMN IF EXISTS "stripe_schedule_id";
    `);
  }
}


