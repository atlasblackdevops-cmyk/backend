import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateFieldsAndPlantingRecordsTables1700000000013
  implements MigrationInterface
{
  name = "CreateFieldsAndPlantingRecordsTables1700000000013";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create fields table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "fields" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "farm_id" UUID NOT NULL,
        "field_name" VARCHAR NOT NULL,
        "field_size" DECIMAL NULL,
        "size_unit" VARCHAR NULL,
        "soil_type" VARCHAR NULL,
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "notes" TEXT NULL,
        "created_by" UUID NULL,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "fk_fields_farm" FOREIGN KEY ("farm_id")
          REFERENCES "farms" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_fields_created_by" FOREIGN KEY ("created_by")
          REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    // Create planting_records table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "planting_records" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "field_id" UUID NOT NULL,
        "crop_name" VARCHAR NOT NULL,
        "seed_type" VARCHAR NULL,
        "planting_date" DATE NULL,
        "expected_harvest_date" DATE NULL,
        "quantity_planted" DECIMAL NULL,
        "quantity_unit" VARCHAR NULL,
        "seed_cost" DECIMAL NULL,
        "area" DECIMAL NULL,
        "unit" VARCHAR NULL,
        "notes" TEXT NULL,
        "created_by" UUID NULL,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "fk_planting_records_field" FOREIGN KEY ("field_id")
          REFERENCES "fields" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_planting_records_created_by" FOREIGN KEY ("created_by")
          REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    // Create indexes for better query performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_fields_farm_id" ON "fields" ("farm_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_fields_deleted_at" ON "fields" ("deleted_at");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_planting_records_field_id" ON "planting_records" ("field_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_planting_records_deleted_at" ON "planting_records" ("deleted_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "planting_records";
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "fields";
    `);
  }
}
