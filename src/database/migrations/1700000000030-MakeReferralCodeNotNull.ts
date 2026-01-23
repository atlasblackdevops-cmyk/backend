import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeReferralCodeNotNull1700000000030
  implements MigrationInterface
{
  name = "MakeReferralCodeNotNull1700000000030";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verify all users have referral codes before making it NOT NULL
    const usersWithoutCodes = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM users
      WHERE referral_code IS NULL
      AND deleted_at IS NULL;
    `);

    const count = parseInt(usersWithoutCodes[0].count);

    if (count > 0) {
      throw new Error(
        `Cannot make referral_code NOT NULL: ${count} users still don't have referral codes. Please run the generate-referral-codes script first.`,
      );
    }

    // Drop the partial unique index (with WHERE clause)
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_users_referral_code_unique";
    `);

    // Make referral_code NOT NULL
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "referral_code" SET NOT NULL;
    `);

    // Create full unique index (no WHERE clause, since NULL is not allowed)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_referral_code_unique" 
      ON "users" ("referral_code");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the full unique index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_users_referral_code_unique";
    `);

    // Make referral_code nullable again
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "referral_code" DROP NOT NULL;
    `);

    // Recreate partial unique index (allows NULL)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_referral_code_unique" 
      ON "users" ("referral_code")
      WHERE "referral_code" IS NOT NULL;
    `);
  }
}
