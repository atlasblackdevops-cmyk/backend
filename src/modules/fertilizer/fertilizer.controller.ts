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
import { CreateFertilizerDto } from "./dto/create-fertilizer.dto";
import { ListFertilizerDto } from "./dto/list-fertilizer.dto";
import { UpdateFertilizerDto } from "./dto/update-fertilizer.dto";
import { FertilizerService } from "./fertilizer.service";

@ApiTags("Fertilizer")
@ApiBearerAuth()
@Controller({ path: "fertilizer", version: "1" })
export class FertilizerController {
  constructor(private readonly fertilizerService: FertilizerService) {}

  @Post()
  @ApiOperation({
    summary: "Create a new fertilizer record",
    description:
      "Creates a new fertilizer record for the user's current farm. The farm ID is automatically retrieved from the user's token (currentFarm). Requires CROPS:CREATE permission. Field must belong to the current farm.",
  })
  @ApiResponse({
    status: 201,
    description: "Fertilizer record created successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Fertilizer record created successfully",
        },
        data: {
          type: "object",
          properties: {
            fertilizer: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                  example: "123e4567-e89b-12d3-a456-426614174000",
                },
                fertilizerType: {
                  type: "string",
                  example: "NPK 20-20-20",
                  nullable: true,
                },
                quantity: {
                  type: "string",
                  example: "50",
                  nullable: true,
                },
                quantityUnit: {
                  type: "string",
                  example: "kg",
                  nullable: true,
                },
                applicationDate: {
                  type: "string",
                  format: "date",
                  example: "2024-06-15",
                  nullable: true,
                },
                applicationMethod: {
                  type: "string",
                  example: "Broadcast",
                  nullable: true,
                },
                cost: {
                  type: "string",
                  example: "150.00",
                  nullable: true,
                },
                notes: {
                  type: "string",
                  nullable: true,
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
                field: {
                  type: "object",
                  properties: {
                    id: {
                      type: "string",
                      format: "uuid",
                    },
                    fieldName: {
                      type: "string",
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
                    },
                    email: {
                      type: "string",
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
                    },
                    email: {
                      type: "string",
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
  })
  @ApiResponse({
    status: 403,
    description:
      "Forbidden - User does not have CROPS:CREATE permission or field does not belong to current farm",
  })
  @ApiResponse({
    status: 404,
    description: "Farm or field not found",
  })
  @RequirePermission({
    module: PermissionModule.CROPS,
    action: PermissionAction.CREATE,
  })
  async createFertilizer(
    @AuthUser() user: any,
    @Body() dto: CreateFertilizerDto,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.fertilizerService.createFertilizer(user.id, farmId, dto);
  }

  @Get()
  @ApiOperation({
    summary: "List fertilizer records for the current farm",
    description:
      "Retrieves a paginated list of fertilizer records for the user's current farm. The farm ID is automatically retrieved from the user's token (currentFarm). Supports filtering by field and application date range. Requires CROPS:LISTING permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Fertilizer records fetched successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Fertilizer records fetched successfully",
        },
        data: {
          type: "object",
          properties: {
            fertilizers: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: {
                    type: "string",
                    format: "uuid",
                  },
                  fertilizerType: {
                    type: "string",
                    nullable: true,
                  },
                  quantity: {
                    type: "string",
                    nullable: true,
                  },
                  quantityUnit: {
                    type: "string",
                    nullable: true,
                  },
                  applicationDate: {
                    type: "string",
                    format: "date",
                    nullable: true,
                  },
                  applicationMethod: {
                    type: "string",
                    nullable: true,
                  },
                  cost: {
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
                  field: {
                    type: "object",
                    properties: {
                      id: {
                        type: "string",
                        format: "uuid",
                      },
                      fieldName: {
                        type: "string",
                      },
                    },
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
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - User does not have CROPS:LISTING permission",
  })
  @ApiResponse({
    status: 404,
    description: "Farm not found",
  })
  @RequirePermission({
    module: PermissionModule.CROPS,
    action: PermissionAction.LISTING,
  })
  async listFertilizer(
    @AuthUser() user: any,
    @Query() query: ListFertilizerDto,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.fertilizerService.listFertilizer(farmId, query);
  }

  @Get(":fertilizerId")
  @ApiOperation({
    summary: "Get fertilizer record details by ID",
    description:
      "Retrieves detailed information about a specific fertilizer record by its ID. The fertilizer record must belong to the user's current farm. Requires CROPS:READ permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Fertilizer record details fetched successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Fertilizer record details fetched successfully",
        },
        data: {
          type: "object",
          properties: {
            fertilizer: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                },
                fertilizerType: {
                  type: "string",
                  nullable: true,
                },
                quantity: {
                  type: "string",
                  nullable: true,
                },
                quantityUnit: {
                  type: "string",
                  nullable: true,
                },
                applicationDate: {
                  type: "string",
                  format: "date",
                  nullable: true,
                },
                applicationMethod: {
                  type: "string",
                  nullable: true,
                },
                cost: {
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
                field: {
                  type: "object",
                  properties: {
                    id: {
                      type: "string",
                      format: "uuid",
                    },
                    fieldName: {
                      type: "string",
                    },
                  },
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
      "Forbidden - User does not have CROPS:READ permission or fertilizer record does not belong to current farm",
  })
  @ApiResponse({
    status: 404,
    description: "Fertilizer record not found",
  })
  @RequirePermission({
    module: PermissionModule.CROPS,
    action: PermissionAction.READ,
  })
  async getFertilizerDetails(
    @AuthUser() user: any,
    @Param("fertilizerId") fertilizerId: string,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.fertilizerService.getFertilizerDetails(
      fertilizerId,
      user.id,
      farmId,
    );
  }

  @Put(":fertilizerId")
  @ApiOperation({
    summary: "Update a fertilizer record",
    description:
      "Updates an existing fertilizer record. The fertilizer record must belong to the user's current farm. All fields are optional. Requires CROPS:UPDATE permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Fertilizer record updated successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Fertilizer record updated successfully",
        },
        data: {
          type: "object",
          properties: {
            fertilizer: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                },
                fertilizerType: {
                  type: "string",
                  nullable: true,
                },
                quantity: {
                  type: "string",
                  nullable: true,
                },
                quantityUnit: {
                  type: "string",
                  nullable: true,
                },
                applicationDate: {
                  type: "string",
                  format: "date",
                  nullable: true,
                },
                applicationMethod: {
                  type: "string",
                  nullable: true,
                },
                cost: {
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
                field: {
                  type: "object",
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
  })
  @ApiResponse({
    status: 403,
    description:
      "Forbidden - User does not have CROPS:UPDATE permission or fertilizer record does not belong to current farm",
  })
  @ApiResponse({
    status: 404,
    description: "Fertilizer record or field not found",
  })
  @RequirePermission({
    module: PermissionModule.CROPS,
    action: PermissionAction.UPDATE,
  })
  async updateFertilizer(
    @AuthUser() user: any,
    @Param("fertilizerId") fertilizerId: string,
    @Body() dto: UpdateFertilizerDto,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.fertilizerService.updateFertilizer(
      fertilizerId,
      user.id,
      farmId,
      dto,
    );
  }

  @Delete(":fertilizerId")
  @ApiOperation({
    summary: "Delete a fertilizer record (soft delete)",
    description:
      "Soft deletes a fertilizer record by setting the deletedAt timestamp. The fertilizer record must belong to the user's current farm. Requires CROPS:DELETE permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Fertilizer record deleted successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Fertilizer record deleted successfully",
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description:
      "Forbidden - User does not have CROPS:DELETE permission or fertilizer record does not belong to current farm",
  })
  @ApiResponse({
    status: 404,
    description: "Fertilizer record not found",
  })
  @RequirePermission({
    module: PermissionModule.CROPS,
    action: PermissionAction.DELETE,
  })
  async deleteFertilizer(
    @AuthUser() user: any,
    @Param("fertilizerId") fertilizerId: string,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.fertilizerService.deleteFertilizer(
      fertilizerId,
      user.id,
      farmId,
    );
  }
}
