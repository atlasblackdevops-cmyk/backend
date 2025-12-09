import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateHarvestsFertilizerIrrigationCropHealthTables1700000000014
  implements MigrationInterface
{
  name = "CreateHarvestsFertilizerIrrigationCropHealthTables1700000000014";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create harvests table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "harvests" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "field_id" UUID NOT NULL,
        "planting_record_id" UUID NULL,
        "harvest_date" DATE NULL,
        "crop_type" VARCHAR NULL,
        "yield_amount" DECIMAL NULL,
        "yield_unit" VARCHAR NULL,
        "notes" TEXT NULL,
        "created_by" UUID NULL,
        "updated_by" UUID NULL,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "fk_harvests_field" FOREIGN KEY ("field_id")
          REFERENCES "fields" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_harvests_planting_record" FOREIGN KEY ("planting_record_id")
          REFERENCES "planting_records" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "fk_harvests_created_by" FOREIGN KEY ("created_by")
          REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "fk_harvests_updated_by" FOREIGN KEY ("updated_by")
          REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    // Create fertilizer_records table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "fertilizer_records" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "field_id" UUID NOT NULL,
        "fertilizer_type" VARCHAR NULL,
        "quantity" DECIMAL NULL,
        "quantity_unit" VARCHAR NULL,
        "application_date" DATE NULL,
        "application_method" VARCHAR NULL,
        "notes" TEXT NULL,
        "cost" DECIMAL NULL,
        "created_by" UUID NULL,
        "updated_by" UUID NULL,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "fk_fertilizer_records_field" FOREIGN KEY ("field_id")
          REFERENCES "fields" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_fertilizer_records_created_by" FOREIGN KEY ("created_by")
          REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "fk_fertilizer_records_updated_by" FOREIGN KEY ("updated_by")
          REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    // Create irrigation_records table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "irrigation_records" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "field_id" UUID NOT NULL,
        "irrigation_date" DATE NULL,
        "water_volume" DECIMAL NULL,
        "volume_unit" VARCHAR NULL,
        "irrigation_method" VARCHAR NULL,
        "duration_minutes" INTEGER NULL,
        "cost" DECIMAL NULL,
        "notes" TEXT NULL,
        "created_by" UUID NULL,
        "updated_by" UUID NULL,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "fk_irrigation_records_field" FOREIGN KEY ("field_id")
          REFERENCES "fields" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_irrigation_records_created_by" FOREIGN KEY ("created_by")
          REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "fk_irrigation_records_updated_by" FOREIGN KEY ("updated_by")
          REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    // Create crop_health_notes table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "crop_health_notes" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "field_id" UUID NOT NULL,
        "note_date" DATE NULL,
        "noted_by" UUID NULL,
        "health_status" VARCHAR NULL,
        "description" TEXT NULL,
        "action_taken" TEXT NULL,
        "created_by" UUID NULL,
        "updated_by" UUID NULL,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "fk_crop_health_notes_field" FOREIGN KEY ("field_id")
          REFERENCES "fields" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_crop_health_notes_noted_by" FOREIGN KEY ("noted_by")
          REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "fk_crop_health_notes_created_by" FOREIGN KEY ("created_by")
          REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "fk_crop_health_notes_updated_by" FOREIGN KEY ("updated_by")
          REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    // Create crop_health_note_images table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "crop_health_note_images" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "crop_health_note_id" UUID NOT NULL,
        "image_key" VARCHAR(500) NOT NULL,
        "notes" TEXT NULL,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "fk_crop_health_note_images_crop_health_note" FOREIGN KEY ("crop_health_note_id")
          REFERENCES "crop_health_notes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    // Create indexes for better query performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_harvests_field_id" ON "harvests" ("field_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_harvests_planting_record_id" ON "harvests" ("planting_record_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_harvests_deleted_at" ON "harvests" ("deleted_at");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_fertilizer_records_field_id" ON "fertilizer_records" ("field_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_fertilizer_records_deleted_at" ON "fertilizer_records" ("deleted_at");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_irrigation_records_field_id" ON "irrigation_records" ("field_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_irrigation_records_deleted_at" ON "irrigation_records" ("deleted_at");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_crop_health_notes_field_id" ON "crop_health_notes" ("field_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_crop_health_notes_deleted_at" ON "crop_health_notes" ("deleted_at");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_crop_health_note_images_crop_health_note_id" ON "crop_health_note_images" ("crop_health_note_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_crop_health_note_images_deleted_at" ON "crop_health_note_images" ("deleted_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "crop_health_note_images";
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "crop_health_notes";
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "irrigation_records";
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "fertilizer_records";
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "harvests";
    `);
  }
}
