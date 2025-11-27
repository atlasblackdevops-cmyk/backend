import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAnimalsTable1700000000007 implements MigrationInterface {
  name = "CreateAnimalsTable1700000000007";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "animals" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "farm_id" UUID NOT NULL,
        "name" VARCHAR NOT NULL,
        "species" VARCHAR NULL,
        "breed" VARCHAR NULL,
        "gender" VARCHAR NULL,
        "birthdate" DATE NULL,
        "photo" VARCHAR NULL,
        "created_by" UUID NULL,
        "updated_by" UUID NULL,
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "fk_animals_farm" FOREIGN KEY ("farm_id")
          REFERENCES "farms" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_animals_created_by" FOREIGN KEY ("created_by")
          REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "fk_animals_updated_by" FOREIGN KEY ("updated_by")
          REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "animals";
    `);
  }
}

