import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsActiveToUsers1700000000005 implements MigrationInterface {
  name = "AddIsActiveToUsers1700000000005";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT TRUE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "is_active";
    `);
  }
}

