import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUpdatedByAndIsActiveToFieldsAndPlantings1700000000015
  implements MigrationInterface
{
  name = "AddUpdatedByAndIsActiveToFieldsAndPlantings1700000000015";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // fields.updated_by (column)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'fields' AND column_name = 'updated_by'
        ) THEN
          ALTER TABLE "fields" ADD COLUMN "updated_by" UUID NULL;
        END IF;
      END$$;
    `);

    // fields.updated_by (FK)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'fk_fields_updated_by'
        ) THEN
          ALTER TABLE "fields"
          ADD CONSTRAINT "fk_fields_updated_by"
          FOREIGN KEY ("updated_by")
          REFERENCES "users" ("id")
          ON DELETE SET NULL
          ON UPDATE CASCADE;
        END IF;
      END$$;
    `);

    // planting_records.is_active
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'planting_records' AND column_name = 'is_active'
        ) THEN
          ALTER TABLE "planting_records"
          ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT TRUE;
        END IF;
      END$$;
    `);

    // planting_records.updated_by
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'planting_records' AND column_name = 'updated_by'
        ) THEN
          ALTER TABLE "planting_records" ADD COLUMN "updated_by" UUID NULL;
        END IF;
      END$$;
    `);

    // planting_records.updated_by FK
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'fk_planting_records_updated_by'
        ) THEN
          ALTER TABLE "planting_records"
          ADD CONSTRAINT "fk_planting_records_updated_by"
          FOREIGN KEY ("updated_by")
          REFERENCES "users" ("id")
          ON DELETE SET NULL
          ON UPDATE CASCADE;
        END IF;
      END$$;
    `);

    // Backfill defaults
    await queryRunner.query(`
      UPDATE "planting_records"
      SET "is_active" = TRUE
      WHERE "is_active" IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "planting_records"
      DROP CONSTRAINT IF EXISTS "fk_planting_records_updated_by";
    `);
    await queryRunner.query(`
      ALTER TABLE "fields"
      DROP CONSTRAINT IF EXISTS "fk_fields_updated_by";
    `);

    await queryRunner.query(`
      ALTER TABLE "planting_records"
      DROP COLUMN IF EXISTS "updated_by";
    `);
    await queryRunner.query(`
      ALTER TABLE "planting_records"
      DROP COLUMN IF EXISTS "is_active";
    `);
    await queryRunner.query(`
      ALTER TABLE "fields"
      DROP COLUMN IF EXISTS "updated_by";
    `);
  }
}
