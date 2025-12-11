import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSpeciesAndBreedIdsToAnimals1700000000018
  implements MigrationInterface
{
  name = "AddSpeciesAndBreedIdsToAnimals1700000000018";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add species_id column to animals table
    await queryRunner.query(`
      ALTER TABLE "animals"
      ADD COLUMN IF NOT EXISTS "species_id" UUID NULL;
    `);

    // Add breed_id column to animals table
    await queryRunner.query(`
      ALTER TABLE "animals"
      ADD COLUMN IF NOT EXISTS "breed_id" UUID NULL;
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "animals"
      ADD CONSTRAINT "fk_animals_species"
      FOREIGN KEY ("species_id")
      REFERENCES "species" ("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE "animals"
      ADD CONSTRAINT "fk_animals_breed"
      FOREIGN KEY ("breed_id")
      REFERENCES "breeds" ("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
    `);

    // Create indexes for better query performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_animals_species_id" ON "animals" ("species_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_animals_breed_id" ON "animals" ("breed_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_animals_breed_id";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_animals_species_id";
    `);

    await queryRunner.query(`
      ALTER TABLE "animals"
      DROP CONSTRAINT IF EXISTS "fk_animals_breed";
    `);

    await queryRunner.query(`
      ALTER TABLE "animals"
      DROP CONSTRAINT IF EXISTS "fk_animals_species";
    `);

    await queryRunner.query(`
      ALTER TABLE "animals"
      DROP COLUMN IF EXISTS "breed_id";
    `);

    await queryRunner.query(`
      ALTER TABLE "animals"
      DROP COLUMN IF EXISTS "species_id";
    `);
  }
}
