import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFarmCodeToFarms1700000000004 implements MigrationInterface {
  name = "AddFarmCodeToFarms1700000000004";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "farms"
      ADD COLUMN IF NOT EXISTS "farm_code" VARCHAR(12);
    `);

    await queryRunner.query(`
      UPDATE "farms"
      SET "farm_code" = SUBSTRING(UPPER(md5(random()::text || clock_timestamp()::text)), 1, 12)
      WHERE "farm_code" IS NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "farms"
      ALTER COLUMN "farm_code" SET NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "farms"
      ADD CONSTRAINT "UQ_farms_farm_code" UNIQUE ("farm_code");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "farms"
      DROP CONSTRAINT IF EXISTS "UQ_farms_farm_code";
    `);

    await queryRunner.query(`
      ALTER TABLE "farms"
      DROP COLUMN IF EXISTS "farm_code";
    `);
  }
}


