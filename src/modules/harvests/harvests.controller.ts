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
  Res,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { FastifyReply } from "fastify";
import { RequirePermission } from "../../decorators/permission.decorator";
import { AuthUser } from "../../decorators/user.decorator";
import {
  PermissionAction,
  PermissionModule,
} from "../../enums/permission.enum";
import { CreateHarvestDto } from "./dto/create-harvest.dto";
import { ListHarvestsDto } from "./dto/list-harvests.dto";
import { UpdateHarvestDto } from "./dto/update-harvest.dto";
import { YieldBySeasonDto } from "./dto/yield-by-season.dto";
import { HarvestsService } from "./harvests.service";

@ApiTags("Harvests")
@ApiBearerAuth()
@Controller({ path: "harvests", version: "1" })
export class HarvestsController {
  constructor(private readonly harvestsService: HarvestsService) {}

  @Post()
  @ApiOperation({
    summary: "Create a new harvest record",
    description:
      "Creates a new harvest record for the user's current farm. The farm ID is automatically retrieved from the user's token (currentFarm). Requires CROPS:CREATE permission. Field must belong to the current farm. Planting record ID is optional but must belong to the current farm if provided.",
  })
  @ApiResponse({
    status: 201,
    description: "Harvest created successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Harvest created successfully",
        },
        data: {
          type: "object",
          properties: {
            harvest: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                  example: "123e4567-e89b-12d3-a456-426614174000",
                },
                harvestDate: {
                  type: "string",
                  format: "date",
                  example: "2024-06-15",
                  nullable: true,
                },
                cropType: {
                  type: "string",
                  example: "Wheat",
                  nullable: true,
                },
                yieldAmount: {
                  type: "string",
                  example: "1000",
                  nullable: true,
                },
                yieldUnit: {
                  type: "string",
                  example: "kg",
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
  async createHarvest(@AuthUser() user: any, @Body() dto: CreateHarvestDto) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.harvestsService.createHarvest(user.id, farmId, dto);
  }

  @Get("yield-by-season")
  @ApiOperation({
    summary: "Get yield data by season for graph visualization",
    description:
      "Retrieves aggregated yield data grouped by season and crop type for graph visualization. Supports filtering by crop type. Requires CROPS:LISTING permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Yield data retrieved successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Yield data retrieved successfully",
        },
        data: {
          type: "object",
          properties: {
            yields: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  season: {
                    type: "string",
                    example: "2024 Spring",
                    description:
                      "Season identifier in format 'YYYY Season' (e.g., '2024 Spring', '2023 Fall')",
                  },
                  yieldAmount: {
                    type: "number",
                    example: 1250,
                    description:
                      "Total yield amount for this season/crop combination",
                  },
                  yieldUnit: {
                    type: "string",
                    example: "kg",
                    description: "Unit of measurement",
                  },
                  cropType: {
                    type: "string",
                    example: "Corn",
                    description: "Type of crop",
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
  async getYieldBySeason(
    @AuthUser() user: any,
    @Query() query: YieldBySeasonDto,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.harvestsService.getYieldBySeason(farmId, query);
  }

  @Get("export-csv")
  @ApiOperation({
    summary: "Export harvests to CSV",
    description:
      "Exports harvest records to CSV format with the same filters as the list endpoint (harvest date range). No pagination - exports all matching records.Requires CROPS:LISTING permission.",
  })
  @ApiResponse({
    status: 200,
    description: "CSV file downloaded successfully",
    content: {
      "text/csv": {
        schema: {
          type: "string",
          format: "binary",
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
  async exportHarvestsToCSV(
    @AuthUser() user: any,
    @Query() query: ListHarvestsDto,
    @Res() reply: FastifyReply,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    const csvContent = await this.harvestsService.exportHarvestsToCSV(
      farmId,
      query,
    );

    const filename = `harvests_export_${new Date().toISOString().split("T")[0]}.csv`;

    reply
      .header("Content-Type", "text/csv; charset=utf-8")
      .header("Content-Disposition", `attachment; filename="${filename}"`)
      .send(csvContent);
  }

  @Get()
  @ApiOperation({
    summary: "List harvests for the current farm",
    description:
      "Retrieves a paginated list of harvests for the user's current farm. The farm ID is automatically retrieved from the user's token (currentFarm). Supports filtering by harvest date range. Requires CROPS:LISTING permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Harvests fetched successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Harvests fetched successfully",
        },
        data: {
          type: "object",
          properties: {
            harvests: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: {
                    type: "string",
                    format: "uuid",
                  },
                  harvestDate: {
                    type: "string",
                    format: "date",
                    nullable: true,
                  },
                  cropType: {
                    type: "string",
                    nullable: true,
                  },
                  yieldAmount: {
                    type: "string",
                    nullable: true,
                  },
                  yieldUnit: {
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
  async listHarvests(@AuthUser() user: any, @Query() query: ListHarvestsDto) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.harvestsService.listHarvests(farmId, query);
  }

  @Get(":harvestId")
  @ApiOperation({
    summary: "Get harvest details by ID",
    description:
      "Retrieves detailed information about a specific harvest by its ID. The harvest must belong to the user's current farm. Requires CROPS:READ permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Harvest details fetched successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Harvest details fetched successfully",
        },
        data: {
          type: "object",
          properties: {
            harvest: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                },
                harvestDate: {
                  type: "string",
                  format: "date",
                  nullable: true,
                },
                cropType: {
                  type: "string",
                  nullable: true,
                },
                yieldAmount: {
                  type: "string",
                  nullable: true,
                },
                yieldUnit: {
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
      "Forbidden - User does not have CROPS:READ permission or harvest does not belong to current farm",
  })
  @ApiResponse({
    status: 404,
    description: "Harvest not found",
  })
  @RequirePermission({
    module: PermissionModule.CROPS,
    action: PermissionAction.READ,
  })
  async getHarvestDetails(
    @AuthUser() user: any,
    @Param("harvestId") harvestId: string,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.harvestsService.getHarvestDetails(harvestId, user.id, farmId);
  }

  @Put(":harvestId")
  @ApiOperation({
    summary: "Update a harvest record",
    description:
      "Updates an existing harvest record. The harvest must belong to the user's current farm. All fields are optional. Requires CROPS:UPDATE permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Harvest updated successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Harvest updated successfully",
        },
        data: {
          type: "object",
          properties: {
            harvest: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                },
                harvestDate: {
                  type: "string",
                  format: "date",
                  nullable: true,
                },
                cropType: {
                  type: "string",
                  nullable: true,
                },
                yieldAmount: {
                  type: "string",
                  nullable: true,
                },
                yieldUnit: {
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
      "Forbidden - User does not have CROPS:UPDATE permission or harvest does not belong to current farm",
  })
  @ApiResponse({
    status: 404,
    description: "Harvest, field, or planting record not found",
  })
  @RequirePermission({
    module: PermissionModule.CROPS,
    action: PermissionAction.UPDATE,
  })
  async updateHarvest(
    @AuthUser() user: any,
    @Param("harvestId") harvestId: string,
    @Body() dto: UpdateHarvestDto,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.harvestsService.updateHarvest(harvestId, user.id, farmId, dto);
  }

  @Delete(":harvestId")
  @ApiOperation({
    summary: "Delete a harvest record (soft delete)",
    description:
      "Soft deletes a harvest record by setting the deletedAt timestamp. The harvest must belong to the user's current farm. Requires CROPS:DELETE permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Harvest deleted successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Harvest deleted successfully",
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description:
      "Forbidden - User does not have CROPS:DELETE permission or harvest does not belong to current farm",
  })
  @ApiResponse({
    status: 404,
    description: "Harvest not found",
  })
  @RequirePermission({
    module: PermissionModule.CROPS,
    action: PermissionAction.DELETE,
  })
  async deleteHarvest(
    @AuthUser() user: any,
    @Param("harvestId") harvestId: string,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.harvestsService.deleteHarvest(harvestId, user.id, farmId);
  }
}
