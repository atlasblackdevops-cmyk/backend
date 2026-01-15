import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateExpenseAndRevenueTables1700000000026
  implements MigrationInterface
{
  name = "CreateExpenseAndRevenueTables1700000000026";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create expense_categories table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "expense_categories" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "category_name" VARCHAR(255) NOT NULL UNIQUE,
        "slug" VARCHAR NOT NULL UNIQUE,
        "description" TEXT NULL,
        "is_active" BOOLEAN DEFAULT true,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL
      );
    `);

    // Create expenses table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "expenses" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "farm_id" UUID NOT NULL,
        "category_id" UUID NULL,
        "other_category_name" VARCHAR(255) NULL,
        "expense_date" DATE NOT NULL,
        "amount" DECIMAL(10, 2) NOT NULL,
        "currency_type" VARCHAR(3) NOT NULL,
        "vendor" VARCHAR(255) NULL,
        "description" TEXT NULL,
        "payment_method" VARCHAR(255) NULL,
        "created_by" UUID NULL,
        "updated_by" UUID NULL,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "fk_expenses_farm" FOREIGN KEY ("farm_id")
          REFERENCES "farms" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_expenses_category" FOREIGN KEY ("category_id")
          REFERENCES "expense_categories" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "fk_expenses_created_by" FOREIGN KEY ("created_by")
          REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "fk_expenses_updated_by" FOREIGN KEY ("updated_by")
          REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    // Create revenues table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "revenues" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "farm_id" UUID NOT NULL,
        "revenue_date" DATE NOT NULL,
        "amount" DECIMAL(10, 2) NOT NULL,
        "currency_type" VARCHAR(3) NOT NULL,
        "buyer_name" VARCHAR(255) NULL,
        "product_sold" VARCHAR(255) NULL,
        "quantity" DECIMAL(10, 2) NULL,
        "quantity_unit" VARCHAR(50) NULL,
        "payment_method" VARCHAR(255) NULL,
        "notes" TEXT NULL,
        "created_by" UUID NULL,
        "updated_by" UUID NULL,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "fk_revenues_farm" FOREIGN KEY ("farm_id")
          REFERENCES "farms" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_revenues_created_by" FOREIGN KEY ("created_by")
          REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "fk_revenues_updated_by" FOREIGN KEY ("updated_by")
          REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    // Create indexes for better query performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_expense_categories_slug" ON "expense_categories" ("slug");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_expense_categories_is_active" ON "expense_categories" ("is_active");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_expense_categories_deleted_at" ON "expense_categories" ("deleted_at");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_expenses_farm_id" ON "expenses" ("farm_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_expenses_category_id" ON "expenses" ("category_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_expenses_expense_date" ON "expenses" ("expense_date");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_expenses_deleted_at" ON "expenses" ("deleted_at");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_revenues_farm_id" ON "revenues" ("farm_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_revenues_revenue_date" ON "revenues" ("revenue_date");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_revenues_deleted_at" ON "revenues" ("deleted_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "revenues";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "expenses";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "expense_categories";`);
  }
}
