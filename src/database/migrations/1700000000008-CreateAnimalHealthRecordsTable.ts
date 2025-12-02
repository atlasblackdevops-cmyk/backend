import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAnimalHealthRecordsTable1700000000008
  implements MigrationInterface
{
  name = "CreateAnimalHealthRecordsTable1700000000008";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "animal_health_records" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "animal_id" UUID NOT NULL,
        "record_type" VARCHAR NOT NULL,
        "name" VARCHAR NOT NULL,
        "cost" DECIMAL NULL,
        "next_due_date" DATE NULL,
        "description" TEXT NULL,
        "created_by" UUID NULL,
        "updated_by" UUID NULL,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "fk_animal_health_records_animal" FOREIGN KEY ("animal_id")
          REFERENCES "animals" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_animal_health_records_created_by" FOREIGN KEY ("created_by")
          REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "fk_animal_health_records_updated_by" FOREIGN KEY ("updated_by")
          REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "animal_health_records";
    `);
  }
}
