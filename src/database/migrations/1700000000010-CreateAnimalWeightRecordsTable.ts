import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAnimalWeightRecordsTable1700000000010
  implements MigrationInterface
{
  name = "CreateAnimalWeightRecordsTable1700000000010";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "animal_weight_records" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "animal_id" UUID NOT NULL,
        "measured_at" TIMESTAMPTZ NOT NULL,
        "weight" DECIMAL NOT NULL,
        "weight_unit" VARCHAR NOT NULL,
        "notes" TEXT NULL,
        "created_by" UUID NULL,
        "updated_by" UUID NULL,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "fk_animal_weight_records_animal" FOREIGN KEY ("animal_id")
          REFERENCES "animals" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_animal_weight_records_created_by" FOREIGN KEY ("created_by")
          REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "fk_animal_weight_records_updated_by" FOREIGN KEY ("updated_by")
          REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "animal_weight_records";
    `);
  }
}
