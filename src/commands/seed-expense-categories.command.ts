import { Logger } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { Command, CommandRunner } from "nest-commander";
import { DataSource } from "typeorm";
import { ExpenseCategory } from "../database/entities/expense-category.entity";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

@Command({
  name: "seed-expense-categories",
  description: "Seed expense categories data",
})
export class SeedExpenseCategoriesCommand extends CommandRunner {
  private readonly logger = new Logger(SeedExpenseCategoriesCommand.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    super();
  }

  async run(): Promise<void> {
    const categoryRepo = this.dataSource.getRepository(ExpenseCategory);

    const categoriesData = [
      { categoryName: "Seeds", description: "Seed purchases" },
      { categoryName: "Feed", description: "Animal feed and supplements" },
      {
        categoryName: "Fertilizer",
        description: "Fertilizers and soil amendments",
      },
      { categoryName: "Pesticides", description: "Pesticides and herbicides" },
      {
        categoryName: "Labor",
        description: "Employee wages and contractor payments",
      },
      { categoryName: "Fuel", description: "Fuel and energy costs" },
      {
        categoryName: "Equipment",
        description: "Equipment purchases and rentals",
      },
      {
        categoryName: "Maintenance",
        description: "Equipment and facility maintenance",
      },
      {
        categoryName: "Veterinary",
        description: "Veterinary services and medicines",
      },
      { categoryName: "Insurance", description: "Farm insurance premiums" },
      { categoryName: "Utilities", description: "Water, electricity, etc." },
      {
        categoryName: "Transportation",
        description: "Transportation and logistics",
      },
      { categoryName: "Other", description: "Miscellaneous expenses" },
    ];

    let createdCount = 0;
    let skippedCount = 0;

    for (const categoryData of categoriesData) {
      const existing = await categoryRepo.findOne({
        where: { categoryName: categoryData.categoryName },
      });

      if (existing) {
        skippedCount++;
        this.logger.log(
          `Category already exists: ${categoryData.categoryName}`,
        );
        continue;
      }

      const slug = generateSlug(categoryData.categoryName);
      const category = categoryRepo.create({
        categoryName: categoryData.categoryName,
        slug,
        description: categoryData.description,
        isActive: true,
      });

      await categoryRepo.save(category);
      createdCount++;
      this.logger.log(
        `Created category: ${categoryData.categoryName} (slug: ${slug})`,
      );
    }

    this.logger.log(
      `Expense categories seeding completed. Created: ${createdCount}, Skipped: ${skippedCount}`,
    );
  }
}
