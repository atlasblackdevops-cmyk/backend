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
import { Revenue } from "../../database/entities/revenue.entity";
import {
  BreakdownType,
  DashboardBreakdownDto,
} from "./dto/dashboard-breakdown.dto";
import { DashboardSummaryDto, PeriodType } from "./dto/dashboard-summary.dto";
import { DashboardTrendsDto, GroupByType } from "./dto/dashboard-trends.dto";

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepo: Repository<Expense>,
    @InjectRepository(Revenue)
    private readonly revenueRepo: Repository<Revenue>,
    @InjectRepository(Farm)
    private readonly farmRepo: Repository<Farm>,
    @InjectRepository(ExpenseCategory)
    private readonly categoryRepo: Repository<ExpenseCategory>,
  ) {}

  async getDashboardSummary(farmId: string, dto: DashboardSummaryDto) {
    const farmExists = await this.farmRepo.exist({
      where: { id: farmId, deletedAt: null, isActive: true },
    });
    if (!farmExists) {
      throw new NotFoundException("Farm not found");
    }

    // Determine date range - normalize to start/end of day
    let dateFrom = dto.dateFrom
      ? new Date(dto.dateFrom)
      : this.getStartOfCurrentPeriod(dto.period || PeriodType.MONTHLY);
    let dateTo = dto.dateTo ? new Date(dto.dateTo) : new Date();

    // Normalize dates: dateFrom to start of day, dateTo to end of day
    dateFrom = this.normalizeDateToStartOfDay(dateFrom);
    dateTo = this.normalizeDateToEndOfDay(dateTo);

    // Build queries
    const expenseQuery = this.expenseRepo
      .createQueryBuilder("expense")
      .where("expense.farm.id = :farmId", { farmId })
      .andWhere("expense.deletedAt IS NULL")
      .andWhere("expense.expenseDate >= :dateFrom", { dateFrom })
      .andWhere("expense.expenseDate <= :dateTo", { dateTo });

    const revenueQuery = this.revenueRepo
      .createQueryBuilder("revenue")
      .where("revenue.farm.id = :farmId", { farmId })
      .andWhere("revenue.deletedAt IS NULL")
      .andWhere("revenue.revenueDate >= :dateFrom", { dateFrom })
      .andWhere("revenue.revenueDate <= :dateTo", { dateTo });

    // Apply currency filter if provided
    if (dto.currency) {
      expenseQuery.andWhere("expense.currencyType = :currency", {
        currency: dto.currency,
      });
      revenueQuery.andWhere("revenue.currencyType = :currency", {
        currency: dto.currency,
      });
    }

    // Calculate totals correctly
    const expensesResult = await expenseQuery
      .select("SUM(expense.amount)", "total")
      .getRawOne();
    const revenuesResult = await revenueQuery
      .select("SUM(revenue.amount)", "total")
      .getRawOne();

    const totalExpensesAmount = expensesResult?.total
      ? parseFloat(expensesResult.total)
      : 0;
    const totalRevenueAmount = revenuesResult?.total
      ? parseFloat(revenuesResult.total)
      : 0;

    const netProfit = totalRevenueAmount - totalExpensesAmount;
    const profitMargin =
      totalRevenueAmount > 0 ? (netProfit / totalRevenueAmount) * 100 : 0;

    // Get top metrics
    const highestRevenueResult = await revenueQuery
      .select("revenue.revenueDate", "date")
      .addSelect("SUM(revenue.amount)", "amount")
      .groupBy("revenue.revenueDate")
      .orderBy("SUM(revenue.amount)", "DESC")
      .limit(1)
      .getRawOne();

    const highestExpenseResult = await expenseQuery
      .select("expense.expenseDate", "date")
      .addSelect("SUM(expense.amount)", "amount")
      .groupBy("expense.expenseDate")
      .orderBy("SUM(expense.amount)", "DESC")
      .limit(1)
      .getRawOne();

    const daysDiff =
      Math.ceil(
        (dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24),
      ) || 1;
    const averageDailyProfit = netProfit / daysDiff;

    return {
      message: "Dashboard summary fetched successfully",
      data: {
        summary: {
          totalRevenue: totalRevenueAmount,
          totalExpenses: totalExpensesAmount,
          netProfit,
          profitMargin: Math.round(profitMargin * 100) / 100,
          period: `${dateFrom.toISOString().split("T")[0]} to ${dateTo.toISOString().split("T")[0]}`,
          currency: dto.currency || "all",
        },
        topMetrics: {
          highestRevenueDay: highestRevenueResult
            ? {
                date: highestRevenueResult.date,
                amount: parseFloat(highestRevenueResult.amount),
              }
            : null,
          highestExpenseDay: highestExpenseResult
            ? {
                date: highestExpenseResult.date,
                amount: parseFloat(highestExpenseResult.amount),
              }
            : null,
          averageDailyProfit: Math.round(averageDailyProfit * 100) / 100,
        },
      },
    };
  }

  async getDashboardTrends(farmId: string, dto: DashboardTrendsDto) {
    const farmExists = await this.farmRepo.exist({
      where: { id: farmId, deletedAt: null, isActive: true },
    });
    if (!farmExists) {
      throw new NotFoundException("Farm not found");
    }

    let dateFrom = new Date(dto.dateFrom);
    let dateTo = new Date(dto.dateTo);

    // Normalize dates: dateFrom to start of day, dateTo to end of day
    dateFrom = this.normalizeDateToStartOfDay(dateFrom);
    dateTo = this.normalizeDateToEndOfDay(dateTo);

    if (dateFrom > dateTo) {
      throw new BadRequestException("dateFrom must be before dateTo");
    }

    // Build base queries
    const expenseQuery = this.expenseRepo
      .createQueryBuilder("expense")
      .where("expense.farm.id = :farmId", { farmId })
      .andWhere("expense.deletedAt IS NULL")
      .andWhere("expense.expenseDate >= :dateFrom", { dateFrom })
      .andWhere("expense.expenseDate <= :dateTo", { dateTo });

    const revenueQuery = this.revenueRepo
      .createQueryBuilder("revenue")
      .where("revenue.farm.id = :farmId", { farmId })
      .andWhere("revenue.deletedAt IS NULL")
      .andWhere("revenue.revenueDate >= :dateFrom", { dateFrom })
      .andWhere("revenue.revenueDate <= :dateTo", { dateTo });

    if (dto.currency) {
      expenseQuery.andWhere("expense.currencyType = :currency", {
        currency: dto.currency,
      });
      revenueQuery.andWhere("revenue.currencyType = :currency", {
        currency: dto.currency,
      });
    }

    // Group by based on groupBy type
    let dateFormat: string;
    let dateLabelFormat: string;

    switch (dto.groupBy) {
      case GroupByType.DAY:
        dateFormat = "YYYY-MM-DD";
        dateLabelFormat = "DD Mon YYYY";
        break;
      case GroupByType.WEEK:
        dateFormat = "IYYY-IW"; // ISO year-week
        dateLabelFormat = 'YYYY "Week" IW';
        break;
      case GroupByType.MONTH:
        dateFormat = "YYYY-MM";
        dateLabelFormat = "Month YYYY";
        break;
      case GroupByType.YEAR:
        dateFormat = "YYYY";
        dateLabelFormat = "YYYY";
        break;
    }

    // Get expenses by period
    const expenseTrends = await expenseQuery
      .select(`to_char(expense.expenseDate, '${dateFormat}')`, "period")
      .addSelect(`to_char(expense.expenseDate, '${dateLabelFormat}')`, "label")
      .addSelect("SUM(expense.amount)", "expenses")
      .groupBy(`to_char(expense.expenseDate, '${dateFormat}')`)
      .addGroupBy(`to_char(expense.expenseDate, '${dateLabelFormat}')`)
      .orderBy("period", "ASC")
      .getRawMany();

    // Get revenues by period
    const revenueTrends = await revenueQuery
      .select(`to_char(revenue.revenueDate, '${dateFormat}')`, "period")
      .addSelect(`to_char(revenue.revenueDate, '${dateLabelFormat}')`, "label")
      .addSelect("SUM(revenue.amount)", "revenues")
      .groupBy(`to_char(revenue.revenueDate, '${dateFormat}')`)
      .addGroupBy(`to_char(revenue.revenueDate, '${dateLabelFormat}')`)
      .orderBy("period", "ASC")
      .getRawMany();

    // Merge trends
    const periodMap = new Map();

    expenseTrends.forEach((item) => {
      const period = item.period;
      if (!periodMap.has(period)) {
        periodMap.set(period, {
          period,
          label: item.label,
          revenue: 0,
          expenses: 0,
          profit: 0,
          profitMargin: 0,
        });
      }
      periodMap.get(period).expenses = parseFloat(item.expenses) || 0;
    });

    revenueTrends.forEach((item) => {
      const period = item.period;
      if (!periodMap.has(period)) {
        periodMap.set(period, {
          period,
          label: item.label,
          revenue: 0,
          expenses: 0,
          profit: 0,
          profitMargin: 0,
        });
      }
      periodMap.get(period).revenue = parseFloat(item.revenues) || 0;
    });

    // Calculate profit and profit margin for each period
    const trends = Array.from(periodMap.values()).map((item) => {
      const profit = item.revenue - item.expenses;
      const profitMargin = item.revenue > 0 ? (profit / item.revenue) * 100 : 0;
      return {
        period: item.period,
        label: item.label,
        revenue: Math.round(item.revenue * 100) / 100,
        expenses: Math.round(item.expenses * 100) / 100,
        profit: Math.round(profit * 100) / 100,
        profitMargin: Math.round(profitMargin * 100) / 100,
      };
    });

    // Calculate averages
    const totalPeriods = trends.length || 1;
    const averageRevenue =
      trends.reduce((sum, t) => sum + t.revenue, 0) / totalPeriods;
    const averageExpenses =
      trends.reduce((sum, t) => sum + t.expenses, 0) / totalPeriods;
    const averageProfit =
      trends.reduce((sum, t) => sum + t.profit, 0) / totalPeriods;

    return {
      message: "Dashboard trends fetched successfully",
      data: {
        trends,
        summary: {
          totalPeriods,
          averageRevenue: Math.round(averageRevenue * 100) / 100,
          averageExpenses: Math.round(averageExpenses * 100) / 100,
          averageProfit: Math.round(averageProfit * 100) / 100,
        },
      },
    };
  }

  async getDashboardBreakdown(farmId: string, dto: DashboardBreakdownDto) {
    const farmExists = await this.farmRepo.exist({
      where: { id: farmId, deletedAt: null, isActive: true },
    });
    if (!farmExists) {
      throw new NotFoundException("Farm not found");
    }

    let dateFrom = dto.dateFrom ? new Date(dto.dateFrom) : null;
    let dateTo = dto.dateTo ? new Date(dto.dateTo) : null;

    // Normalize dates: dateFrom to start of day, dateTo to end of day
    if (dateFrom) {
      dateFrom = this.normalizeDateToStartOfDay(dateFrom);
    }
    if (dateTo) {
      dateTo = this.normalizeDateToEndOfDay(dateTo);
    }
    const limit = dto.limit || 10;

    const result: any = {};

    // Expense Categories Breakdown
    if (
      dto.type === BreakdownType.ALL ||
      dto.type === BreakdownType.EXPENSE_CATEGORIES
    ) {
      const categoryQuery = this.expenseRepo
        .createQueryBuilder("expense")
        .leftJoin("expense.category", "category")
        .where("expense.farm.id = :farmId", { farmId })
        .andWhere("expense.deletedAt IS NULL");

      if (dateFrom && dateTo) {
        categoryQuery
          .andWhere("expense.expenseDate >= :dateFrom", { dateFrom })
          .andWhere("expense.expenseDate <= :dateTo", { dateTo });
      }

      if (dto.currency) {
        categoryQuery.andWhere("expense.currencyType = :currency", {
          currency: dto.currency,
        });
      }

      const categoryData = await categoryQuery
        .select("category.id", "categoryId")
        .addSelect("category.categoryName", "categoryName")
        .addSelect("COALESCE(SUM(expense.amount), 0)", "totalAmount")
        .addSelect("COUNT(expense.id)", "transactionCount")
        .groupBy("category.id")
        .addGroupBy("category.categoryName")
        .orderBy("COALESCE(SUM(expense.amount), 0)", "DESC")
        .limit(limit)
        .getRawMany();

      // Calculate total for percentage
      const totalExpenses = categoryData.reduce(
        (sum, cat) => sum + parseFloat(cat.totalAmount || 0),
        0,
      );

      result.expenseCategories = categoryData.map((cat) => ({
        categoryId: cat.categoryId,
        categoryName: cat.categoryName || "Uncategorized",
        totalAmount: Math.round(parseFloat(cat.totalAmount || 0) * 100) / 100,
        percentage:
          totalExpenses > 0
            ? Math.round(
                (parseFloat(cat.totalAmount || 0) / totalExpenses) * 10000,
              ) / 100
            : 0,
        transactionCount: parseInt(cat.transactionCount || 0),
      }));
    }

    // Top Vendors
    if (
      dto.type === BreakdownType.ALL ||
      dto.type === BreakdownType.TOP_VENDORS
    ) {
      const vendorQuery = this.expenseRepo
        .createQueryBuilder("expense")
        .where("expense.farm.id = :farmId", { farmId })
        .andWhere("expense.deletedAt IS NULL")
        .andWhere("expense.vendor IS NOT NULL");

      if (dateFrom && dateTo) {
        vendorQuery
          .andWhere("expense.expenseDate >= :dateFrom", { dateFrom })
          .andWhere("expense.expenseDate <= :dateTo", { dateTo });
      }

      if (dto.currency) {
        vendorQuery.andWhere("expense.currencyType = :currency", {
          currency: dto.currency,
        });
      }

      const vendorData = await vendorQuery
        .select("expense.vendor", "vendor")
        .addSelect("SUM(expense.amount)", "totalAmount")
        .addSelect("COUNT(expense.id)", "transactionCount")
        .groupBy("expense.vendor")
        .orderBy("SUM(expense.amount)", "DESC")
        .limit(limit)
        .getRawMany();

      result.topVendors = vendorData.map((v) => ({
        vendor: v.vendor,
        totalAmount: Math.round(parseFloat(v.totalAmount || 0) * 100) / 100,
        transactionCount: parseInt(v.transactionCount || 0),
      }));
    }

    // Top Buyers
    if (
      dto.type === BreakdownType.ALL ||
      dto.type === BreakdownType.TOP_BUYERS
    ) {
      const buyerQuery = this.revenueRepo
        .createQueryBuilder("revenue")
        .where("revenue.farm.id = :farmId", { farmId })
        .andWhere("revenue.deletedAt IS NULL")
        .andWhere("revenue.buyerName IS NOT NULL");

      if (dateFrom && dateTo) {
        buyerQuery
          .andWhere("revenue.revenueDate >= :dateFrom", { dateFrom })
          .andWhere("revenue.revenueDate <= :dateTo", { dateTo });
      }

      if (dto.currency) {
        buyerQuery.andWhere("revenue.currencyType = :currency", {
          currency: dto.currency,
        });
      }

      const buyerData = await buyerQuery
        .select("revenue.buyerName", "buyerName")
        .addSelect("SUM(revenue.amount)", "totalAmount")
        .addSelect("COUNT(revenue.id)", "transactionCount")
        .groupBy("revenue.buyerName")
        .orderBy("SUM(revenue.amount)", "DESC")
        .limit(limit)
        .getRawMany();

      result.topBuyers = buyerData.map((b) => ({
        buyerName: b.buyerName,
        totalAmount: Math.round(parseFloat(b.totalAmount || 0) * 100) / 100,
        transactionCount: parseInt(b.transactionCount || 0),
      }));
    }

    // Revenue by Product
    if (
      dto.type === BreakdownType.ALL ||
      dto.type === BreakdownType.REVENUE_BY_PRODUCT
    ) {
      const productQuery = this.revenueRepo
        .createQueryBuilder("revenue")
        .where("revenue.farm.id = :farmId", { farmId })
        .andWhere("revenue.deletedAt IS NULL")
        .andWhere("revenue.productSold IS NOT NULL");

      if (dateFrom && dateTo) {
        productQuery
          .andWhere("revenue.revenueDate >= :dateFrom", { dateFrom })
          .andWhere("revenue.revenueDate <= :dateTo", { dateTo });
      }

      if (dto.currency) {
        productQuery.andWhere("revenue.currencyType = :currency", {
          currency: dto.currency,
        });
      }

      const productData = await productQuery
        .select("revenue.productSold", "productSold")
        .addSelect("SUM(revenue.amount)", "totalAmount")
        .addSelect("SUM(revenue.quantity)", "totalQuantity")
        .addSelect("revenue.quantityUnit", "unit")
        .groupBy("revenue.productSold")
        .addGroupBy("revenue.quantityUnit")
        .orderBy("SUM(revenue.amount)", "DESC")
        .limit(limit)
        .getRawMany();

      result.revenueByProduct = productData.map((p) => ({
        productSold: p.productSold,
        totalAmount: Math.round(parseFloat(p.totalAmount || 0) * 100) / 100,
        totalQuantity: p.totalQuantity
          ? Math.round(parseFloat(p.totalQuantity) * 100) / 100
          : null,
        unit: p.unit || null,
      }));
    }

    // Payment Methods
    if (
      dto.type === BreakdownType.ALL ||
      dto.type === BreakdownType.PAYMENT_METHODS
    ) {
      const expensePaymentQuery = this.expenseRepo
        .createQueryBuilder("expense")
        .where("expense.farm.id = :farmId", { farmId })
        .andWhere("expense.deletedAt IS NULL")
        .andWhere("expense.paymentMethod IS NOT NULL");

      const revenuePaymentQuery = this.revenueRepo
        .createQueryBuilder("revenue")
        .where("revenue.farm.id = :farmId", { farmId })
        .andWhere("revenue.deletedAt IS NULL")
        .andWhere("revenue.paymentMethod IS NOT NULL");

      if (dateFrom && dateTo) {
        expensePaymentQuery
          .andWhere("expense.expenseDate >= :dateFrom", { dateFrom })
          .andWhere("expense.expenseDate <= :dateTo", { dateTo });
        revenuePaymentQuery
          .andWhere("revenue.revenueDate >= :dateFrom", { dateFrom })
          .andWhere("revenue.revenueDate <= :dateTo", { dateTo });
      }

      if (dto.currency) {
        expensePaymentQuery.andWhere("expense.currencyType = :currency", {
          currency: dto.currency,
        });
        revenuePaymentQuery.andWhere("revenue.currencyType = :currency", {
          currency: dto.currency,
        });
      }

      const expensePayments = await expensePaymentQuery
        .select("expense.paymentMethod", "method")
        .addSelect("SUM(expense.amount)", "totalAmount")
        .addSelect("COUNT(expense.id)", "count")
        .groupBy("expense.paymentMethod")
        .getRawMany();

      const revenuePayments = await revenuePaymentQuery
        .select("revenue.paymentMethod", "method")
        .addSelect("SUM(revenue.amount)", "totalAmount")
        .addSelect("COUNT(revenue.id)", "count")
        .groupBy("revenue.paymentMethod")
        .getRawMany();

      result.paymentMethods = {
        expenses: expensePayments.map((p) => ({
          method: p.method,
          totalAmount: Math.round(parseFloat(p.totalAmount || 0) * 100) / 100,
          count: parseInt(p.count || 0),
        })),
        revenues: revenuePayments.map((p) => ({
          method: p.method,
          totalAmount: Math.round(parseFloat(p.totalAmount || 0) * 100) / 100,
          count: parseInt(p.count || 0),
        })),
      };
    }

    // Recent Transactions
    if (
      dto.type === BreakdownType.ALL ||
      dto.type === BreakdownType.RECENT_TRANSACTIONS
    ) {
      const recentExpensesQuery = this.expenseRepo
        .createQueryBuilder("expense")
        .leftJoin("expense.category", "category")
        .leftJoin("expense.createdBy", "createdBy")
        .where("expense.farm.id = :farmId", { farmId })
        .andWhere("expense.deletedAt IS NULL")
        .addSelect(["createdBy.id", "createdBy.name"])
        .addSelect(["category.id", "category.categoryName"]);

      const recentRevenuesQuery = this.revenueRepo
        .createQueryBuilder("revenue")
        .leftJoin("revenue.createdBy", "createdBy")
        .where("revenue.farm.id = :farmId", { farmId })
        .andWhere("revenue.deletedAt IS NULL")
        .addSelect(["createdBy.id", "createdBy.name"]);

      if (dateFrom && dateTo) {
        recentExpensesQuery
          .andWhere("expense.expenseDate >= :dateFrom", { dateFrom })
          .andWhere("expense.expenseDate <= :dateTo", { dateTo });
        recentRevenuesQuery
          .andWhere("revenue.revenueDate >= :dateFrom", { dateFrom })
          .andWhere("revenue.revenueDate <= :dateTo", { dateTo });
      }

      if (dto.currency) {
        recentExpensesQuery.andWhere("expense.currencyType = :currency", {
          currency: dto.currency,
        });
        recentRevenuesQuery.andWhere("revenue.currencyType = :currency", {
          currency: dto.currency,
        });
      }

      const recentExpenses = await recentExpensesQuery
        .orderBy("expense.expenseDate", "DESC")
        .addOrderBy("expense.createdAt", "DESC")
        .limit(5)
        .getMany();

      const recentRevenues = await recentRevenuesQuery
        .orderBy("revenue.revenueDate", "DESC")
        .addOrderBy("revenue.createdAt", "DESC")
        .limit(5)
        .getMany();

      result.recentTransactions = {
        expenses: recentExpenses,
        revenues: recentRevenues,
      };
    }

    return {
      message: "Dashboard breakdown fetched successfully",
      data: result,
    };
  }

  private getStartOfCurrentPeriod(period: PeriodType): Date {
    const now = new Date();
    const start = new Date();

    switch (period) {
      case PeriodType.DAILY:
        start.setHours(0, 0, 0, 0);
        break;
      case PeriodType.WEEKLY:
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff);
        start.setHours(0, 0, 0, 0);
        break;
      case PeriodType.MONTHLY:
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
      case PeriodType.YEARLY:
        start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
        break;
    }

    return start;
  }

  /**
   * Normalize date to start of day (00:00:00.000)
   */
  private normalizeDateToStartOfDay(date: Date): Date {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }

  /**
   * Normalize date to end of day (23:59:59.999)
   */
  private normalizeDateToEndOfDay(date: Date): Date {
    const normalized = new Date(date);
    normalized.setHours(23, 59, 59, 999);
    return normalized;
  }
}
