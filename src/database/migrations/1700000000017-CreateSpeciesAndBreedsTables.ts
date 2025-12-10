import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSpeciesAndBreedsTables1700000000017
  implements MigrationInterface
{
  name = "CreateSpeciesAndBreedsTables1700000000017";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create species table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "species" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" VARCHAR NOT NULL UNIQUE,
        "slug" VARCHAR NOT NULL UNIQUE,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL
      );
    `);

    // Create breeds table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "breeds" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" VARCHAR NOT NULL,
        "slug" VARCHAR NOT NULL,
        "species_id" UUID NOT NULL,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "fk_breeds_species" FOREIGN KEY ("species_id")
          REFERENCES "species" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "uq_breeds_slug_species" UNIQUE ("slug", "species_id")
      );
    `);

    // Create indexes for better query performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_breeds_species_id" ON "breeds" ("species_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_species_slug" ON "species" ("slug");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_breeds_slug" ON "breeds" ("slug");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "breeds";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "species";`);
  }
}
