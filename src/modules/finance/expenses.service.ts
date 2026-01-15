import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ExpenseCategory } from "../../database/entities/expense-category.entity";
import { Expense } from "../../database/entities/expense.entity";
import { Farm } from "../../database/entities/farm.entity";
import { User } from "../../database/entities/user.entity";
import { CreateExpenseDto } from "./dto/create-expense.dto";
import { ListExpensesDto } from "./dto/list-expenses.dto";
import { UpdateExpenseDto } from "./dto/update-expense.dto";

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepo: Repository<Expense>,
    @InjectRepository(ExpenseCategory)
    private readonly categoryRepo: Repository<ExpenseCategory>,
    @InjectRepository(Farm)
    private readonly farmRepo: Repository<Farm>,
  ) {}

  async createExpense(userId: string, farmId: string, dto: CreateExpenseDto) {
    // Check farm exists
    const farm = await this.farmRepo.findOne({
      where: { id: farmId, deletedAt: null, isActive: true },
    });

    if (!farm) {
      throw new NotFoundException("Farm not found");
    }

    // Validate category if provided
    let category: ExpenseCategory | null = null;
    if (dto.categoryId) {
      category = await this.categoryRepo.findOne({
        where: { id: dto.categoryId, deletedAt: null, isActive: true },
      });

      if (!category) {
        throw new NotFoundException("Expense category not found");
      }
    }

    // If no categoryId, otherCategoryName should be provided
    if (!dto.categoryId && !dto.otherCategoryName) {
      throw new BadRequestException(
        "Either categoryId or otherCategoryName must be provided",
      );
    }

    // Parse expense date
    const expenseDate = new Date(dto.expenseDate);
    if (Number.isNaN(expenseDate.getTime())) {
      throw new BadRequestException("Invalid expense date");
    }

    const actor = { id: userId } as User;

    const expense = this.expenseRepo.create({
      farm,
      category,
      otherCategoryName: dto.otherCategoryName ?? null,
      expenseDate,
      amount: dto.amount,
      currencyType: dto.currencyType,
      vendor: dto.vendor ?? null,
      description: dto.description ?? null,
      paymentMethod: dto.paymentMethod ?? null,
      createdBy: actor,
      updatedBy: actor,
    });

    await this.expenseRepo.save(expense);

    const createdExpense = await this.expenseRepo
      .createQueryBuilder("expense")
      .leftJoinAndSelect("expense.farm", "farm")
      .leftJoinAndSelect("expense.category", "category")
      .leftJoin("expense.createdBy", "createdBy")
      .leftJoin("expense.updatedBy", "updatedBy")
      .addSelect(["createdBy.id", "createdBy.name"])
      .addSelect(["updatedBy.id", "updatedBy.name"])
      .where("expense.id = :id", { id: expense.id })
      .getOne();

    return {
      message: "Expense created successfully",
      data: {
        expense: createdExpense,
      },
    };
  }

  async listExpenses(farmId: string, query: ListExpensesDto) {
    const farmExists = await this.farmRepo.exist({
      where: { id: farmId, deletedAt: null, isActive: true },
    });
    if (!farmExists) {
      throw new NotFoundException("Farm not found");
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const qb = this.expenseRepo
      .createQueryBuilder("expense")
      .leftJoinAndSelect("expense.farm", "farm")
      .leftJoinAndSelect("expense.category", "category")
      .leftJoin("expense.createdBy", "createdBy")
      .leftJoin("expense.updatedBy", "updatedBy")
      .addSelect(["createdBy.id", "createdBy.name"])
      .addSelect(["updatedBy.id", "updatedBy.name"])
      .where("farm.id = :farmId", { farmId })
      .andWhere("expense.deletedAt IS NULL")
      .orderBy("expense.expenseDate", "DESC");

    // Filter by category
    if (query.categoryId) {
      qb.andWhere("expense.category.id = :categoryId", {
        categoryId: query.categoryId,
      });
    }

    // Filter by expense date range
    if (query.expenseDateFrom) {
      qb.andWhere("expense.expenseDate >= :expenseDateFrom", {
        expenseDateFrom: query.expenseDateFrom,
      });
    }

    if (query.expenseDateTo) {
      qb.andWhere("expense.expenseDate <= :expenseDateTo", {
        expenseDateTo: query.expenseDateTo,
      });
    }

    // Search by vendor
    if (query.search) {
      qb.andWhere("expense.vendor ILIKE :search", {
        search: `%${query.search}%`,
      });
    }

    const total = await qb.getCount();
    const expenses = await qb.skip(skip).take(limit).getMany();

    return {
      message: "Expenses fetched successfully",
      data: {
        expenses,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async getExpenseDetails(expenseId: string, userId: string, farmId: string) {
    const expense = await this.expenseRepo
      .createQueryBuilder("expense")
      .leftJoinAndSelect("expense.farm", "farm")
      .leftJoinAndSelect("expense.category", "category")
      .leftJoin("expense.createdBy", "createdBy")
      .leftJoin("expense.updatedBy", "updatedBy")
      .addSelect(["createdBy.id", "createdBy.name"])
      .addSelect(["updatedBy.id", "updatedBy.name"])
      .where("expense.id = :expenseId", { expenseId })
      .andWhere("expense.deletedAt IS NULL")
      .andWhere("farm.id = :farmId", { farmId })
      .getOne();

    if (!expense) {
      throw new NotFoundException("Expense not found");
    }

    return {
      message: "Expense details fetched successfully",
      data: {
        expense,
      },
    };
  }

  async updateExpense(
    expenseId: string,
    userId: string,
    farmId: string,
    dto: UpdateExpenseDto,
  ) {
    const expense = await this.expenseRepo.findOne({
      where: {
        id: expenseId,
        deletedAt: null,
        farm: { id: farmId },
      },
      relations: ["category"],
    });

    if (!expense) {
      throw new NotFoundException("Expense not found");
    }

    // Update category if provided
    if (dto.categoryId !== undefined) {
      if (dto.categoryId) {
        const category = await this.categoryRepo.findOne({
          where: { id: dto.categoryId, deletedAt: null, isActive: true },
        });

        if (!category) {
          throw new NotFoundException("Expense category not found");
        }
        expense.category = category;
        expense.otherCategoryName = null;
      } else {
        expense.category = null;
      }
    }

    // Update other fields
    if (dto.otherCategoryName !== undefined) {
      expense.otherCategoryName = dto.otherCategoryName ?? null;
      if (dto.otherCategoryName) {
        expense.category = null;
      }
    }

    if (dto.expenseDate !== undefined) {
      const expenseDate = new Date(dto.expenseDate);
      if (Number.isNaN(expenseDate.getTime())) {
        throw new BadRequestException("Invalid expense date");
      }
      expense.expenseDate = expenseDate;
    }

    if (dto.amount !== undefined) {
      expense.amount = dto.amount;
    }

    if (dto.currencyType !== undefined) {
      expense.currencyType = dto.currencyType;
    }

    if (dto.vendor !== undefined) {
      expense.vendor = dto.vendor ?? null;
    }

    if (dto.description !== undefined) {
      expense.description = dto.description ?? null;
    }

    if (dto.paymentMethod !== undefined) {
      expense.paymentMethod = dto.paymentMethod ?? null;
    }

    const actor = { id: userId } as User;
    expense.updatedBy = actor;

    await this.expenseRepo.save(expense);

    const updatedExpense = await this.expenseRepo
      .createQueryBuilder("expense")
      .leftJoinAndSelect("expense.farm", "farm")
      .leftJoinAndSelect("expense.category", "category")
      .leftJoin("expense.createdBy", "createdBy")
      .leftJoin("expense.updatedBy", "updatedBy")
      .addSelect(["createdBy.id", "createdBy.name"])
      .addSelect(["updatedBy.id", "updatedBy.name"])
      .where("expense.id = :id", { id: expense.id })
      .getOne();

    return {
      message: "Expense updated successfully",
      data: {
        expense: updatedExpense,
      },
    };
  }

  async deleteExpense(expenseId: string, userId: string, farmId: string) {
    const expense = await this.expenseRepo.findOne({
      where: {
        id: expenseId,
        deletedAt: null,
        farm: { id: farmId },
      },
    });

    if (!expense) {
      throw new NotFoundException("Expense not found");
    }

    expense.deletedAt = new Date();
    await this.expenseRepo.save(expense);

    return {
      message: "Expense deleted successfully",
    };
  }
}
