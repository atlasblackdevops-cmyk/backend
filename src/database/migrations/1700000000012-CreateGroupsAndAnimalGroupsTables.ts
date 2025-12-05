import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateGroupsAndAnimalGroupsTables1700000000012
  implements MigrationInterface
{
  name = "CreateGroupsAndAnimalGroupsTables1700000000012";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create groups table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "groups" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" VARCHAR NOT NULL,
        "description" TEXT NULL,
        "farm_id" UUID NOT NULL,
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "created_by" UUID NULL,
        "updated_by" UUID NULL,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "fk_groups_farm" FOREIGN KEY ("farm_id")
          REFERENCES "farms" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_groups_created_by" FOREIGN KEY ("created_by")
          REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "fk_groups_updated_by" FOREIGN KEY ("updated_by")
          REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    // Create animal_groups table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "animal_groups" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "farm_id" UUID NOT NULL,
        "animal_id" UUID NOT NULL,
        "group_id" UUID NOT NULL,
        "created_by" UUID NULL,
        "updated_by" UUID NULL,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "fk_animal_groups_farm" FOREIGN KEY ("farm_id")
          REFERENCES "farms" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_animal_groups_animal" FOREIGN KEY ("animal_id")
          REFERENCES "animals" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_animal_groups_group" FOREIGN KEY ("group_id")
          REFERENCES "groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_animal_groups_created_by" FOREIGN KEY ("created_by")
          REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "fk_animal_groups_updated_by" FOREIGN KEY ("updated_by")
          REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    // Create indexes for better query performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_groups_farm_id" ON "groups" ("farm_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_groups_deleted_at" ON "groups" ("deleted_at");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_animal_groups_farm_id" ON "animal_groups" ("farm_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_animal_groups_animal_id" ON "animal_groups" ("animal_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_animal_groups_group_id" ON "animal_groups" ("group_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_animal_groups_deleted_at" ON "animal_groups" ("deleted_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "animal_groups";
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "groups";
    `);
  }
}
