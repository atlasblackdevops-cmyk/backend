import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveOldSpeciesBreedColumns1700000000019
  implements MigrationInterface
{
  name = "RemoveOldSpeciesBreedColumns1700000000019";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop old species and breed string columns from animals table
    await queryRunner.query(`
      ALTER TABLE "animals"
      DROP COLUMN IF EXISTS "species";
    `);

    await queryRunner.query(`
      ALTER TABLE "animals"
      DROP COLUMN IF EXISTS "breed";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add columns if rollback is needed
    await queryRunner.query(`
      ALTER TABLE "animals"
      ADD COLUMN IF NOT EXISTS "species" VARCHAR NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "animals"
      ADD COLUMN IF NOT EXISTS "breed" VARCHAR NULL;
    `);
  }
}
