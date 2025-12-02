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
import { CreateHealthRecordDto } from "./dto/create-health-record.dto";
import { ListHealthRecordsDto } from "./dto/list-health-records.dto";
import { UpdateHealthRecordDto } from "./dto/update-health-record.dto";
import { HealthRecordsService } from "./health-records.service";

@ApiTags("Animal Health Records")
@ApiBearerAuth()
@Controller({ path: "animals/:animalId/health-records", version: "1" })
export class HealthRecordsController {
  constructor(private readonly healthRecordsService: HealthRecordsService) {}

  @Get()
  @ApiOperation({
    summary: "List health records for an animal",
    description:
      "Retrieves a paginated list of health records for the specified animal. The animal must belong to the user's current farm. Supports date range filtering. Requires LIVESTOCK:LISTING permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Health records fetched successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Health records fetched successfully",
        },
        data: {
          type: "object",
          properties: {
            healthRecords: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: {
                    type: "string",
                    format: "uuid",
                    example: "123e4567-e89b-12d3-a456-426614174000",
                  },
                  recordType: { type: "string", example: "Vaccination" },
                  name: { type: "string", example: "Annual Vaccination" },
                  cost: { type: "string", example: "150.00", nullable: true },
                  nextDueDate: {
                    type: "string",
                    format: "date",
                    example: "2024-12-31",
                    nullable: true,
                  },
                  description: {
                    type: "string",
                    example: "Annual vaccination for the animal",
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
  async listHealthRecords(
    @AuthUser() user: any,
    @Param("animalId") animalId: string,
    @Query() query: ListHealthRecordsDto,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.healthRecordsService.listHealthRecords(
      animalId,
      user.id,
      farmId,
      query,
    );
  }

  @Post()
  @ApiOperation({
    summary: "Create a new health record for an animal",
    description:
      "Creates a new health record for the specified animal. The animal must belong to the user's current farm. Requires LIVESTOCK:CREATE permission. Type and name are required fields.",
  })
  @ApiResponse({
    status: 201,
    description: "Health record created successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Health record created successfully",
        },
        data: {
          type: "object",
          properties: {
            healthRecord: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                  example: "123e4567-e89b-12d3-a456-426614174000",
                },
                recordType: { type: "string", example: "Vaccination" },
                name: { type: "string", example: "Annual Vaccination" },
                cost: { type: "string", example: "150.00", nullable: true },
                nextDueDate: {
                  type: "string",
                  format: "date",
                  example: "2024-12-31",
                  nullable: true,
                },
                description: {
                  type: "string",
                  example: "Annual vaccination for the animal",
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
  async createHealthRecord(
    @AuthUser() user: any,
    @Param("animalId") animalId: string,
    @Body() dto: CreateHealthRecordDto,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.healthRecordsService.createHealthRecord(
      animalId,
      user.id,
      farmId,
      dto,
    );
  }

  @Put(":recordId")
  @ApiOperation({
    summary: "Update a health record",
    description:
      "Updates an existing health record for the specified animal. The animal must belong to the user's current farm. Requires LIVESTOCK:UPDATE permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Health record updated successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Health record updated successfully",
        },
        data: {
          type: "object",
          properties: {
            healthRecord: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                  example: "123e4567-e89b-12d3-a456-426614174000",
                },
                recordType: { type: "string", example: "Vaccination" },
                name: { type: "string", example: "Annual Vaccination" },
                cost: { type: "string", example: "150.00", nullable: true },
                nextDueDate: {
                  type: "string",
                  format: "date",
                  example: "2024-12-31",
                  nullable: true,
                },
                description: {
                  type: "string",
                  example: "Annual vaccination for the animal",
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
    description: "Animal or health record not found",
  })
  @RequirePermission({
    module: PermissionModule.LIVESTOCK,
    action: PermissionAction.UPDATE,
  })
  async updateHealthRecord(
    @AuthUser() user: any,
    @Param("animalId") animalId: string,
    @Param("recordId") recordId: string,
    @Body() dto: UpdateHealthRecordDto,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.healthRecordsService.updateHealthRecord(
      animalId,
      recordId,
      user.id,
      farmId,
      dto,
    );
  }
}
