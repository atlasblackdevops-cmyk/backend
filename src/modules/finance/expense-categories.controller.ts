import { Controller, Get } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { RequirePermission } from "../../decorators/permission.decorator";
import {
  PermissionAction,
  PermissionModule,
} from "../../enums/permission.enum";
import { ExpenseCategoriesService } from "./expense-categories.service";

@ApiTags("Finance - Expense Categories")
@ApiBearerAuth()
@Controller({ path: "finance/expense-categories", version: "1" })
export class ExpenseCategoriesController {
  constructor(
    private readonly expenseCategoriesService: ExpenseCategoriesService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "List all active expense categories",
    description:
      "Retrieves a list of all active expense categories. Requires FINANCE:LISTING permission.",
  })
  @RequirePermission({
    module: PermissionModule.FINANCE,
    action: PermissionAction.LISTING,
  })
  @ApiResponse({
    status: 200,
    description: "Expense categories fetched successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Expense categories fetched successfully",
        },
        data: {
          type: "object",
          properties: {
            categories: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: {
                    type: "string",
                    format: "uuid",
                    example: "123e4567-e89b-12d3-a456-426614174000",
                  },
                  categoryName: {
                    type: "string",
                    example: "Seeds",
                  },
                  slug: {
                    type: "string",
                    example: "seeds",
                  },
                  description: {
                    type: "string",
                    example: "Seed purchases",
                    nullable: true,
                  },
                  isActive: {
                    type: "boolean",
                    example: true,
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
                },
              },
            },
          },
        },
      },
    },
  })
  async listCategories() {
    return this.expenseCategoriesService.listCategories();
  }
}
