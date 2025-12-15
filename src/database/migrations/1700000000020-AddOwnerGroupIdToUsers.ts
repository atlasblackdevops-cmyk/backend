import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOwnerGroupIdToUsers1700000000020 implements MigrationInterface {
  name = "AddOwnerGroupIdToUsers1700000000020";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "owner_group_id" UUID NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_users_owner_group_id" 
      ON "users" ("owner_group_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_users_owner_group_id";
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "owner_group_id";
    `);
  }
}
