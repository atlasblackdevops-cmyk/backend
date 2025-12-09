import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPlantingRecordIdToIrrigationRecords1700000000016
  implements MigrationInterface
{
  name = "AddPlantingRecordIdToIrrigationRecords1700000000016";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add planting_record_id column to irrigation_records table
    await queryRunner.query(`
      ALTER TABLE "irrigation_records"
      ADD COLUMN IF NOT EXISTS "planting_record_id" UUID NULL;
    `);

    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "irrigation_records"
      ADD CONSTRAINT "fk_irrigation_records_planting_record"
      FOREIGN KEY ("planting_record_id")
      REFERENCES "planting_records" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
    `);

    // Create index for better query performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_irrigation_records_planting_record_id"
      ON "irrigation_records" ("planting_record_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_irrigation_records_planting_record_id";
    `);

    // Drop foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "irrigation_records"
      DROP CONSTRAINT IF EXISTS "fk_irrigation_records_planting_record";
    `);

    // Drop column
    await queryRunner.query(`
      ALTER TABLE "irrigation_records"
      DROP COLUMN IF EXISTS "planting_record_id";
    `);
  }
}
