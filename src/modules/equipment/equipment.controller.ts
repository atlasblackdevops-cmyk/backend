import {
  BadRequestException,
  Controller,
  Delete,
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
import { CreateEquipmentDto } from "./dto/create-equipment.dto";
import { ListEquipmentDto } from "./dto/list-equipment.dto";
import { UpdateEquipmentDto } from "./dto/update-equipment.dto";
import { EquipmentService } from "./equipment.service";

@ApiTags("Equipment")
@ApiBearerAuth()
@Controller({ path: "equipment", version: "1" })
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Post()
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Create a new equipment record",
    description:
      "Creates a new equipment record for the user's current farm. The farm ID is automatically retrieved from the user's token (currentFarm). Requires EQUIPMENT:CREATE permission. Photo upload is optional.",
  })
  @ApiBody({
    schema: {
      type: "object",
      required: ["equipmentName"],
      properties: {
        equipmentName: {
          type: "string",
          description: "Equipment name",
          example: "John Deere Tractor",
        },
        equipmentType: {
          type: "string",
          description: "Equipment type (tractor, harvester, sprayer, etc.)",
          example: "tractor",
        },
        brand: {
          type: "string",
          description: "Brand name",
          example: "John Deere",
        },
        model: {
          type: "string",
          description: "Model name",
          example: "9R 370",
        },
        serialNumber: {
          type: "string",
          description: "Serial number",
          example: "JD123456789",
        },
        purchaseDate: {
          type: "string",
          format: "date",
          description: "Purchase date in ISO format (YYYY-MM-DD)",
          example: "2020-05-15",
        },
        purchaseCost: {
          type: "number",
          description: "Purchase cost",
          example: 150000,
        },
        status: {
          type: "string",
          enum: ["operational", "under_maintenance", "broken", "retired"],
          description: "Equipment status",
          example: "operational",
        },
        notes: {
          type: "string",
          description: "Additional notes",
        },
        photo: {
          type: "string",
          format: "binary",
          description: "Equipment photo (image file)",
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: "Equipment created successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Equipment created successfully",
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
          example: "Equipment name is required",
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
      "Forbidden - User does not have EQUIPMENT:CREATE permission or is not a member of the farm",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Permission denied: EQUIPMENT:CREATE is required",
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
    module: PermissionModule.EQUIPMENT,
    action: PermissionAction.CREATE,
  })
  async createEquipment(@AuthUser() user: any, @Req() req: FastifyRequest) {
    const { fields, files } = await parseMultipartData(req);

    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    const dto: CreateEquipmentDto = {
      equipmentName: getFieldValue(fields.equipmentName) ?? "",
      equipmentType: getFieldValue(fields.equipmentType),
      brand: getFieldValue(fields.brand),
      model: getFieldValue(fields.model),
      serialNumber: getFieldValue(fields.serialNumber),
      purchaseDate: getFieldValue(fields.purchaseDate),
      purchaseCost: getFieldValue(fields.purchaseCost)
        ? parseFloat(getFieldValue(fields.purchaseCost)!)
        : undefined,
      status: getFieldValue(fields.status),
      notes: getFieldValue(fields.notes),
    };

    if (!dto.equipmentName) {
      throw new BadRequestException("Equipment name is required");
    }

    const photo = files.get("photo");
    let photoBuffer: Buffer | undefined;
    let photoFilename: string | undefined;

    if (photo) {
      if (Array.isArray(photo)) {
        photoBuffer = photo[0]?.buffer;
        photoFilename = photo[0]?.filename;
      } else {
        photoBuffer = photo.buffer;
        photoFilename = photo.filename;
      }
    }

    return this.equipmentService.createEquipment(
      user.id,
      farmId,
      dto,
      photoBuffer,
      photoFilename,
    );
  }

  @Get()
  @ApiOperation({
    summary: "List equipment for the current farm",
    description:
      "Retrieves a paginated list of equipment records for the user's current farm. Supports search and filtering. Requires EQUIPMENT:LISTING permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Equipment list fetched successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Equipment fetched successfully",
        },
        data: {
          type: "object",
          properties: {
            equipment: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: {
                    type: "string",
                    format: "uuid",
                  },
                  equipmentName: {
                    type: "string",
                  },
                  equipmentType: {
                    type: "string",
                    nullable: true,
                  },
                  brand: {
                    type: "string",
                    nullable: true,
                  },
                  model: {
                    type: "string",
                    nullable: true,
                  },
                  status: {
                    type: "string",
                  },
                  photo: {
                    type: "string",
                    nullable: true,
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
  @RequirePermission({
    module: PermissionModule.EQUIPMENT,
    action: PermissionAction.LISTING,
  })
  async listEquipment(@AuthUser() user: any, @Query() query: ListEquipmentDto) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.equipmentService.listEquipment(farmId, query);
  }

  @Get(":equipmentId")
  @ApiOperation({
    summary: "Get equipment details by ID",
    description:
      "Retrieves detailed information about a specific equipment by its ID. The equipment must belong to the user's current farm. Requires EQUIPMENT:READ permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Equipment details fetched successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Equipment details fetched successfully",
        },
        data: {
          type: "object",
          properties: {
            equipment: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                },
                equipmentName: {
                  type: "string",
                },
                equipmentType: {
                  type: "string",
                  nullable: true,
                },
                brand: {
                  type: "string",
                  nullable: true,
                },
                model: {
                  type: "string",
                  nullable: true,
                },
                serialNumber: {
                  type: "string",
                  nullable: true,
                },
                purchaseDate: {
                  type: "string",
                  format: "date",
                  nullable: true,
                },
                purchaseCost: {
                  type: "string",
                  nullable: true,
                },
                photo: {
                  type: "string",
                  nullable: true,
                },
                status: {
                  type: "string",
                },
                notes: {
                  type: "string",
                  nullable: true,
                },
                lastServiceAt: {
                  type: "string",
                  format: "date",
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
                farm: {
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
    action: PermissionAction.READ,
  })
  async getEquipmentDetails(
    @Param("equipmentId") equipmentId: string,
    @AuthUser() user: any,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.equipmentService.getEquipmentDetails(
      equipmentId,
      user.id,
      farmId,
    );
  }

  @Put(":equipmentId")
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Update equipment record",
    description:
      "Updates an existing equipment record. The equipment must belong to the user's current farm. Requires EQUIPMENT:UPDATE permission. Photo upload is optional.",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        equipmentName: {
          type: "string",
          description: "Equipment name",
          example: "John Deere Tractor",
        },
        equipmentType: {
          type: "string",
          description: "Equipment type (tractor, harvester, sprayer, etc.)",
          example: "tractor",
        },
        brand: {
          type: "string",
          description: "Brand name",
          example: "John Deere",
        },
        model: {
          type: "string",
          description: "Model name",
          example: "9R 370",
        },
        serialNumber: {
          type: "string",
          description: "Serial number",
          example: "JD123456789",
        },
        purchaseDate: {
          type: "string",
          format: "date",
          description: "Purchase date in ISO format (YYYY-MM-DD)",
          example: "2020-05-15",
        },
        purchaseCost: {
          type: "number",
          description: "Purchase cost",
          example: 150000,
        },
        status: {
          type: "string",
          enum: ["operational", "under_maintenance", "broken", "retired"],
          description: "Equipment status",
          example: "operational",
        },
        notes: {
          type: "string",
          description: "Additional notes",
        },
        photo: {
          type: "string",
          format: "binary",
          description: "Equipment photo (image file)",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Equipment updated successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Equipment updated successfully",
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
    action: PermissionAction.UPDATE,
  })
  async updateEquipment(
    @Param("equipmentId") equipmentId: string,
    @AuthUser() user: any,
    @Req() req: FastifyRequest,
  ) {
    const { fields, files } = await parseMultipartData(req);

    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    const dto: UpdateEquipmentDto = {
      equipmentName: getFieldValue(fields.equipmentName),
      equipmentType: getFieldValue(fields.equipmentType),
      brand: getFieldValue(fields.brand),
      model: getFieldValue(fields.model),
      serialNumber: getFieldValue(fields.serialNumber),
      purchaseDate: getFieldValue(fields.purchaseDate),
      purchaseCost: getFieldValue(fields.purchaseCost)
        ? parseFloat(getFieldValue(fields.purchaseCost)!)
        : undefined,
      status: getFieldValue(fields.status),
      notes: getFieldValue(fields.notes),
    };

    const photo = files.get("photo");
    let photoBuffer: Buffer | undefined;
    let photoFilename: string | undefined;

    if (photo) {
      if (Array.isArray(photo)) {
        photoBuffer = photo[0]?.buffer;
        photoFilename = photo[0]?.filename;
      } else {
        photoBuffer = photo.buffer;
        photoFilename = photo.filename;
      }
    }

    return this.equipmentService.updateEquipment(
      equipmentId,
      user.id,
      farmId,
      dto,
      photoBuffer,
      photoFilename,
    );
  }

  @Delete(":equipmentId")
  @ApiOperation({
    summary: "Delete equipment record",
    description:
      "Soft deletes an equipment record. The equipment must belong to the user's current farm. Requires EQUIPMENT:DELETE permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Equipment deleted successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Equipment deleted successfully",
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
    action: PermissionAction.DELETE,
  })
  async deleteEquipment(
    @Param("equipmentId") equipmentId: string,
    @AuthUser() user: any,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.equipmentService.deleteEquipment(equipmentId, user.id, farmId);
  }
}
