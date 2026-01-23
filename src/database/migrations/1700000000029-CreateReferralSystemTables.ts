import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateReferralSystemTables1700000000029
  implements MigrationInterface
{
  name = "CreateReferralSystemTables1700000000029";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new columns to users table
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "total_referral_points" INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "available_referral_points" INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "referral_code_generated_at" TIMESTAMPTZ NULL;
    `);

    // Add unique constraint on referral_code (allows NULL for now)
    // After running the backfill script, we'll make it NOT NULL
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_referral_code_unique" 
      ON "users" ("referral_code")
      WHERE "referral_code" IS NOT NULL;
    `);

    // Add index on referred_by for faster lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_users_referred_by" 
      ON "users" ("referred_by");
    `);

    // Create referrals table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "referrals" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "referred_by" UUID NOT NULL,
        "referred_to" UUID NOT NULL,
        "referral_code" VARCHAR(255) NOT NULL,
        "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
        "points_awarded" INTEGER NOT NULL DEFAULT 0,
        "points_awarded_at" TIMESTAMPTZ NULL,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "unique_referral_user" UNIQUE ("referred_to"),
        CONSTRAINT "fk_referred_by" FOREIGN KEY ("referred_by")
          REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_referred_to" FOREIGN KEY ("referred_to")
          REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    // Create indexes for referrals table
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_referrals_referred_by" 
      ON "referrals" ("referred_by");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_referrals_referred_to" 
      ON "referrals" ("referred_to");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_referrals_status" 
      ON "referrals" ("status");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_referrals_created_at" 
      ON "referrals" ("created_at");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_referrals_deleted_at" 
      ON "referrals" ("deleted_at");
    `);

    // Create referral_points_transactions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "referral_points_transactions" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" UUID NOT NULL,
        "referral_id" UUID NULL,
        "transaction_type" VARCHAR(50) NOT NULL,
        "points" INTEGER NOT NULL,
        "description" TEXT NULL,
        "metadata" JSONB NULL,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT "fk_points_transactions_user" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_points_transactions_referral" FOREIGN KEY ("referral_id")
          REFERENCES "referrals" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    // Create indexes for referral_points_transactions table
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_points_transactions_user_id" 
      ON "referral_points_transactions" ("user_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_points_transactions_type" 
      ON "referral_points_transactions" ("transaction_type");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_points_transactions_created_at" 
      ON "referral_points_transactions" ("created_at");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_points_transactions_referral_id" 
      ON "referral_points_transactions" ("referral_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop referral_points_transactions table
    await queryRunner.query(`
      DROP TABLE IF EXISTS "referral_points_transactions";
    `);

    // Drop referrals table
    await queryRunner.query(`
      DROP TABLE IF EXISTS "referrals";
    `);

    // Remove indexes from users table
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_users_referred_by";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_users_referral_code_unique";
    `);

    // Drop unique index on referral_code
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_users_referral_code_unique";
    `);

    // Remove new columns from users table
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "referral_code_generated_at",
      DROP COLUMN IF EXISTS "available_referral_points",
      DROP COLUMN IF EXISTS "total_referral_points";
    `);
  }
}
