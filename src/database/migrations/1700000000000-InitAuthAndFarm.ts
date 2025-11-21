import { MigrationInterface, QueryRunner } from "typeorm";

export class InitAuthAndFarm1700000000000 implements MigrationInterface {
  name = "InitAuthAndFarm1700000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "roles" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "role_name" VARCHAR NOT NULL UNIQUE,
        "created_at" TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "email" VARCHAR NOT NULL UNIQUE,
        "password" VARCHAR NOT NULL,
        "current_farm" UUID NULL,
        "role_id" UUID NOT NULL,
        "referral_code" VARCHAR NULL,
        "referred_by" UUID NULL,
        "email_verified" BOOLEAN NOT NULL DEFAULT FALSE,
        "is_invited" BOOLEAN NOT NULL DEFAULT FALSE,
        "google_sub" VARCHAR NULL UNIQUE,
        "mobile" VARCHAR NULL,
        "name" VARCHAR NULL,
        "profile_picture" VARCHAR NULL,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "fk_users_role" FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "fk_users_referred_by" FOREIGN KEY ("referred_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "farms" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "farm_name" VARCHAR NOT NULL,
        "owner_id" UUID NOT NULL,
        "city" VARCHAR NULL,
        "state" VARCHAR NULL,
        "country" VARCHAR NULL,
        "address" VARCHAR NULL,
        "latitude" DECIMAL NULL,
        "longitude" DECIMAL NULL,
        "total_area" DECIMAL NULL,
        "area_unit" VARCHAR NULL,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "fk_farms_owner" FOREIGN KEY ("owner_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "fk_users_current_farm"
      FOREIGN KEY ("current_farm") REFERENCES "farms" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
    `);

    await queryRunner.query(`
      INSERT INTO "roles" ("role_name")
      VALUES ('SUPER_ADMIN'), ('OWNER'), ('MANAGER'), ('USER')
      ON CONFLICT ("role_name") DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "fk_users_current_farm";
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS "farms";
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS "users";
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS "roles";
    `);
  }
}
