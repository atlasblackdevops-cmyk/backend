import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePermissionsAndUserPermissions1700000000002
  implements MigrationInterface
{
  name = "CreatePermissionsAndUserPermissions1700000000002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create permissions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "permissions" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "module" VARCHAR NOT NULL,
        "action" VARCHAR NOT NULL,
        "description" TEXT NULL,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT "uq_permission_module_action" UNIQUE ("module", "action")
      );
    `);

    // Create index on module for faster lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_permissions_module" ON "permissions" ("module");
    `);

    // Create index on action for faster lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_permissions_action" ON "permissions" ("action");
    `);

    // Create user_permissions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_permissions" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" UUID NOT NULL,
        "farm_id" UUID NOT NULL,
        "permission_id" UUID NOT NULL,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT "fk_user_permissions_user" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_user_permissions_farm" FOREIGN KEY ("farm_id") REFERENCES "farms" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_user_permissions_permission" FOREIGN KEY ("permission_id") REFERENCES "permissions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "uq_user_permission_user_farm_permission" UNIQUE ("user_id", "farm_id", "permission_id")
      );
    `);

    // Create role_permissions table (for future use)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "role_permissions" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "role_id" UUID NOT NULL,
        "permission_id" UUID NOT NULL,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT "fk_role_permissions_role" FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_role_permissions_permission" FOREIGN KEY ("permission_id") REFERENCES "permissions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "uq_role_permission_role_permission" UNIQUE ("role_id", "permission_id")
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "role_permissions";
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "user_permissions";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_permissions_action";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_permissions_module";
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "permissions";
    `);
  }
}
