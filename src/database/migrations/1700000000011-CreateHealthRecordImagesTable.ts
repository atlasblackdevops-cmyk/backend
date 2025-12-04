import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateHealthRecordImagesTable1700000000011
  implements MigrationInterface
{
  name = "CreateHealthRecordImagesTable1700000000011";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "health_record_images" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "health_record_id" UUID NOT NULL,
        "image_key" VARCHAR(500) NOT NULL,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "fk_health_record_images_health_record" FOREIGN KEY ("health_record_id")
          REFERENCES "animal_health_records" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_health_record_images_health_record_id" 
      ON "health_record_images" ("health_record_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_health_record_images_deleted_at" 
      ON "health_record_images" ("deleted_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "health_record_images";
    `);
  }
}
