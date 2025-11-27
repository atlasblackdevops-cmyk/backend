import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFarmLogoToFarms1700000000006 implements MigrationInterface {
  name = "AddFarmLogoToFarms1700000000006";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "farms"
      ADD COLUMN IF NOT EXISTS "farm_logo" VARCHAR NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "farms"
      DROP COLUMN IF EXISTS "farm_logo";
    `);
  }
}
