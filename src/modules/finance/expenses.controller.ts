import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from "@nestjs/common";
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
import { CreateExpenseDto } from "./dto/create-expense.dto";
import { ListExpensesDto } from "./dto/list-expenses.dto";
import { UpdateExpenseDto } from "./dto/update-expense.dto";
import { ExpensesService } from "./expenses.service";

@ApiTags("Finance - Expenses")
@ApiBearerAuth()
@Controller({ path: "finance/expenses", version: "1" })
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @ApiOperation({
    summary: "Create a new expense",
    description:
      "Creates a new expense record for the user's current farm. The farm ID is automatically retrieved from the user's token (currentFarm). Requires FINANCE:CREATE permission. Either categoryId or otherCategoryName must be provided.",
  })
  @ApiResponse({
    status: 201,
    description: "Expense created successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Expense created successfully",
        },
        data: {
          type: "object",
          properties: {
            expense: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                  example: "123e4567-e89b-12d3-a456-426614174000",
                },
                categoryId: {
                  type: "string",
                  format: "uuid",
                  nullable: true,
                  example: "123e4567-e89b-12d3-a456-426614174001",
                },
                otherCategoryName: {
                  type: "string",
                  nullable: true,
                  example: "Custom Category",
                },
                expenseDate: {
                  type: "string",
                  format: "date",
                  example: "2024-01-15",
                },
                amount: {
                  type: "number",
                  example: 150.5,
                },
                currencyType: {
                  type: "string",
                  example: "USD",
                },
                vendor: {
                  type: "string",
                  nullable: true,
                  example: "John's Farm Supply",
                },
                description: {
                  type: "string",
                  nullable: true,
                  example: "Purchase of seeds",
                },
                paymentMethod: {
                  type: "string",
                  nullable: true,
                  example: "Credit Card",
                },
                createdAt: {
                  type: "string",
                  format: "date-time",
                  example: "2024-01-15T10:30:00Z",
                },
                updatedAt: {
                  type: "string",
                  format: "date-time",
                  example: "2024-01-15T10:30:00Z",
                },
                farm: {
                  type: "object",
                  properties: {
                    id: {
                      type: "string",
                      format: "uuid",
                    },
                  },
                },
                category: {
                  type: "object",
                  nullable: true,
                  properties: {
                    id: {
                      type: "string",
                      format: "uuid",
                    },
                    categoryName: {
                      type: "string",
                      example: "Seeds",
                    },
                    slug: {
                      type: "string",
                      example: "seeds",
                    },
                  },
                },
                createdBy: {
                  type: "object",
                  nullable: true,
                  properties: {
                    id: {
                      type: "string",
                      format: "uuid",
                      example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    name: {
                      type: "string",
                      nullable: true,
                      example: "John Doe",
                    },
                  },
                },
                updatedBy: {
                  type: "object",
                  nullable: true,
                  properties: {
                    id: {
                      type: "string",
                      format: "uuid",
                      example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    name: {
                      type: "string",
                      nullable: true,
                      example: "John Doe",
                    },
                  },
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
    description: "Bad request - validation error or missing required fields",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Either categoryId or otherCategoryName must be provided",
        },
        errors: {
          type: "object",
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description:
      "Forbidden - User does not have FINANCE:CREATE permission or is not a member of the farm",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Permission denied: FINANCE:CREATE is required",
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Farm or expense category not found",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Farm not found",
        },
      },
    },
  })
  @RequirePermission({
    module: PermissionModule.FINANCE,
    action: PermissionAction.CREATE,
  })
  async createExpense(@AuthUser() user: any, @Body() dto: CreateExpenseDto) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.expensesService.createExpense(user.id, farmId, dto);
  }

  @Get()
  @ApiOperation({
    summary: "List expenses for the current farm",
    description:
      "Retrieves a paginated list of expenses for the user's current farm. The farm ID is automatically retrieved from the user's token (currentFarm). Supports filtering by category, expense date range, and vendor search. Requires FINANCE:LISTING permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Expenses fetched successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Expenses fetched successfully",
        },
        data: {
          type: "object",
          properties: {
            expenses: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: {
                    type: "string",
                    format: "uuid",
                  },
                  categoryId: {
                    type: "string",
                    format: "uuid",
                    nullable: true,
                  },
                  otherCategoryName: {
                    type: "string",
                    nullable: true,
                  },
                  expenseDate: {
                    type: "string",
                    format: "date",
                  },
                  amount: {
                    type: "number",
                  },
                  currencyType: {
                    type: "string",
                  },
                  vendor: {
                    type: "string",
                    nullable: true,
                  },
                  description: {
                    type: "string",
                    nullable: true,
                  },
                  paymentMethod: {
                    type: "string",
                    nullable: true,
                  },
                  createdAt: {
                    type: "string",
                    format: "date-time",
                  },
                  updatedAt: {
                    type: "string",
                    format: "date-time",
                  },
                  category: {
                    type: "object",
                    nullable: true,
                  },
                  createdBy: {
                    type: "object",
                    nullable: true,
                    properties: {
                      id: { type: "string", format: "uuid" },
                      name: { type: "string", nullable: true },
                    },
                  },
                  updatedBy: {
                    type: "object",
                    nullable: true,
                    properties: {
                      id: { type: "string", format: "uuid" },
                      name: { type: "string", nullable: true },
                    },
                  },
                },
              },
            },
            pagination: {
              type: "object",
              properties: {
                page: { type: "number", example: 1 },
                limit: { type: "number", example: 10 },
                total: { type: "number", example: 25 },
                totalPages: { type: "number", example: 3 },
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
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "User must have a current farm selected",
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description:
      "Forbidden - User does not have FINANCE:LISTING permission or is not a member of the farm",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Permission denied: FINANCE:LISTING is required",
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Farm not found",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Farm not found",
        },
      },
    },
  })
  @RequirePermission({
    module: PermissionModule.FINANCE,
    action: PermissionAction.LISTING,
  })
  async listExpenses(@AuthUser() user: any, @Query() query: ListExpensesDto) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.expensesService.listExpenses(farmId, query);
  }

  @Get(":expenseId")
  @ApiOperation({
    summary: "Get expense details by ID",
    description:
      "Retrieves detailed information about a specific expense by its ID. The expense must belong to the user's current farm. Requires FINANCE:READ permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Expense details fetched successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Expense details fetched successfully",
        },
        data: {
          type: "object",
          properties: {
            expense: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                },
                categoryId: {
                  type: "string",
                  format: "uuid",
                  nullable: true,
                },
                otherCategoryName: {
                  type: "string",
                  nullable: true,
                },
                expenseDate: {
                  type: "string",
                  format: "date",
                },
                amount: {
                  type: "number",
                },
                currencyType: {
                  type: "string",
                },
                vendor: {
                  type: "string",
                  nullable: true,
                },
                description: {
                  type: "string",
                  nullable: true,
                },
                paymentMethod: {
                  type: "string",
                  nullable: true,
                },
                createdAt: {
                  type: "string",
                  format: "date-time",
                },
                updatedAt: {
                  type: "string",
                  format: "date-time",
                },
                category: {
                  type: "object",
                  nullable: true,
                },
                createdBy: {
                  type: "object",
                  nullable: true,
                },
                updatedBy: {
                  type: "object",
                  nullable: true,
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description:
      "Forbidden - User does not have FINANCE:READ permission or expense does not belong to current farm",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Permission denied: FINANCE:READ is required",
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Expense not found",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Expense not found",
        },
      },
    },
  })
  @RequirePermission({
    module: PermissionModule.FINANCE,
    action: PermissionAction.READ,
  })
  async getExpenseDetails(
    @AuthUser() user: any,
    @Param("expenseId") expenseId: string,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.expensesService.getExpenseDetails(expenseId, user.id, farmId);
  }

  @Put(":expenseId")
  @ApiOperation({
    summary: "Update an expense",
    description:
      "Updates an existing expense record. The expense must belong to the user's current farm. All fields are optional. Requires FINANCE:UPDATE permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Expense updated successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Expense updated successfully",
        },
        data: {
          type: "object",
          properties: {
            expense: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                },
                categoryId: {
                  type: "string",
                  format: "uuid",
                  nullable: true,
                },
                otherCategoryName: {
                  type: "string",
                  nullable: true,
                },
                expenseDate: {
                  type: "string",
                  format: "date",
                },
                amount: {
                  type: "number",
                },
                currencyType: {
                  type: "string",
                },
                vendor: {
                  type: "string",
                  nullable: true,
                },
                description: {
                  type: "string",
                  nullable: true,
                },
                paymentMethod: {
                  type: "string",
                  nullable: true,
                },
                createdAt: {
                  type: "string",
                  format: "date-time",
                },
                updatedAt: {
                  type: "string",
                  format: "date-time",
                },
                category: {
                  type: "object",
                  nullable: true,
                },
                createdBy: {
                  type: "object",
                  nullable: true,
                },
                updatedBy: {
                  type: "object",
                  nullable: true,
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
    description: "Bad request - validation error",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Invalid expense date",
        },
        errors: {
          type: "object",
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description:
      "Forbidden - User does not have FINANCE:UPDATE permission or expense does not belong to current farm",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Permission denied: FINANCE:UPDATE is required",
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Expense or expense category not found",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Expense not found",
        },
      },
    },
  })
  @RequirePermission({
    module: PermissionModule.FINANCE,
    action: PermissionAction.UPDATE,
  })
  async updateExpense(
    @AuthUser() user: any,
    @Param("expenseId") expenseId: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.expensesService.updateExpense(expenseId, user.id, farmId, dto);
  }

  @Delete(":expenseId")
  @ApiOperation({
    summary: "Delete an expense (soft delete)",
    description:
      "Soft deletes an expense by setting the deletedAt timestamp. The expense must belong to the user's current farm. Requires FINANCE:DELETE permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Expense deleted successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Expense deleted successfully",
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description:
      "Forbidden - User does not have FINANCE:DELETE permission or expense does not belong to current farm",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Permission denied: FINANCE:DELETE is required",
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Expense not found",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Expense not found",
        },
      },
    },
  })
  @RequirePermission({
    module: PermissionModule.FINANCE,
    action: PermissionAction.DELETE,
  })
  async deleteExpense(
    @AuthUser() user: any,
    @Param("expenseId") expenseId: string,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.expensesService.deleteExpense(expenseId, user.id, farmId);
  }
}
