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
    @Req() req: FastifyRequest,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    // Handle Fastify multipart files and form fields
    const fileData: FileData[] = [];
    const imageNotes: string[] = [];
    const formFields: Record<string, any> = {};

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
          // Handle form fields
          const fieldPart = part as any;
          const fieldName = fieldPart.fieldname || "";
          const value = fieldPart.value as string;

          // Extract regular form fields
          if (
            fieldName === "fieldId" ||
            fieldName === "noteDate" ||
            fieldName === "healthStatus" ||
            fieldName === "description" ||
            fieldName === "actionTaken"
          ) {
            formFields[fieldName] = value;
          }

          // Handle imageNotes (for new images)
          if (fieldName.startsWith("imageNotes")) {
            const match = fieldName.match(/imageNotes\[(\d+)\]/);
            if (match) {
              const index = parseInt(match[1], 10);
              notesMap.set(index, value);
            } else if (fieldName === "imageNotes") {
              if (Array.isArray(value)) {
                value.forEach((v, i) => notesMap.set(i, v));
              } else {
                notesMap.set(0, value);
              }
            }
          }
        }
      }

      // Build DTO from form fields
      const parsedDto: CreateCropHealthNoteDto = {
        fieldId: formFields.fieldId,
        noteDate: formFields.noteDate,
        healthStatus: formFields.healthStatus,
        description: formFields.description,
        actionTaken: formFields.actionTaken,
        imageNotes: undefined,
      };

      // Validate required fields
      if (!parsedDto.fieldId) {
        throw new BadRequestException("fieldId is required");
      }
      if (!parsedDto.noteDate) {
        throw new BadRequestException("noteDate is required");
      }

      // Validate UUID format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(parsedDto.fieldId)) {
        throw new BadRequestException("fieldId must be a valid UUID");
      }

      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(parsedDto.noteDate)) {
        throw new BadRequestException(
          "noteDate must be a valid ISO 8601 date string (YYYY-MM-DD)",
        );
      }

      // Sort images by index and create fileData array
      const sortedIndices = Array.from(imageMap.keys()).sort((a, b) => a - b);
      const finalImageNotes: string[] = [];

      for (const index of sortedIndices) {
        fileData.push(imageMap.get(index)!);
        // Get corresponding note if exists, otherwise empty string
        finalImageNotes.push(notesMap.get(index) || "");
      }

      // Only pass imageNotes if at least one note exists
      const hasNotes = finalImageNotes.some((note) => note.trim().length > 0);
      if (hasNotes) {
        parsedDto.imageNotes = finalImageNotes;
        imageNotes.push(...finalImageNotes);
      }

      return this.cropHealthNotesService.createCropHealthNote(
        user.id,
        farmId,
        parsedDto,
        fileData,
        imageNotes.length > 0 ? imageNotes : undefined,
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to process request: ${error.message || "Unknown error"}`,
      );
    }
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
      "Updates an existing crop health note. The note must belong to the user's current farm. All fields are optional. " +
      "You can: " +
      "1) Update notes for existing images using 'existingImageNotes' (JSON array with imageId and notes) without re-uploading, " +
      "2) Add new images with optional notes using 'images[]' and 'imageNotes[]', " +
      "3) Delete specific images using 'deleteImageIds' (JSON array of image IDs), " +
      "4) Update other note fields (fieldId, noteDate, healthStatus, description, actionTaken). " +
      "Requires CROPS:UPDATE permission.",
  })
  @ApiBody({
    description: "Form data for updating crop health note",
    schema: {
      type: "object",
      properties: {
        fieldId: {
          type: "string",
          format: "uuid",
          description: "Field ID (optional)",
        },
        noteDate: {
          type: "string",
          format: "date",
          description: "Note date in YYYY-MM-DD format (optional)",
        },
        healthStatus: {
          type: "string",
          description: "Health status (optional)",
        },
        description: {
          type: "string",
          description: "Description (optional)",
        },
        actionTaken: {
          type: "string",
          description: "Action taken (optional)",
        },
        images: {
          type: "array",
          items: {
            type: "string",
            format: "binary",
          },
          description:
            "New images to add (optional). Use images[0], images[1], etc.",
        },
        imageNotes: {
          type: "array",
          items: {
            type: "string",
          },
          description:
            "Notes for new images (optional). Use imageNotes[0], imageNotes[1], etc. Index-based mapping.",
        },
        existingImageNotes: {
          type: "string",
          description:
            'JSON array of existing image notes to update. Format: [{"imageId": "uuid", "notes": "text"}]',
          example:
            '[{"imageId": "123e4567-e89b-12d3-a456-426614174000", "notes": "Updated note"}, {"imageId": "123e4567-e89b-12d3-a456-426614174001", "notes": null}]',
        },
        deleteImageIds: {
          type: "string",
          description:
            'JSON array of image IDs to delete. Format: ["uuid1", "uuid2"]',
          example: '["123e4567-e89b-12d3-a456-426614174002"]',
        },
      },
    },
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
    @Req() req: FastifyRequest,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    // Handle Fastify multipart files and form fields (optional for update)
    let fileData: FileData[] | undefined = undefined;
    const imageNotes: string[] = [];
    const formFields: Record<string, any> = {};

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
          // Handle form fields
          const fieldPart = part as any;
          const fieldName = fieldPart.fieldname || "";
          const value = fieldPart.value as string;

          // Extract regular form fields
          if (
            fieldName === "fieldId" ||
            fieldName === "noteDate" ||
            fieldName === "healthStatus" ||
            fieldName === "description" ||
            fieldName === "actionTaken"
          ) {
            formFields[fieldName] = value;
          }

          // Handle imageNotes (for new images)
          if (fieldName.startsWith("imageNotes")) {
            const match = fieldName.match(/imageNotes\[(\d+)\]/);
            if (match) {
              const index = parseInt(match[1], 10);
              notesMap.set(index, value);
            } else if (fieldName === "imageNotes") {
              if (Array.isArray(value)) {
                value.forEach((v, i) => notesMap.set(i, v));
              } else {
                notesMap.set(0, value);
              }
            }
          }

          // Handle existingImageNotes (JSON array)
          if (fieldName === "existingImageNotes") {
            try {
              const parsed = JSON.parse(value);
              // Normalize 'id' to 'imageId' for compatibility
              if (Array.isArray(parsed)) {
                formFields.existingImageNotes = parsed.map((item) => ({
                  imageId: item.imageId || item.id,
                  notes: item.notes,
                }));
              } else {
                formFields.existingImageNotes = parsed;
              }
            } catch (error) {
              throw new BadRequestException(
                "existingImageNotes must be a valid JSON array",
              );
            }
          }

          // Handle deleteImageIds (JSON array or comma-separated)
          if (fieldName === "deleteImageIds") {
            try {
              // Try parsing as JSON first
              const parsed = JSON.parse(value);
              formFields.deleteImageIds = Array.isArray(parsed)
                ? parsed
                : [parsed];
            } catch (error) {
              // If not JSON, try comma-separated string
              if (typeof value === "string" && value.trim()) {
                formFields.deleteImageIds = value
                  .split(",")
                  .map((id) => id.trim())
                  .filter((id) => id.length > 0);
              } else {
                formFields.deleteImageIds = [];
              }
            }
          }
        }
      }

      // Build DTO from form fields (all optional for update)
      const parsedDto: UpdateCropHealthNoteDto = {
        fieldId: formFields.fieldId,
        noteDate: formFields.noteDate,
        healthStatus: formFields.healthStatus,
        description: formFields.description,
        actionTaken: formFields.actionTaken,
        imageNotes: undefined,
        existingImageNotes: formFields.existingImageNotes,
        deleteImageIds: formFields.deleteImageIds,
      };

      // Validate formats if provided
      if (parsedDto.fieldId) {
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(parsedDto.fieldId)) {
          throw new BadRequestException("fieldId must be a valid UUID");
        }
      }

      if (parsedDto.noteDate) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(parsedDto.noteDate)) {
          throw new BadRequestException(
            "noteDate must be a valid ISO 8601 date string (YYYY-MM-DD)",
          );
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
          parsedDto.imageNotes = finalImageNotes;
          imageNotes.push(...finalImageNotes);
        }
      }

      return this.cropHealthNotesService.updateCropHealthNote(
        noteId,
        user.id,
        farmId,
        parsedDto,
        fileData,
        imageNotes.length > 0 ? imageNotes : undefined,
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      // If no files and no form fields, that's okay for update
      if (error.message && error.message.includes("multipart")) {
        const emptyDto: UpdateCropHealthNoteDto = {};
        return this.cropHealthNotesService.updateCropHealthNote(
          noteId,
          user.id,
          farmId,
          emptyDto,
          undefined,
          undefined,
        );
      }
      throw new BadRequestException(
        `Failed to process request: ${error.message || "Unknown error"}`,
      );
    }
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
