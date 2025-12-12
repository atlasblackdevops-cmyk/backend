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
import { CreateIrrigationDto } from "./dto/create-irrigation.dto";
import { ListIrrigationDto } from "./dto/list-irrigation.dto";
import { UpdateIrrigationDto } from "./dto/update-irrigation.dto";
import { IrrigationService } from "./irrigation.service";

@ApiTags("Irrigation")
@ApiBearerAuth()
@Controller({ path: "irrigation", version: "1" })
export class IrrigationController {
  constructor(private readonly irrigationService: IrrigationService) {}

  @Post()
  @ApiOperation({
    summary: "Create a new irrigation record",
    description:
      "Creates a new irrigation record for the user's current farm. The farm ID is automatically retrieved from the user's token (currentFarm). Requires CROPS:CREATE permission. Field must belong to the current farm. Planting record ID is optional but must belong to the current farm if provided.",
  })
  @ApiResponse({
    status: 201,
    description: "Irrigation record created successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Irrigation record created successfully",
        },
        data: {
          type: "object",
          properties: {
            irrigation: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                  example: "123e4567-e89b-12d3-a456-426614174000",
                },
                irrigationDate: {
                  type: "string",
                  format: "date",
                  example: "2024-06-15",
                  nullable: true,
                },
                waterVolume: {
                  type: "string",
                  example: "500",
                  nullable: true,
                },
                volumeUnit: {
                  type: "string",
                  example: "liters",
                  nullable: true,
                },
                irrigationMethod: {
                  type: "string",
                  example: "Drip",
                  nullable: true,
                },
                durationMinutes: {
                  type: "number",
                  example: 30,
                  nullable: true,
                },
                cost: {
                  type: "string",
                  example: "50.00",
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
                plantingRecord: {
                  type: "object",
                  nullable: true,
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
      "Forbidden - User does not have CROPS:CREATE permission or field/planting record does not belong to current farm",
  })
  @ApiResponse({
    status: 404,
    description: "Farm, field, or planting record not found",
  })
  @RequirePermission({
    module: PermissionModule.CROPS,
    action: PermissionAction.CREATE,
  })
  async createIrrigation(
    @AuthUser() user: any,
    @Body() dto: CreateIrrigationDto,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.irrigationService.createIrrigation(user.id, farmId, dto);
  }

  @Get()
  @ApiOperation({
    summary: "List irrigation records for the current farm",
    description:
      "Retrieves a paginated list of irrigation records for the user's current farm. The farm ID is automatically retrieved from the user's token (currentFarm). Supports filtering by field, planting record, and irrigation date range. Requires CROPS:LISTING permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Irrigation records fetched successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Irrigation records fetched successfully",
        },
        data: {
          type: "object",
          properties: {
            irrigations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: {
                    type: "string",
                    format: "uuid",
                  },
                  irrigationDate: {
                    type: "string",
                    format: "date",
                    nullable: true,
                  },
                  waterVolume: {
                    type: "string",
                    nullable: true,
                  },
                  volumeUnit: {
                    type: "string",
                    nullable: true,
                  },
                  irrigationMethod: {
                    type: "string",
                    nullable: true,
                  },
                  durationMinutes: {
                    type: "number",
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
                  plantingRecord: {
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
  async listIrrigation(
    @AuthUser() user: any,
    @Query() query: ListIrrigationDto,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.irrigationService.listIrrigation(farmId, query);
  }

  @Get(":irrigationId")
  @ApiOperation({
    summary: "Get irrigation record details by ID",
    description:
      "Retrieves detailed information about a specific irrigation record by its ID. The irrigation record must belong to the user's current farm. Requires CROPS:READ permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Irrigation record details fetched successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Irrigation record details fetched successfully",
        },
        data: {
          type: "object",
          properties: {
            irrigation: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                },
                irrigationDate: {
                  type: "string",
                  format: "date",
                  nullable: true,
                },
                waterVolume: {
                  type: "string",
                  nullable: true,
                },
                volumeUnit: {
                  type: "string",
                  nullable: true,
                },
                irrigationMethod: {
                  type: "string",
                  nullable: true,
                },
                durationMinutes: {
                  type: "number",
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
                plantingRecord: {
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
      "Forbidden - User does not have CROPS:READ permission or irrigation record does not belong to current farm",
  })
  @ApiResponse({
    status: 404,
    description: "Irrigation record not found",
  })
  @RequirePermission({
    module: PermissionModule.CROPS,
    action: PermissionAction.READ,
  })
  async getIrrigationDetails(
    @AuthUser() user: any,
    @Param("irrigationId") irrigationId: string,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.irrigationService.getIrrigationDetails(
      irrigationId,
      user.id,
      farmId,
    );
  }

  @Put(":irrigationId")
  @ApiOperation({
    summary: "Update an irrigation record",
    description:
      "Updates an existing irrigation record. The irrigation record must belong to the user's current farm. All fields are optional. Requires CROPS:UPDATE permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Irrigation record updated successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Irrigation record updated successfully",
        },
        data: {
          type: "object",
          properties: {
            irrigation: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                },
                irrigationDate: {
                  type: "string",
                  format: "date",
                  nullable: true,
                },
                waterVolume: {
                  type: "string",
                  nullable: true,
                },
                volumeUnit: {
                  type: "string",
                  nullable: true,
                },
                irrigationMethod: {
                  type: "string",
                  nullable: true,
                },
                durationMinutes: {
                  type: "number",
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
                plantingRecord: {
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
  })
  @ApiResponse({
    status: 403,
    description:
      "Forbidden - User does not have CROPS:UPDATE permission or irrigation record does not belong to current farm",
  })
  @ApiResponse({
    status: 404,
    description: "Irrigation record, field, or planting record not found",
  })
  @RequirePermission({
    module: PermissionModule.CROPS,
    action: PermissionAction.UPDATE,
  })
  async updateIrrigation(
    @AuthUser() user: any,
    @Param("irrigationId") irrigationId: string,
    @Body() dto: UpdateIrrigationDto,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.irrigationService.updateIrrigation(
      irrigationId,
      user.id,
      farmId,
      dto,
    );
  }

  @Delete(":irrigationId")
  @ApiOperation({
    summary: "Delete an irrigation record (soft delete)",
    description:
      "Soft deletes an irrigation record by setting the deletedAt timestamp. The irrigation record must belong to the user's current farm. Requires CROPS:DELETE permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Irrigation record deleted successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Irrigation record deleted successfully",
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description:
      "Forbidden - User does not have CROPS:DELETE permission or irrigation record does not belong to current farm",
  })
  @ApiResponse({
    status: 404,
    description: "Irrigation record not found",
  })
  @RequirePermission({
    module: PermissionModule.CROPS,
    action: PermissionAction.DELETE,
  })
  async deleteIrrigation(
    @AuthUser() user: any,
    @Param("irrigationId") irrigationId: string,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.irrigationService.deleteIrrigation(
      irrigationId,
      user.id,
      farmId,
    );
  }

  @Get("cost-summary")
  @ApiOperation({
    summary: "Get irrigation cost summary per field",
    description:
      "Retrieves a cost summary report showing total irrigation costs per field for the current farm. Returns an array of fields with their total irrigation costs. Fields with no irrigation records will show 0 cost. Requires CROPS:LISTING permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Irrigation cost summary fetched successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Irrigation cost summary fetched successfully",
        },
        data: {
          type: "object",
          properties: {
            summary: {
              type: "array",
              description: "Array of fields with their total irrigation costs",
              items: {
                type: "object",
                properties: {
                  fieldId: {
                    type: "string",
                    format: "uuid",
                    description: "Unique identifier of the field",
                    example: "123e4567-e89b-12d3-a456-426614174000",
                  },
                  fieldName: {
                    type: "string",
                    description: "Name of the field",
                    example: "North Field",
                  },
                  totalCost: {
                    type: "number",
                    description:
                      "Total irrigation cost for this field (0 if no records or null costs)",
                    example: 1250.5,
                  },
                },
              },
            },
            totalFields: {
              type: "number",
              description: "Total number of fields in the farm",
              example: 10,
            },
            totalCost: {
              type: "number",
              description: "Total irrigation cost across all fields",
              example: 5678.9,
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "User must have a current farm selected",
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
  async getIrrigationCostSummary(@AuthUser() user: any) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.irrigationService.getIrrigationCostSummary(farmId);
  }
}
