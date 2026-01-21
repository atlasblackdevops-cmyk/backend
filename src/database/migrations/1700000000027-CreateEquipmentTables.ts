import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateEquipmentTables1700000000027 implements MigrationInterface {
  name = "CreateEquipmentTables1700000000027";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create equipment table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "equipment" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "farm_id" UUID NOT NULL,
        "equipment_name" VARCHAR(255) NOT NULL,
        "equipment_type" VARCHAR(100) NULL,
        "brand" VARCHAR(100) NULL,
        "model" VARCHAR(100) NULL,
        "serial_number" VARCHAR(100) NULL,
        "purchase_date" DATE NULL,
        "purchase_cost" DECIMAL(10, 2) NULL,
        "photo" TEXT NULL,
        "status" VARCHAR(100) NOT NULL DEFAULT 'operational',
        "notes" TEXT NULL,
        "last_service_at" DATE NULL,
        "created_by" UUID NULL,
        "updated_by" UUID NULL,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "fk_equipment_farm" FOREIGN KEY ("farm_id")
          REFERENCES "farms" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_equipment_created_by" FOREIGN KEY ("created_by")
          REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "fk_equipment_updated_by" FOREIGN KEY ("updated_by")
          REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    // Create equipment_maintenance table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "equipment_maintenance" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "equipment_id" UUID NOT NULL,
        "maintenance_date" DATE NOT NULL,
        "maintenance_type" VARCHAR(100) NOT NULL,
        "description" TEXT NOT NULL,
        "cost" DECIMAL(10, 2) NULL,
        "performed_by" VARCHAR(255) NULL,
        "next_maintenance_date" DATE NULL,
        "notes" TEXT NULL,
        "created_by" UUID NULL,
        "updated_by" UUID NULL,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "fk_equipment_maintenance_equipment" FOREIGN KEY ("equipment_id")
          REFERENCES "equipment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_equipment_maintenance_created_by" FOREIGN KEY ("created_by")
          REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "fk_equipment_maintenance_updated_by" FOREIGN KEY ("updated_by")
          REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    // Create indexes for better query performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_equipment_farm_id" ON "equipment" ("farm_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_equipment_status" ON "equipment" ("status");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_equipment_equipment_type" ON "equipment" ("equipment_type");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_equipment_deleted_at" ON "equipment" ("deleted_at");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_equipment_maintenance_equipment_id" ON "equipment_maintenance" ("equipment_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_equipment_maintenance_maintenance_date" ON "equipment_maintenance" ("maintenance_date");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_equipment_maintenance_maintenance_type" ON "equipment_maintenance" ("maintenance_type");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_equipment_maintenance_deleted_at" ON "equipment_maintenance" ("deleted_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "equipment_maintenance";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "equipment";`);
  }
}
