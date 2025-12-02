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
import { CreateFeedRecordDto } from "./dto/create-feed-record.dto";
import { ListFeedRecordsDto } from "./dto/list-feed-records.dto";
import { UpdateFeedRecordDto } from "./dto/update-feed-record.dto";
import { FeedRecordsService } from "./feed-records.service";

@ApiTags("Animal Feed Records")
@ApiBearerAuth()
@Controller({ path: "animals/:animalId/feed-records", version: "1" })
export class FeedRecordsController {
  constructor(private readonly feedRecordsService: FeedRecordsService) {}

  @Get()
  @ApiOperation({
    summary: "List feed records for an animal",
    description:
      "Retrieves a paginated list of feed records for the specified animal. The animal must belong to the user's current farm. Supports date range filtering. Requires LIVESTOCK:LISTING permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Feed records fetched successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Feed records fetched successfully",
        },
        data: {
          type: "object",
          properties: {
            feedRecords: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: {
                    type: "string",
                    format: "uuid",
                    example: "123e4567-e89b-12d3-a456-426614174000",
                  },
                  quantity: { type: "string", example: "25.5" },
                  quantityUnit: { type: "string", example: "kg" },
                  feedType: { type: "string", example: "Hay" },
                  notes: {
                    type: "string",
                    example: "Morning feeding",
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
  async listFeedRecords(
    @AuthUser() user: any,
    @Param("animalId") animalId: string,
    @Query() query: ListFeedRecordsDto,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.feedRecordsService.listFeedRecords(
      animalId,
      user.id,
      farmId,
      query,
    );
  }

  @Post()
  @ApiOperation({
    summary: "Create a new feed record for an animal",
    description:
      "Creates a new feed record for the specified animal. The animal must belong to the user's current farm. Requires LIVESTOCK:CREATE permission. Quantity, quantity unit, and feed type are required fields.",
  })
  @ApiResponse({
    status: 201,
    description: "Feed record created successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Feed record created successfully",
        },
        data: {
          type: "object",
          properties: {
            feedRecord: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                  example: "123e4567-e89b-12d3-a456-426614174000",
                },
                quantity: { type: "string", example: "25.5" },
                quantityUnit: { type: "string", example: "kg" },
                feedType: { type: "string", example: "Hay" },
                notes: {
                  type: "string",
                  example: "Morning feeding",
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
  async createFeedRecord(
    @AuthUser() user: any,
    @Param("animalId") animalId: string,
    @Body() dto: CreateFeedRecordDto,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.feedRecordsService.createFeedRecord(
      animalId,
      user.id,
      farmId,
      dto,
    );
  }

  @Put(":recordId")
  @ApiOperation({
    summary: "Update a feed record",
    description:
      "Updates an existing feed record for the specified animal. The animal must belong to the user's current farm. Requires LIVESTOCK:UPDATE permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Feed record updated successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Feed record updated successfully",
        },
        data: {
          type: "object",
          properties: {
            feedRecord: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                  example: "123e4567-e89b-12d3-a456-426614174000",
                },
                quantity: { type: "string", example: "25.5" },
                quantityUnit: { type: "string", example: "kg" },
                feedType: { type: "string", example: "Hay" },
                notes: {
                  type: "string",
                  example: "Morning feeding",
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
    description: "Animal or feed record not found",
  })
  @RequirePermission({
    module: PermissionModule.LIVESTOCK,
    action: PermissionAction.UPDATE,
  })
  async updateFeedRecord(
    @AuthUser() user: any,
    @Param("animalId") animalId: string,
    @Param("recordId") recordId: string,
    @Body() dto: UpdateFeedRecordDto,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.feedRecordsService.updateFeedRecord(
      animalId,
      recordId,
      user.id,
      farmId,
      dto,
    );
  }
}
