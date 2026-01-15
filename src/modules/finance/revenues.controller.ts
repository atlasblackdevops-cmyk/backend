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
import { CreateRevenueDto } from "./dto/create-revenue.dto";
import { ListRevenuesDto } from "./dto/list-revenues.dto";
import { UpdateRevenueDto } from "./dto/update-revenue.dto";
import { RevenuesService } from "./revenues.service";

@ApiTags("Finance - Revenues")
@ApiBearerAuth()
@Controller({ path: "finance/revenues", version: "1" })
export class RevenuesController {
  constructor(private readonly revenuesService: RevenuesService) {}

  @Post()
  @ApiOperation({
    summary: "Create a new revenue",
    description:
      "Creates a new revenue record for the user's current farm. The farm ID is automatically retrieved from the user's token (currentFarm). Requires FINANCE:CREATE permission.",
  })
  @ApiResponse({
    status: 201,
    description: "Revenue created successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Revenue created successfully",
        },
        data: {
          type: "object",
          properties: {
            revenue: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                  example: "123e4567-e89b-12d3-a456-426614174000",
                },
                revenueDate: {
                  type: "string",
                  format: "date",
                  example: "2024-01-15",
                },
                amount: {
                  type: "number",
                  example: 500.75,
                },
                currencyType: {
                  type: "string",
                  example: "USD",
                },
                buyerName: {
                  type: "string",
                  nullable: true,
                  example: "ABC Market",
                },
                productSold: {
                  type: "string",
                  nullable: true,
                  example: "Wheat",
                },
                quantity: {
                  type: "number",
                  nullable: true,
                  example: 100,
                },
                quantityUnit: {
                  type: "string",
                  nullable: true,
                  example: "kg",
                },
                paymentMethod: {
                  type: "string",
                  nullable: true,
                  example: "Cash",
                },
                notes: {
                  type: "string",
                  nullable: true,
                  example: "Bulk order",
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
          example: "Revenue date is required",
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
    action: PermissionAction.CREATE,
  })
  async createRevenue(@AuthUser() user: any, @Body() dto: CreateRevenueDto) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.revenuesService.createRevenue(user.id, farmId, dto);
  }

  @Get()
  @ApiOperation({
    summary: "List revenues for the current farm",
    description:
      "Retrieves a paginated list of revenues for the user's current farm. The farm ID is automatically retrieved from the user's token (currentFarm). Supports filtering by revenue date range and search by buyer name or product sold. Requires FINANCE:LISTING permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Revenues fetched successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Revenues fetched successfully",
        },
        data: {
          type: "object",
          properties: {
            revenues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: {
                    type: "string",
                    format: "uuid",
                  },
                  revenueDate: {
                    type: "string",
                    format: "date",
                  },
                  amount: {
                    type: "number",
                  },
                  currencyType: {
                    type: "string",
                  },
                  buyerName: {
                    type: "string",
                    nullable: true,
                  },
                  productSold: {
                    type: "string",
                    nullable: true,
                  },
                  quantity: {
                    type: "number",
                    nullable: true,
                  },
                  quantityUnit: {
                    type: "string",
                    nullable: true,
                  },
                  paymentMethod: {
                    type: "string",
                    nullable: true,
                  },
                  notes: {
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
  async listRevenues(@AuthUser() user: any, @Query() query: ListRevenuesDto) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.revenuesService.listRevenues(farmId, query);
  }

  @Get(":revenueId")
  @ApiOperation({
    summary: "Get revenue details by ID",
    description:
      "Retrieves detailed information about a specific revenue by its ID. The revenue must belong to the user's current farm. Requires FINANCE:READ permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Revenue details fetched successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Revenue details fetched successfully",
        },
        data: {
          type: "object",
          properties: {
            revenue: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                },
                revenueDate: {
                  type: "string",
                  format: "date",
                },
                amount: {
                  type: "number",
                },
                currencyType: {
                  type: "string",
                },
                buyerName: {
                  type: "string",
                  nullable: true,
                },
                productSold: {
                  type: "string",
                  nullable: true,
                },
                quantity: {
                  type: "number",
                  nullable: true,
                },
                quantityUnit: {
                  type: "string",
                  nullable: true,
                },
                paymentMethod: {
                  type: "string",
                  nullable: true,
                },
                notes: {
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
      "Forbidden - User does not have FINANCE:READ permission or revenue does not belong to current farm",
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
    description: "Revenue not found",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Revenue not found",
        },
      },
    },
  })
  @RequirePermission({
    module: PermissionModule.FINANCE,
    action: PermissionAction.READ,
  })
  async getRevenueDetails(
    @AuthUser() user: any,
    @Param("revenueId") revenueId: string,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.revenuesService.getRevenueDetails(revenueId, user.id, farmId);
  }

  @Put(":revenueId")
  @ApiOperation({
    summary: "Update a revenue",
    description:
      "Updates an existing revenue record. The revenue must belong to the user's current farm. All fields are optional. Requires FINANCE:UPDATE permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Revenue updated successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Revenue updated successfully",
        },
        data: {
          type: "object",
          properties: {
            revenue: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                },
                revenueDate: {
                  type: "string",
                  format: "date",
                },
                amount: {
                  type: "number",
                },
                currencyType: {
                  type: "string",
                },
                buyerName: {
                  type: "string",
                  nullable: true,
                },
                productSold: {
                  type: "string",
                  nullable: true,
                },
                quantity: {
                  type: "number",
                  nullable: true,
                },
                quantityUnit: {
                  type: "string",
                  nullable: true,
                },
                paymentMethod: {
                  type: "string",
                  nullable: true,
                },
                notes: {
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
          example: "Invalid revenue date",
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
      "Forbidden - User does not have FINANCE:UPDATE permission or revenue does not belong to current farm",
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
    description: "Revenue not found",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Revenue not found",
        },
      },
    },
  })
  @RequirePermission({
    module: PermissionModule.FINANCE,
    action: PermissionAction.UPDATE,
  })
  async updateRevenue(
    @AuthUser() user: any,
    @Param("revenueId") revenueId: string,
    @Body() dto: UpdateRevenueDto,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.revenuesService.updateRevenue(revenueId, user.id, farmId, dto);
  }

  @Delete(":revenueId")
  @ApiOperation({
    summary: "Delete a revenue (soft delete)",
    description:
      "Soft deletes a revenue by setting the deletedAt timestamp. The revenue must belong to the user's current farm. Requires FINANCE:DELETE permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Revenue deleted successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Revenue deleted successfully",
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description:
      "Forbidden - User does not have FINANCE:DELETE permission or revenue does not belong to current farm",
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
    description: "Revenue not found",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Revenue not found",
        },
      },
    },
  })
  @RequirePermission({
    module: PermissionModule.FINANCE,
    action: PermissionAction.DELETE,
  })
  async deleteRevenue(
    @AuthUser() user: any,
    @Param("revenueId") revenueId: string,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.revenuesService.deleteRevenue(revenueId, user.id, farmId);
  }
}
