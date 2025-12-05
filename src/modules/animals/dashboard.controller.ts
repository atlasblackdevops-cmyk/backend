import { BadRequestException, Controller, Get } from "@nestjs/common";
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

@ApiTags("Livestock Dashboard")
@ApiBearerAuth()
@Controller({ path: "animals/dashboard", version: "1" })
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({
    summary: "Get livestock dashboard statistics",
    description:
      "Retrieves dashboard statistics for the user's current farm including total animals, average weight, total weight records, and vaccination compliance. The farm ID is automatically retrieved from the user's token (currentFarm). Requires LIVESTOCK:LISTING permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Dashboard stats fetched successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Dashboard stats fetched successfully",
        },
        data: {
          type: "object",
          properties: {
            totalAnimals: {
              type: "number",
              description: "Total number of active animals in the farm",
              example: 25,
            },
            averageWeight: {
              type: "number",
              nullable: true,
              description:
                "Average weight calculated from latest weight records of all animals",
              example: 450.75,
            },
            totalWeightRecords: {
              type: "number",
              description:
                "Total number of weight records for all animals in the farm",
              example: 150,
            },
            vaccinationCompliance: {
              type: "number",
              description:
                "Percentage of animals that have vaccination records in health records (0-100)",
              example: 80.0,
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      "Bad request - User must have a current farm selected or farm not found",
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
    description: "Forbidden - User does not have LIVESTOCK:LISTING permission",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Permission denied: LIVESTOCK:LISTING is required",
        },
      },
    },
  })
  @RequirePermission({
    module: PermissionModule.LIVESTOCK,
    action: PermissionAction.LISTING,
  })
  async getDashboard(@AuthUser() user: any) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.dashboardService.getDashboardStats(farmId);
  }

  @Get("weight-trends")
  @ApiOperation({
    summary: "Get weight trends for the last 12 months",
    description:
      "Retrieves monthly weight trend data for the user's current farm for the last 12 months. Returns average weight per month (in kg) and count of weight records per month. The farm ID is automatically retrieved from the user's token (currentFarm). Requires LIVESTOCK:LISTING permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Weight trends fetched successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Weight trends fetched successfully",
        },
        data: {
          type: "object",
          properties: {
            weightTrends: {
              type: "array",
              description:
                "Array of monthly weight trend data points for the last 12 months",
              items: {
                type: "object",
                properties: {
                  date: {
                    type: "string",
                    format: "YYYY-MM",
                    description: "Month in YYYY-MM format",
                    example: "2024-01",
                  },
                  averageWeight: {
                    type: "number",
                    description:
                      "Average weight in kilograms (kg) for that month",
                    example: 420.5,
                  },
                  count: {
                    type: "number",
                    description: "Number of weight records in that month",
                    example: 12,
                  },
                },
              },
              example: [
                {
                  date: "2024-01",
                  averageWeight: 420.5,
                  count: 12,
                },
                {
                  date: "2024-02",
                  averageWeight: 435.2,
                  count: 15,
                },
              ],
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      "Bad request - User must have a current farm selected or farm not found",
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
    description: "Forbidden - User does not have LIVESTOCK:LISTING permission",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Permission denied: LIVESTOCK:LISTING is required",
        },
      },
    },
  })
  @RequirePermission({
    module: PermissionModule.LIVESTOCK,
    action: PermissionAction.LISTING,
  })
  async getWeightTrends(@AuthUser() user: any) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.dashboardService.getWeightTrends(farmId);
  }

  @Get("feed-trends")
  @ApiOperation({
    summary: "Get feed entries trends for the last 12 months",
    description:
      "Retrieves monthly feed entries trend data for the user's current farm for the last 12 months. Returns total quantity per month (in kg) and count of feed entries per month. The farm ID is automatically retrieved from the user's token (currentFarm). Requires LIVESTOCK:LISTING permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Feed entries trends fetched successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Feed entries trends fetched successfully",
        },
        data: {
          type: "object",
          properties: {
            feedEntriesTrends: {
              type: "array",
              description:
                "Array of monthly feed entries data points for the last 12 months",
              items: {
                type: "object",
                properties: {
                  date: {
                    type: "string",
                    format: "YYYY-MM",
                    description: "Month in YYYY-MM format",
                    example: "2024-01",
                  },
                  totalQuantity: {
                    type: "number",
                    description:
                      "Total quantity in kilograms (kg) for that month",
                    example: 520.5,
                  },
                  count: {
                    type: "number",
                    description: "Number of feed entries in that month",
                    example: 12,
                  },
                },
              },
              example: [
                {
                  date: "2024-01",
                  totalQuantity: 520.5,
                  count: 12,
                },
                {
                  date: "2024-02",
                  totalQuantity: 540.2,
                  count: 15,
                },
              ],
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      "Bad request - User must have a current farm selected or farm not found",
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
    description: "Forbidden - User does not have LIVESTOCK:LISTING permission",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Permission denied: LIVESTOCK:LISTING is required",
        },
      },
    },
  })
  @RequirePermission({
    module: PermissionModule.LIVESTOCK,
    action: PermissionAction.LISTING,
  })
  async getFeedTrends(@AuthUser() user: any) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.dashboardService.getFeedTrends(farmId);
  }
}
