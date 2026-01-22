import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMarketplaceListingsTables1700000000028
  implements MigrationInterface
{
  name = "CreateMarketplaceListingsTables1700000000028";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create marketplace_listings table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "marketplace_listings" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "farm_id" UUID NOT NULL,
        "seller_id" UUID NOT NULL,
        "title" VARCHAR(255) NOT NULL,
        "description" TEXT NULL,
        "category" VARCHAR(50) NOT NULL DEFAULT 'other',
        "price" DECIMAL(10, 2) NOT NULL,
        "quantity_available" DECIMAL(10, 2) NOT NULL DEFAULT 0,
        "quantity_unit" VARCHAR(50) NULL,
        "city" VARCHAR NULL,
        "state" VARCHAR NULL,
        "country" VARCHAR NULL,
        "shipping_available" BOOLEAN NOT NULL DEFAULT false,
        "status" VARCHAR(50) NOT NULL DEFAULT 'active',
        "created_by" UUID NULL,
        "updated_by" UUID NULL,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "fk_marketplace_listings_farm" FOREIGN KEY ("farm_id")
          REFERENCES "farms" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_marketplace_listings_seller" FOREIGN KEY ("seller_id")
          REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_marketplace_listings_created_by" FOREIGN KEY ("created_by")
          REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "fk_marketplace_listings_updated_by" FOREIGN KEY ("updated_by")
          REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    // Create marketplace_listing_images table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "marketplace_listing_images" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "listing_id" UUID NOT NULL,
        "image_key" VARCHAR(500) NOT NULL,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "fk_marketplace_listing_images_listing" FOREIGN KEY ("listing_id")
          REFERENCES "marketplace_listings" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    // Create indexes for better query performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_marketplace_listings_farm_id" ON "marketplace_listings" ("farm_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_marketplace_listings_seller_id" ON "marketplace_listings" ("seller_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_marketplace_listings_category" ON "marketplace_listings" ("category");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_marketplace_listings_status" ON "marketplace_listings" ("status");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_marketplace_listings_deleted_at" ON "marketplace_listings" ("deleted_at");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_marketplace_listing_images_listing_id" ON "marketplace_listing_images" ("listing_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_marketplace_listing_images_deleted_at" ON "marketplace_listing_images" ("deleted_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "marketplace_listing_images";
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "marketplace_listings";
    `);
  }
}
