import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsActiveToFarms1700000000003 implements MigrationInterface {
  name = "AddIsActiveToFarms1700000000003";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "farms"
      ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT TRUE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "farms"
      DROP COLUMN IF EXISTS "is_active";
    `);
  }
}


