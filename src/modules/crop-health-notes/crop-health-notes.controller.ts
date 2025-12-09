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
  Req,
} from "@nestjs/common";
import {
  ApiBearerAuth,
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
import { CropHealthNotesService } from "./crop-health-notes.service";
import { CreateCropHealthNoteDto } from "./dto/create-crop-health-note.dto";
import { ListCropHealthNoteDto } from "./dto/list-crop-health-note.dto";
import { UpdateCropHealthNoteDto } from "./dto/update-crop-health-note.dto";

interface FileData {
  buffer: Buffer;
  filename: string;
}

@ApiTags("Crop Health Notes")
@ApiBearerAuth()
@Controller({ path: "crop-health-notes", version: "1" })
export class CropHealthNotesController {
  constructor(
    private readonly cropHealthNotesService: CropHealthNotesService,
  ) {}

  @Post()
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Create a new crop health note",
    description:
      "Creates a new crop health note for the user's current farm. The farm ID is automatically retrieved from the user's token (currentFarm). Requires CROPS:CREATE permission. Field must belong to the current farm. Images are optional. If provided, image notes are optional and mapped by index (imageNotes[0] for images[0]).",
  })
  @ApiResponse({
    status: 201,
    description: "Crop health note created successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Crop health note created successfully",
        },
        data: {
          type: "object",
          properties: {
            note: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                  example: "123e4567-e89b-12d3-a456-426614174000",
                },
                noteDate: {
                  type: "string",
                  format: "date",
                  example: "2024-06-15",
                  nullable: true,
                },
                healthStatus: {
                  type: "string",
                  example: "Healthy",
                  nullable: true,
                },
                description: {
                  type: "string",
                  example: "Crops looking good, no signs of disease",
                  nullable: true,
                },
                actionTaken: {
                  type: "string",
                  example: "Applied fertilizer as scheduled",
                  nullable: true,
                },
                createdAt: {
                  type: "string",
                  format: "date-time",
                  example: "2024-06-15T10:30:00Z",
                },
                updatedAt: {
                  type: "string",
                  format: "date-time",
                  example: "2024-06-15T10:30:00Z",
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
                notedBy: {
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
                images: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: {
                        type: "string",
                        format: "uuid",
                      },
                      imageUrl: {
                        type: "string",
                        example: "https://presigned-s3-url...",
                        nullable: true,
                      },
                      notes: {
                        type: "string",
                        example: "Close-up of healthy leaves",
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
  async createCropHealthNote(
    @AuthUser() user: any,
    @Body() dto: CreateCropHealthNoteDto,
    @Req() req: FastifyRequest,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    // Handle Fastify multipart files
    const fileData: FileData[] = [];
    const imageNotes: string[] = [];

    try {
      const parts = req.parts();
      const imageMap = new Map<number, FileData>();
      const notesMap = new Map<number, string>();

      for await (const part of parts) {
        if (part.type === "file") {
          const filePart = part as any;
          const buffer = await filePart.toBuffer();
          const fieldName = filePart.fieldname || "";

          // Extract index from field name (e.g., "images[0]" -> 0)
          const match = fieldName.match(/images\[(\d+)\]/);
          if (match) {
            const index = parseInt(match[1], 10);
            imageMap.set(index, {
              buffer,
              filename: filePart.filename || "image",
            });
          } else if (fieldName === "images" || fieldName.startsWith("images")) {
            // Handle case where field name is just "images" or "images[]"
            imageMap.set(imageMap.size, {
              buffer,
              filename: filePart.filename || "image",
            });
          }
        } else {
          // Handle form fields (including imageNotes)
          const fieldPart = part as any;
          const fieldName = fieldPart.fieldname || "";
          const value = fieldPart.value as string;

          if (fieldName.startsWith("imageNotes")) {
            // Extract index from field name (e.g., "imageNotes[0]" -> 0)
            const match = fieldName.match(/imageNotes\[(\d+)\]/);
            if (match) {
              const index = parseInt(match[1], 10);
              notesMap.set(index, value);
            } else if (fieldName === "imageNotes") {
              // Handle single value or array
              if (Array.isArray(value)) {
                value.forEach((v, i) => notesMap.set(i, v));
              } else {
                notesMap.set(0, value);
              }
            }
          }
        }
      }

      // Sort images by index and create fileData array
      const sortedIndices = Array.from(imageMap.keys()).sort((a, b) => a - b);
      const finalImageNotes: string[] = [];

      for (const index of sortedIndices) {
        fileData.push(imageMap.get(index)!);
        // Get corresponding note if exists, otherwise null
        finalImageNotes.push(notesMap.get(index) || "");
      }

      // Only pass imageNotes if at least one note exists
      const hasNotes = finalImageNotes.some((note) => note.trim().length > 0);
      if (hasNotes) {
        imageNotes.push(...finalImageNotes);
      }
    } catch (error) {
      throw new BadRequestException(
        `Failed to process files: ${error.message || "Unknown error"}`,
      );
    }

    return this.cropHealthNotesService.createCropHealthNote(
      user.id,
      farmId,
      dto,
      fileData,
      imageNotes.length > 0 ? imageNotes : undefined,
    );
  }

  @Get()
  @ApiOperation({
    summary: "List crop health notes for the current farm",
    description:
      "Retrieves a paginated list of crop health notes for the user's current farm. The farm ID is automatically retrieved from the user's token (currentFarm). Supports filtering by field and note date range. Requires CROPS:LISTING permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Crop health notes fetched successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Crop health notes fetched successfully",
        },
        data: {
          type: "object",
          properties: {
            notes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: {
                    type: "string",
                    format: "uuid",
                  },
                  noteDate: {
                    type: "string",
                    format: "date",
                    nullable: true,
                  },
                  healthStatus: {
                    type: "string",
                    nullable: true,
                  },
                  description: {
                    type: "string",
                    nullable: true,
                  },
                  actionTaken: {
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
                  notedBy: {
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
                  images: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: {
                          type: "string",
                          format: "uuid",
                        },
                        imageUrl: {
                          type: "string",
                          nullable: true,
                        },
                        notes: {
                          type: "string",
                          nullable: true,
                        },
                      },
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
  async listCropHealthNotes(
    @AuthUser() user: any,
    @Query() query: ListCropHealthNoteDto,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.cropHealthNotesService.listCropHealthNotes(farmId, query);
  }

  @Get(":noteId")
  @ApiOperation({
    summary: "Get crop health note details by ID",
    description:
      "Retrieves detailed information about a specific crop health note by its ID. The note must belong to the user's current farm. Requires CROPS:READ permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Crop health note details fetched successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Crop health note details fetched successfully",
        },
        data: {
          type: "object",
          properties: {
            note: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                },
                noteDate: {
                  type: "string",
                  format: "date",
                  nullable: true,
                },
                healthStatus: {
                  type: "string",
                  nullable: true,
                },
                description: {
                  type: "string",
                  nullable: true,
                },
                actionTaken: {
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
                notedBy: {
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
                images: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: {
                        type: "string",
                        format: "uuid",
                      },
                      imageUrl: {
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
    status: 403,
    description:
      "Forbidden - User does not have CROPS:READ permission or note does not belong to current farm",
  })
  @ApiResponse({
    status: 404,
    description: "Crop health note not found",
  })
  @RequirePermission({
    module: PermissionModule.CROPS,
    action: PermissionAction.READ,
  })
  async getCropHealthNoteDetails(
    @AuthUser() user: any,
    @Param("noteId") noteId: string,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.cropHealthNotesService.getCropHealthNoteDetails(
      noteId,
      user.id,
      farmId,
    );
  }

  @Put(":noteId")
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Update a crop health note",
    description:
      "Updates an existing crop health note. The note must belong to the user's current farm. All fields are optional. If images are provided, all existing images will be replaced with new ones. Requires CROPS:UPDATE permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Crop health note updated successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Crop health note updated successfully",
        },
        data: {
          type: "object",
          properties: {
            note: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                },
                noteDate: {
                  type: "string",
                  format: "date",
                  nullable: true,
                },
                healthStatus: {
                  type: "string",
                  nullable: true,
                },
                description: {
                  type: "string",
                  nullable: true,
                },
                actionTaken: {
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
                notedBy: {
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
                images: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: {
                        type: "string",
                        format: "uuid",
                      },
                      imageUrl: {
                        type: "string",
                        nullable: true,
                      },
                      notes: {
                        type: "string",
                        nullable: true,
                      },
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
    description: "Bad request - validation error",
  })
  @ApiResponse({
    status: 403,
    description:
      "Forbidden - User does not have CROPS:UPDATE permission or note does not belong to current farm",
  })
  @ApiResponse({
    status: 404,
    description: "Crop health note or field not found",
  })
  @RequirePermission({
    module: PermissionModule.CROPS,
    action: PermissionAction.UPDATE,
  })
  async updateCropHealthNote(
    @AuthUser() user: any,
    @Param("noteId") noteId: string,
    @Body() dto: UpdateCropHealthNoteDto,
    @Req() req: FastifyRequest,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    // Handle Fastify multipart files (optional for update)
    let fileData: FileData[] | undefined = undefined;
    const imageNotes: string[] = [];

    try {
      const parts = req.parts();
      const imageMap = new Map<number, FileData>();
      const notesMap = new Map<number, string>();

      for await (const part of parts) {
        if (part.type === "file") {
          const filePart = part as any;
          const buffer = await filePart.toBuffer();
          const fieldName = filePart.fieldname || "";

          // Extract index from field name (e.g., "images[0]" -> 0)
          const match = fieldName.match(/images\[(\d+)\]/);
          if (match) {
            const index = parseInt(match[1], 10);
            imageMap.set(index, {
              buffer,
              filename: filePart.filename || "image",
            });
          } else if (fieldName === "images" || fieldName.startsWith("images")) {
            // Handle case where field name is just "images" or "images[]"
            imageMap.set(imageMap.size, {
              buffer,
              filename: filePart.filename || "image",
            });
          }
        } else {
          // Handle form fields (including imageNotes)
          const fieldPart = part as any;
          const fieldName = fieldPart.fieldname || "";
          const value = fieldPart.value as string;

          if (fieldName.startsWith("imageNotes")) {
            // Extract index from field name (e.g., "imageNotes[0]" -> 0)
            const match = fieldName.match(/imageNotes\[(\d+)\]/);
            if (match) {
              const index = parseInt(match[1], 10);
              notesMap.set(index, value);
            } else if (fieldName === "imageNotes") {
              // Handle single value or array
              if (Array.isArray(value)) {
                value.forEach((v, i) => notesMap.set(i, v));
              } else {
                notesMap.set(0, value);
              }
            }
          }
        }
      }

      // Only process if files were uploaded
      if (imageMap.size > 0) {
        // Sort images by index and create fileData array
        const sortedIndices = Array.from(imageMap.keys()).sort((a, b) => a - b);
        fileData = [];
        const finalImageNotes: string[] = [];

        for (const index of sortedIndices) {
          fileData.push(imageMap.get(index)!);
          // Get corresponding note if exists, otherwise empty string
          finalImageNotes.push(notesMap.get(index) || "");
        }

        // Only add imageNotes if at least one note exists
        const hasNotes = finalImageNotes.some((note) => note.trim().length > 0);
        if (hasNotes) {
          imageNotes.push(...finalImageNotes);
        }
      }
    } catch (error) {
      // If no files, that's okay for update
      if (error.message && !error.message.includes("multipart")) {
        throw new BadRequestException(
          `Failed to process files: ${error.message || "Unknown error"}`,
        );
      }
    }

    return this.cropHealthNotesService.updateCropHealthNote(
      noteId,
      user.id,
      farmId,
      dto,
      fileData,
      imageNotes.length > 0 ? imageNotes : undefined,
    );
  }

  @Delete(":noteId")
  @ApiOperation({
    summary: "Delete a crop health note (soft delete)",
    description:
      "Soft deletes a crop health note by setting the deletedAt timestamp. The note must belong to the user's current farm. Images will also be deleted from S3. Requires CROPS:DELETE permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Crop health note deleted successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Crop health note deleted successfully",
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description:
      "Forbidden - User does not have CROPS:DELETE permission or note does not belong to current farm",
  })
  @ApiResponse({
    status: 404,
    description: "Crop health note not found",
  })
  @RequirePermission({
    module: PermissionModule.CROPS,
    action: PermissionAction.DELETE,
  })
  async deleteCropHealthNote(
    @AuthUser() user: any,
    @Param("noteId") noteId: string,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.cropHealthNotesService.deleteCropHealthNote(
      noteId,
      user.id,
      farmId,
    );
  }
}
