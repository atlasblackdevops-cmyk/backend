import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ExpenseCategory } from "../../database/entities/expense-category.entity";

@Injectable()
export class ExpenseCategoriesService {
  constructor(
    @InjectRepository(ExpenseCategory)
    private readonly categoryRepo: Repository<ExpenseCategory>,
  ) {}

  async listCategories() {
    const categories = await this.categoryRepo.find({
      where: { deletedAt: null, isActive: true },
      order: { categoryName: "ASC" },
    });

    return {
      message: "Expense categories fetched successfully",
      data: {
        categories,
      },
    };
  }
}
