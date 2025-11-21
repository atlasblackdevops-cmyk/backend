import { MigrationInterface, QueryRunner } from "typeorm";

export class AdjustRolesAndFarmMembers1700000000001
  implements MigrationInterface
{
  name = "AdjustRolesAndFarmMembers1700000000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create farm_members table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "farm_members" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" UUID NOT NULL,
        "farm_id" UUID NOT NULL,
        "role_id" UUID NOT NULL,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT "fk_farm_members_user" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_farm_members_farm" FOREIGN KEY ("farm_id") REFERENCES "farms" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_farm_members_role" FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "uq_farm_member_user_farm" UNIQUE ("user_id", "farm_id")
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "farm_members";
    `);
    // Optionally restore ADMIN/USER - skipping to avoid data confusion
  }
}
