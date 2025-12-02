import {
  BadRequestException,
  Body,
  Controller,
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
import { CreateWeightRecordDto } from "./dto/create-weight-record.dto";
import { ListWeightRecordsDto } from "./dto/list-weight-records.dto";
import { UpdateWeightRecordDto } from "./dto/update-weight-record.dto";
import { WeightRecordsService } from "./weight-records.service";

@ApiTags("Animal Weight Records")
@ApiBearerAuth()
@Controller({ path: "animals/:animalId/weight-records", version: "1" })
export class WeightRecordsController {
  constructor(private readonly weightRecordsService: WeightRecordsService) {}

  @Get()
  @ApiOperation({
    summary: "List weight records for an animal",
    description:
      "Retrieves a paginated list of weight records for the specified animal. The animal must belong to the user's current farm. Supports date range filtering on measured date. Requires LIVESTOCK:LISTING permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Weight records fetched successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Weight records fetched successfully",
        },
        data: {
          type: "object",
          properties: {
            weightRecords: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: {
                    type: "string",
                    format: "uuid",
                    example: "123e4567-e89b-12d3-a456-426614174000",
                  },
                  measuredAt: {
                    type: "string",
                    format: "date-time",
                    example: "2024-01-15T10:30:00Z",
                  },
                  weight: { type: "string", example: "450.5" },
                  weightUnit: { type: "string", example: "kg" },
                  notes: {
                    type: "string",
                    example: "Measured after feeding",
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
                  animal: {
                    type: "object",
                    properties: {
                      id: {
                        type: "string",
                        format: "uuid",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                      },
                      name: { type: "string", example: "Bessie" },
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
                      email: { type: "string", example: "user@example.com" },
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
                      email: { type: "string", example: "user@example.com" },
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
  })
  @ApiResponse({
    status: 403,
    description:
      "Forbidden - User does not have LIVESTOCK:LISTING permission or animal does not belong to current farm",
  })
  @ApiResponse({
    status: 404,
    description: "Animal not found",
  })
  @RequirePermission({
    module: PermissionModule.LIVESTOCK,
    action: PermissionAction.LISTING,
  })
  async listWeightRecords(
    @AuthUser() user: any,
    @Param("animalId") animalId: string,
    @Query() query: ListWeightRecordsDto,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.weightRecordsService.listWeightRecords(
      animalId,
      user.id,
      farmId,
      query,
    );
  }

  @Post()
  @ApiOperation({
    summary: "Create a new weight record for an animal",
    description:
      "Creates a new weight record for the specified animal. The animal must belong to the user's current farm. Requires LIVESTOCK:CREATE permission. Measured at date, weight, and weight unit are required fields.",
  })
  @ApiResponse({
    status: 201,
    description: "Weight record created successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Weight record created successfully",
        },
        data: {
          type: "object",
          properties: {
            weightRecord: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                  example: "123e4567-e89b-12d3-a456-426614174000",
                },
                measuredAt: {
                  type: "string",
                  format: "date-time",
                  example: "2024-01-15T10:30:00Z",
                },
                weight: { type: "string", example: "450.5" },
                weightUnit: { type: "string", example: "kg" },
                notes: {
                  type: "string",
                  example: "Measured after feeding",
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
                animal: {
                  type: "object",
                  properties: {
                    id: {
                      type: "string",
                      format: "uuid",
                      example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    name: { type: "string", example: "Bessie" },
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
                    email: { type: "string", example: "user@example.com" },
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
                    email: { type: "string", example: "user@example.com" },
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
      "Forbidden - User does not have LIVESTOCK:CREATE permission or animal does not belong to current farm",
  })
  @ApiResponse({
    status: 404,
    description: "Animal not found",
  })
  @RequirePermission({
    module: PermissionModule.LIVESTOCK,
    action: PermissionAction.CREATE,
  })
  async createWeightRecord(
    @AuthUser() user: any,
    @Param("animalId") animalId: string,
    @Body() dto: CreateWeightRecordDto,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.weightRecordsService.createWeightRecord(
      animalId,
      user.id,
      farmId,
      dto,
    );
  }

  @Put(":recordId")
  @ApiOperation({
    summary: "Update a weight record",
    description:
      "Updates an existing weight record for the specified animal. The animal must belong to the user's current farm. Requires LIVESTOCK:UPDATE permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Weight record updated successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Weight record updated successfully",
        },
        data: {
          type: "object",
          properties: {
            weightRecord: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                  example: "123e4567-e89b-12d3-a456-426614174000",
                },
                measuredAt: {
                  type: "string",
                  format: "date-time",
                  example: "2024-01-15T10:30:00Z",
                },
                weight: { type: "string", example: "450.5" },
                weightUnit: { type: "string", example: "kg" },
                notes: {
                  type: "string",
                  example: "Measured after feeding",
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
                animal: {
                  type: "object",
                  properties: {
                    id: {
                      type: "string",
                      format: "uuid",
                      example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    name: { type: "string", example: "Bessie" },
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
                    email: { type: "string", example: "user@example.com" },
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
                    email: { type: "string", example: "user@example.com" },
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
    description: "Bad request - validation error",
  })
  @ApiResponse({
    status: 403,
    description:
      "Forbidden - User does not have LIVESTOCK:UPDATE permission or animal does not belong to current farm",
  })
  @ApiResponse({
    status: 404,
    description: "Animal or weight record not found",
  })
  @RequirePermission({
    module: PermissionModule.LIVESTOCK,
    action: PermissionAction.UPDATE,
  })
  async updateWeightRecord(
    @AuthUser() user: any,
    @Param("animalId") animalId: string,
    @Param("recordId") recordId: string,
    @Body() dto: UpdateWeightRecordDto,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.weightRecordsService.updateWeightRecord(
      animalId,
      recordId,
      user.id,
      farmId,
      dto,
    );
  }
}
