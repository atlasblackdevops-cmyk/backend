import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { FastifyRequest } from "fastify";
import { RequirePermission } from "../../decorators/permission.decorator";
import { AuthUser } from "../../decorators/user.decorator";
import {
  PermissionAction,
  PermissionModule,
} from "../../enums/permission.enum";
import {
  getFieldValue,
  parseMultipartData,
} from "../../utils/multipart.helper";
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
                  images: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: {
                          type: "string",
                          format: "uuid",
                          example: "123e4567-e89b-12d3-a456-426614174000",
                        },
                        imageKey: {
                          type: "string",
                          example: "health-record-images/uuid.jpg",
                        },
                        imageUrl: {
                          type: "string",
                          example: "https://presigned-url.com/image.jpg",
                        },
                      },
                    },
                    description:
                      "Array of images associated with the health record",
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
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Create a new health record for an animal",
    description:
      "Creates a new health record for the specified animal with optional multiple images. The animal must belong to the user's current farm. Requires LIVESTOCK:CREATE permission. Type and name are required fields. Images are optional.",
  })
  @ApiBody({
    schema: {
      type: "object",
      required: ["recordType", "name"],
      properties: {
        recordType: {
          type: "string",
          description: "Type of health record",
          example: "Vaccination",
        },
        name: {
          type: "string",
          description: "Name of the health record",
          example: "Annual Vaccination",
        },
        cost: {
          type: "number",
          description: "Cost of the health record",
          example: 150.0,
        },
        nextDueDate: {
          type: "string",
          format: "date",
          description: "Next due date in ISO format (YYYY-MM-DD)",
          example: "2024-12-31",
        },
        description: {
          type: "string",
          description: "Description of the health record",
          example: "Annual vaccination for the animal",
        },
        images: {
          type: "array",
          items: {
            type: "string",
            format: "binary",
          },
          description: "Multiple image files (optional)",
        },
      },
    },
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
                images: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: {
                        type: "string",
                        format: "uuid",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                      },
                      imageKey: {
                        type: "string",
                        example: "health-record-images/uuid.jpg",
                      },
                      imageUrl: {
                        type: "string",
                        example: "https://presigned-url.com/image.jpg",
                      },
                    },
                  },
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
    @Req() req: FastifyRequest,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    const { fields, files } = await parseMultipartData(req);

    const dto: CreateHealthRecordDto = {
      recordType: getFieldValue(fields.recordType) ?? "",
      name: getFieldValue(fields.name) ?? "",
      cost: getFieldValue(fields.cost)
        ? parseFloat(getFieldValue(fields.cost)!)
        : undefined,
      nextDueDate: getFieldValue(fields.nextDueDate),
      description: getFieldValue(fields.description),
    };

    // Extract images array
    const imagesData: Array<{ buffer: Buffer; filename: string }> = [];
    const imagesFile = files.get("images");
    if (imagesFile) {
      if (Array.isArray(imagesFile)) {
        imagesData.push(...imagesFile);
      } else {
        imagesData.push(imagesFile);
      }
    }

    // Validate maximum 10 images
    if (imagesData.length > 10) {
      throw new BadRequestException(
        "Maximum 10 images allowed per health record",
      );
    }

    return this.healthRecordsService.createHealthRecord(
      animalId,
      user.id,
      farmId,
      dto,
      imagesData,
    );
  }

  @Put(":recordId")
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Update a health record",
    description:
      "Updates an existing health record for the specified animal. The animal must belong to the user's current farm. Requires LIVESTOCK:UPDATE permission. All fields are optional. You can add new images and/or delete specific images by providing their imageKeys in the deletedImageKeys field.",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        recordType: {
          type: "string",
          description: "Type of health record",
          example: "Vaccination",
        },
        name: {
          type: "string",
          description: "Name of the health record",
          example: "Annual Vaccination",
        },
        cost: {
          type: "number",
          description: "Cost of the health record",
          example: 150.0,
        },
        nextDueDate: {
          type: "string",
          format: "date",
          description: "Next due date in ISO format (YYYY-MM-DD)",
          example: "2024-12-31",
        },
        description: {
          type: "string",
          description: "Description of the health record",
          example: "Annual vaccination for the animal",
        },
        images: {
          type: "array",
          items: {
            type: "string",
            format: "binary",
          },
          description:
            "New images to add (optional). These will be added alongside existing images.",
        },
        deletedImageKeys: {
          type: "string",
          description:
            "Comma-separated list of image keys (S3 keys) to delete, or JSON array string. Example: 'health-record-images/uuid1.jpg,health-record-images/uuid2.jpg' or '[\"health-record-images/uuid1.jpg\",\"health-record-images/uuid2.jpg\"]'",
          example:
            "health-record-images/uuid1.jpg,health-record-images/uuid2.jpg",
        },
      },
    },
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
                images: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: {
                        type: "string",
                        format: "uuid",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                      },
                      imageKey: {
                        type: "string",
                        example: "health-record-images/uuid.jpg",
                      },
                      imageUrl: {
                        type: "string",
                        example: "https://presigned-url.com/image.jpg",
                      },
                    },
                  },
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
    @Req() req: FastifyRequest,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    const { fields, files } = await parseMultipartData(req);

    const dto: UpdateHealthRecordDto = {
      recordType: getFieldValue(fields.recordType),
      name: getFieldValue(fields.name),
      cost: getFieldValue(fields.cost)
        ? parseFloat(getFieldValue(fields.cost)!)
        : undefined,
      nextDueDate: getFieldValue(fields.nextDueDate),
      description: getFieldValue(fields.description),
    };

    // Extract images array (new images to add)
    const imagesData: Array<{ buffer: Buffer; filename: string }> = [];
    const imagesFile = files.get("images");
    if (imagesFile) {
      if (Array.isArray(imagesFile)) {
        imagesData.push(...imagesFile);
      } else {
        imagesData.push(imagesFile);
      }
    }

    // Validate maximum 10 images
    if (imagesData.length > 10) {
      throw new BadRequestException(
        "Maximum 10 images allowed per health record",
      );
    }

    // Extract deletedImageKeys (can be string, string[], or comma-separated string)
    let deletedImageKeys: string[] = [];
    if (fields.deletedImageKeys) {
      if (Array.isArray(fields.deletedImageKeys)) {
        // Multiple deletedImageKeys fields were sent
        deletedImageKeys = fields.deletedImageKeys
          .map((key: string) => key.trim())
          .filter((key: string) => key.length > 0);
      } else {
        // Single deletedImageKeys field - could be comma-separated or JSON array string
        const value = fields.deletedImageKeys as string;
        try {
          // Try parsing as JSON array first
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            deletedImageKeys = parsed
              .map((key: string) => String(key).trim())
              .filter((key: string) => key.length > 0);
          } else {
            // If not JSON array, treat as comma-separated string
            deletedImageKeys = value
              .split(",")
              .map((key: string) => key.trim())
              .filter((key: string) => key.length > 0);
          }
        } catch {
          // If JSON parse fails, treat as comma-separated string
          deletedImageKeys = value
            .split(",")
            .map((key: string) => key.trim())
            .filter((key: string) => key.length > 0);
        }
      }
    }

    return this.healthRecordsService.updateHealthRecord(
      animalId,
      recordId,
      user.id,
      farmId,
      dto,
      imagesData.length > 0 ? imagesData : undefined,
      deletedImageKeys.length > 0 ? deletedImageKeys : undefined,
    );
  }
}
