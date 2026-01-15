import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ExpenseCategory } from "../../database/entities/expense-category.entity";
import { Expense } from "../../database/entities/expense.entity";
import { Farm } from "../../database/entities/farm.entity";
import { Revenue } from "../../database/entities/revenue.entity";
import { User } from "../../database/entities/user.entity";
import { ExpenseCategoriesController } from "./expense-categories.controller";
import { ExpenseCategoriesService } from "./expense-categories.service";
import { ExpensesController } from "./expenses.controller";
import { ExpensesService } from "./expenses.service";
import { RevenuesController } from "./revenues.controller";
import { RevenuesService } from "./revenues.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([ExpenseCategory, Expense, Revenue, Farm, User]),
  ],
  controllers: [
    ExpenseCategoriesController,
    ExpensesController,
    RevenuesController,
  ],
  providers: [ExpenseCategoriesService, ExpensesService, RevenuesService],
})
export class FinanceModule {}
