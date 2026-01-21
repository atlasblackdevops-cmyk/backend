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
import { CreateMaintenanceLogDto } from "./dto/create-maintenance-log.dto";
import { ListMaintenanceLogsDto } from "./dto/list-maintenance-logs.dto";
import { UpdateMaintenanceLogDto } from "./dto/update-maintenance-log.dto";
import { MaintenanceLogsService } from "./maintenance-logs.service";

@ApiTags("Equipment Maintenance")
@ApiBearerAuth()
@Controller({ path: "equipment-maintenance", version: "1" })
export class MaintenanceLogsController {
  constructor(
    private readonly maintenanceLogsService: MaintenanceLogsService,
  ) {}

  @Post()
  @ApiOperation({
    summary: "Create a new maintenance log",
    description:
      "Creates a new maintenance log for an equipment. The equipment must belong to the user's current farm. Requires EQUIPMENT:CREATE permission.",
  })
  @ApiResponse({
    status: 201,
    description: "Maintenance log created successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Maintenance log created successfully",
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
          example: "Description is required",
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Equipment not found",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Equipment not found",
        },
      },
    },
  })
  @RequirePermission({
    module: PermissionModule.EQUIPMENT,
    action: PermissionAction.CREATE,
  })
  async createMaintenanceLog(
    @AuthUser() user: any,
    @Body() dto: CreateMaintenanceLogDto,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.maintenanceLogsService.createMaintenanceLog(
      user.id,
      farmId,
      dto,
    );
  }

  @Get()
  @ApiOperation({
    summary: "List maintenance logs for the current farm",
    description:
      "Retrieves a paginated list of maintenance logs for equipment in the user's current farm. Supports filtering by equipment ID, maintenance type, and date range. Requires EQUIPMENT:LISTING permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Maintenance logs fetched successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Maintenance logs fetched successfully",
        },
        data: {
          type: "object",
          properties: {
            maintenanceLogs: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: {
                    type: "string",
                    format: "uuid",
                  },
                  maintenanceDate: {
                    type: "string",
                    format: "date",
                  },
                  maintenanceType: {
                    type: "string",
                  },
                  description: {
                    type: "string",
                  },
                  cost: {
                    type: "string",
                    nullable: true,
                  },
                  equipment: {
                    type: "object",
                  },
                },
              },
            },
            pagination: {
              type: "object",
              properties: {
                page: {
                  type: "number",
                  example: 1,
                },
                limit: {
                  type: "number",
                  example: 10,
                },
                total: {
                  type: "number",
                  example: 25,
                },
                totalPages: {
                  type: "number",
                  example: 3,
                },
              },
            },
          },
        },
      },
    },
  })
  @RequirePermission({
    module: PermissionModule.EQUIPMENT,
    action: PermissionAction.LISTING,
  })
  async listMaintenanceLogs(
    @AuthUser() user: any,
    @Query() query: ListMaintenanceLogsDto,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.maintenanceLogsService.listMaintenanceLogs(farmId, query);
  }

  @Get(":maintenanceLogId")
  @ApiOperation({
    summary: "Get maintenance log details by ID",
    description:
      "Retrieves detailed information about a specific maintenance log by its ID. The maintenance log must belong to equipment in the user's current farm. Requires EQUIPMENT:READ permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Maintenance log details fetched successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Maintenance log details fetched successfully",
        },
        data: {
          type: "object",
          properties: {
            maintenanceLog: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                },
                maintenanceDate: {
                  type: "string",
                  format: "date",
                },
                maintenanceType: {
                  type: "string",
                },
                description: {
                  type: "string",
                },
                cost: {
                  type: "string",
                  nullable: true,
                },
                performedBy: {
                  type: "string",
                  nullable: true,
                },
                nextMaintenanceDate: {
                  type: "string",
                  format: "date",
                  nullable: true,
                },
                notes: {
                  type: "string",
                  nullable: true,
                },
                equipment: {
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
    status: 404,
    description: "Maintenance log not found",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Maintenance log not found",
        },
      },
    },
  })
  @RequirePermission({
    module: PermissionModule.EQUIPMENT,
    action: PermissionAction.READ,
  })
  async getMaintenanceLogDetails(
    @Param("maintenanceLogId") maintenanceLogId: string,
    @AuthUser() user: any,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.maintenanceLogsService.getMaintenanceLogDetails(
      maintenanceLogId,
      user.id,
      farmId,
    );
  }

  @Put(":maintenanceLogId")
  @ApiOperation({
    summary: "Update maintenance log",
    description:
      "Updates an existing maintenance log. The maintenance log must belong to equipment in the user's current farm. Requires EQUIPMENT:UPDATE permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Maintenance log updated successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Maintenance log updated successfully",
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Maintenance log not found",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Maintenance log not found",
        },
      },
    },
  })
  @RequirePermission({
    module: PermissionModule.EQUIPMENT,
    action: PermissionAction.UPDATE,
  })
  async updateMaintenanceLog(
    @Param("maintenanceLogId") maintenanceLogId: string,
    @AuthUser() user: any,
    @Body() dto: UpdateMaintenanceLogDto,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.maintenanceLogsService.updateMaintenanceLog(
      maintenanceLogId,
      user.id,
      farmId,
      dto,
    );
  }

  @Delete(":maintenanceLogId")
  @ApiOperation({
    summary: "Delete maintenance log",
    description:
      "Soft deletes a maintenance log. The maintenance log must belong to equipment in the user's current farm. Requires EQUIPMENT:DELETE permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Maintenance log deleted successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Maintenance log deleted successfully",
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Maintenance log not found",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Maintenance log not found",
        },
      },
    },
  })
  @RequirePermission({
    module: PermissionModule.EQUIPMENT,
    action: PermissionAction.DELETE,
  })
  async deleteMaintenanceLog(
    @Param("maintenanceLogId") maintenanceLogId: string,
    @AuthUser() user: any,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.maintenanceLogsService.deleteMaintenanceLog(
      maintenanceLogId,
      user.id,
      farmId,
    );
  }
}
