import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { RequirePermission } from "../../decorators/permission.decorator";
import { AuthUser } from "../../decorators/user.decorator";
import {
  PermissionAction,
  PermissionModule,
} from "../../enums/permission.enum";
import { DashboardService } from "./dashboard.service";
import { DashboardBreakdownDto } from "./dto/dashboard-breakdown.dto";
import { DashboardSummaryDto } from "./dto/dashboard-summary.dto";
import { DashboardTrendsDto } from "./dto/dashboard-trends.dto";

@ApiTags("Finance - Dashboard")
@ApiBearerAuth()
@Controller({ path: "finance/dashboard", version: "1" })
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("summary")
  @ApiOperation({
    summary: "Get profit dashboard summary",
    description:
      "Retrieves overview metrics including total revenue, total expenses, net profit, profit margin, and top metrics. Requires FINANCE:LISTING permission. Data is filtered by the user's current farm.",
  })
  @ApiResponse({
    status: 200,
    description: "Dashboard summary fetched successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Dashboard summary fetched successfully",
        },
        data: {
          type: "object",
          properties: {
            summary: {
              type: "object",
              properties: {
                totalRevenue: {
                  type: "number",
                  example: 50000.0,
                },
                totalExpenses: {
                  type: "number",
                  example: 35000.0,
                },
                netProfit: {
                  type: "number",
                  example: 15000.0,
                },
                profitMargin: {
                  type: "number",
                  example: 30.0,
                  description: "Profit margin percentage",
                },
                period: {
                  type: "string",
                  example: "2024-01-01 to 2024-12-31",
                },
                currency: {
                  type: "string",
                  example: "USD",
                },
              },
            },
            topMetrics: {
              type: "object",
              properties: {
                highestRevenueDay: {
                  type: "object",
                  nullable: true,
                  properties: {
                    date: {
                      type: "string",
                      format: "date",
                      example: "2024-06-15",
                    },
                    amount: {
                      type: "number",
                      example: 5000.0,
                    },
                  },
                },
                highestExpenseDay: {
                  type: "object",
                  nullable: true,
                  properties: {
                    date: {
                      type: "string",
                      format: "date",
                      example: "2024-03-20",
                    },
                    amount: {
                      type: "number",
                      example: 2500.0,
                    },
                  },
                },
                averageDailyProfit: {
                  type: "number",
                  example: 125.0,
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - User must have a current farm selected",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - User does not have FINANCE:LISTING permission",
  })
  @ApiResponse({
    status: 404,
    description: "Farm not found",
  })
  @RequirePermission({
    module: PermissionModule.FINANCE,
    action: PermissionAction.LISTING,
  })
  async getDashboardSummary(
    @AuthUser() user: any,
    @Query() query: DashboardSummaryDto,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.dashboardService.getDashboardSummary(farmId, query);
  }

  @Get("trends")
  @ApiOperation({
    summary: "Get profit dashboard trends",
    description:
      "Retrieves time-series data for profit, revenue, and expense trends grouped by day/week/month/year. Ideal for chart visualization. Requires FINANCE:LISTING permission. Data is filtered by the user's current farm.",
  })
  @ApiResponse({
    status: 200,
    description: "Dashboard trends fetched successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Dashboard trends fetched successfully",
        },
        data: {
          type: "object",
          properties: {
            trends: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  period: {
                    type: "string",
                    example: "2024-01",
                    description:
                      "Period identifier (format depends on groupBy)",
                  },
                  label: {
                    type: "string",
                    example: "January 2024",
                    description: "Human-readable period label",
                  },
                  revenue: {
                    type: "number",
                    example: 4200.0,
                  },
                  expenses: {
                    type: "number",
                    example: 2800.0,
                  },
                  profit: {
                    type: "number",
                    example: 1400.0,
                  },
                  profitMargin: {
                    type: "number",
                    example: 33.33,
                    description: "Profit margin percentage",
                  },
                },
              },
            },
            summary: {
              type: "object",
              properties: {
                totalPeriods: {
                  type: "number",
                  example: 12,
                },
                averageRevenue: {
                  type: "number",
                  example: 4166.67,
                },
                averageExpenses: {
                  type: "number",
                  example: 2916.67,
                },
                averageProfit: {
                  type: "number",
                  example: 1250.0,
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      "Bad request - Invalid date range or user must have a current farm selected",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - User does not have FINANCE:LISTING permission",
  })
  @ApiResponse({
    status: 404,
    description: "Farm not found",
  })
  @RequirePermission({
    module: PermissionModule.FINANCE,
    action: PermissionAction.LISTING,
  })
  async getDashboardTrends(
    @AuthUser() user: any,
    @Query() query: DashboardTrendsDto,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.dashboardService.getDashboardTrends(farmId, query);
  }

  @Get("breakdown")
  @ApiOperation({
    summary: "Get profit dashboard breakdown",
    description:
      "Retrieves detailed breakdown data including expense categories, top vendors, top buyers, revenue by product, payment methods, and recent transactions. Supports filtering by breakdown type. Requires FINANCE:LISTING permission. Data is filtered by the user's current farm.",
  })
  @ApiResponse({
    status: 200,
    description: "Dashboard breakdown fetched successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Dashboard breakdown fetched successfully",
        },
        data: {
          type: "object",
          properties: {
            expenseCategories: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  categoryId: {
                    type: "string",
                    format: "uuid",
                    nullable: true,
                  },
                  categoryName: {
                    type: "string",
                    example: "Seeds",
                  },
                  totalAmount: {
                    type: "number",
                    example: 5000.0,
                  },
                  percentage: {
                    type: "number",
                    example: 14.29,
                    description: "Percentage of total expenses",
                  },
                  transactionCount: {
                    type: "number",
                    example: 25,
                  },
                },
              },
            },
            topVendors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  vendor: {
                    type: "string",
                    example: "John's Farm Supply",
                  },
                  totalAmount: {
                    type: "number",
                    example: 3500.0,
                  },
                  transactionCount: {
                    type: "number",
                    example: 12,
                  },
                },
              },
            },
            topBuyers: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  buyerName: {
                    type: "string",
                    example: "ABC Market",
                  },
                  totalAmount: {
                    type: "number",
                    example: 8000.0,
                  },
                  transactionCount: {
                    type: "number",
                    example: 5,
                  },
                },
              },
            },
            revenueByProduct: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  productSold: {
                    type: "string",
                    example: "Wheat",
                  },
                  totalAmount: {
                    type: "number",
                    example: 12000.0,
                  },
                  totalQuantity: {
                    type: "number",
                    nullable: true,
                    example: 500,
                  },
                  unit: {
                    type: "string",
                    nullable: true,
                    example: "kg",
                  },
                },
              },
            },
            paymentMethods: {
              type: "object",
              properties: {
                expenses: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      method: {
                        type: "string",
                        example: "Credit Card",
                      },
                      totalAmount: {
                        type: "number",
                        example: 15000.0,
                      },
                      count: {
                        type: "number",
                        example: 45,
                      },
                    },
                  },
                },
                revenues: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      method: {
                        type: "string",
                        example: "Cash",
                      },
                      totalAmount: {
                        type: "number",
                        example: 20000.0,
                      },
                      count: {
                        type: "number",
                        example: 30,
                      },
                    },
                  },
                },
              },
            },
            recentTransactions: {
              type: "object",
              properties: {
                expenses: {
                  type: "array",
                  description: "Latest 5 expenses",
                },
                revenues: {
                  type: "array",
                  description: "Latest 5 revenues",
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - User must have a current farm selected",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - User does not have FINANCE:LISTING permission",
  })
  @ApiResponse({
    status: 404,
    description: "Farm not found",
  })
  @RequirePermission({
    module: PermissionModule.FINANCE,
    action: PermissionAction.LISTING,
  })
  async getDashboardBreakdown(
    @AuthUser() user: any,
    @Query() query: DashboardBreakdownDto,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.dashboardService.getDashboardBreakdown(farmId, query);
  }
}
