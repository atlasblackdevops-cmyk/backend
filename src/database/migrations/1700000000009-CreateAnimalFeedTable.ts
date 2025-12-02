import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAnimalFeedTable1700000000009 implements MigrationInterface {
  name = "CreateAnimalFeedTable1700000000009";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "animal_feed" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "animal_id" UUID NOT NULL,
        "quantity" DECIMAL NOT NULL,
        "quantity_unit" VARCHAR NOT NULL,
        "feed_type" VARCHAR NOT NULL,
        "notes" TEXT NULL,
        "created_by" UUID NULL,
        "updated_by" UUID NULL,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "fk_animal_feed_animal" FOREIGN KEY ("animal_id")
          REFERENCES "animals" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_animal_feed_created_by" FOREIGN KEY ("created_by")
          REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "fk_animal_feed_updated_by" FOREIGN KEY ("updated_by")
          REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "animal_feed";
    `);
  }
}
