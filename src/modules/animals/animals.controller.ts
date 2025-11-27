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
import { parseMultipartData } from "../../utils/multipart.helper";
import { AnimalsService } from "./animals.service";
import { CreateAnimalDto } from "./dto/create-animal.dto";
import { ListAnimalsDto } from "./dto/list-animals.dto";
import { UpdateAnimalDto } from "./dto/update-animal.dto";

@ApiTags("Animals")
@ApiBearerAuth()
@Controller({ path: "animals", version: "1" })
export class AnimalsController {
  constructor(private readonly animalsService: AnimalsService) {}

  @Post()
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Create a new animal entry for the current farm",
    description:
      "Creates a new animal record for the user's current farm. The farm ID is automatically retrieved from the user's token (currentFarm). Requires LIVESTOCK:CREATE permission. Image upload is optional.",
  })
  @ApiBody({
    schema: {
      type: "object",
      required: ["name"],
      properties: {
        name: {
          type: "string",
          description: "Display name of the animal",
          example: "Bessie",
        },
        species: {
          type: "string",
          description: "Animal species",
          example: "Cow",
        },
        breed: {
          type: "string",
          description: "Animal breed",
          example: "Holstein",
        },
        gender: {
          type: "string",
          description: "Animal gender",
          example: "Female",
        },
        birthdate: {
          type: "string",
          format: "date",
          description: "Birthdate in ISO format (YYYY-MM-DD)",
          example: "2020-05-15",
        },
        image: {
          type: "string",
          format: "binary",
          description: "Animal photo (image file)",
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: "Animal created successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Animal created successfully",
        },
        data: {
          type: "object",
          properties: {
            animal: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                  example: "123e4567-e89b-12d3-a456-426614174000",
                },
                name: { type: "string", example: "Bessie" },
                species: { type: "string", example: "Cow", nullable: true },
                breed: { type: "string", example: "Holstein", nullable: true },
                gender: {
                  type: "string",
                  example: "Female",
                  nullable: true,
                },
                birthdate: {
                  type: "string",
                  format: "date",
                  example: "2020-05-15",
                  nullable: true,
                },
                photo: {
                  type: "string",
                  example:
                    "https://bucket.s3.region.amazonaws.com/animal-photos/photo.jpg",
                  nullable: true,
                },
                isActive: { type: "boolean", example: true },
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
                farm: {
                  type: "object",
                  properties: {
                    id: {
                      type: "string",
                      format: "uuid",
                      example: "123e4567-e89b-12d3-a456-426614174000",
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
                      example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    name: {
                      type: "string",
                      example: "John Doe",
                      nullable: true,
                    },
                    email: { type: "string", example: "john@example.com" },
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
                    name: {
                      type: "string",
                      example: "John Doe",
                      nullable: true,
                    },
                    email: { type: "string", example: "john@example.com" },
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
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Animal name is required",
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
      "Forbidden - User does not have LIVESTOCK:CREATE permission or is not a member of the farm",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Permission denied: LIVESTOCK:CREATE is required",
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
    module: PermissionModule.LIVESTOCK,
    action: PermissionAction.CREATE,
  })
  async createAnimal(@AuthUser() user: any, @Req() req: FastifyRequest) {
    const { fields, files } = await parseMultipartData(req);

    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    const dto: CreateAnimalDto = {
      name: fields.name ?? "",
      species: fields.species,
      breed: fields.breed,
      gender: fields.gender,
      birthdate: fields.birthdate,
    };

    if (!dto.name) {
      throw new BadRequestException("Animal name is required");
    }

    const image = files.get("image");
    const imageBuffer = image?.buffer;
    const imageFilename = image?.filename;

    return this.animalsService.createAnimal(
      user.id,
      farmId,
      dto,
      imageBuffer,
      imageFilename,
    );
  }

  @Get()
  @ApiOperation({
    summary: "List animals for the current farm",
    description:
      "Retrieves a paginated list of animals for the user's current farm. The farm ID is automatically retrieved from the user's token (currentFarm). Supports search filtering, gender filtering, and birthdate range filtering. Requires LIVESTOCK:LISTING permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Animals fetched successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Animals fetched successfully",
        },
        data: {
          type: "object",
          properties: {
            animals: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: {
                    type: "string",
                    format: "uuid",
                    example: "123e4567-e89b-12d3-a456-426614174000",
                  },
                  name: { type: "string", example: "Bessie" },
                  species: { type: "string", example: "Cow", nullable: true },
                  breed: {
                    type: "string",
                    example: "Holstein",
                    nullable: true,
                  },
                  gender: {
                    type: "string",
                    example: "Female",
                    nullable: true,
                  },
                  birthdate: {
                    type: "string",
                    format: "date",
                    example: "2020-05-15",
                    nullable: true,
                  },
                  photo: {
                    type: "string",
                    example:
                      "https://bucket.s3.region.amazonaws.com/animal-photos/photo.jpg",
                    nullable: true,
                  },
                  isActive: { type: "boolean", example: true },
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
                  createdBy: {
                    type: "object",
                    nullable: true,
                    properties: {
                      id: {
                        type: "string",
                        format: "uuid",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                      },
                      name: {
                        type: "string",
                        example: "John Doe",
                        nullable: true,
                      },
                      email: { type: "string", example: "john@example.com" },
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
                      name: {
                        type: "string",
                        example: "John Doe",
                        nullable: true,
                      },
                      email: { type: "string", example: "john@example.com" },
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
    description:
      "Forbidden - User does not have LIVESTOCK:LISTING permission or is not a member of the farm",
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
    module: PermissionModule.LIVESTOCK,
    action: PermissionAction.LISTING,
  })
  async listAnimals(@AuthUser() user: any, @Query() query: ListAnimalsDto) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.animalsService.listAnimals(farmId, query);
  }

  @Get(":animalId")
  @ApiOperation({
    summary: "Get animal details by ID",
    description:
      "Retrieves detailed information about a specific animal by its ID. The animal must belong to the user's current farm. Requires LIVESTOCK:READ permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Animal details fetched successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Animal details fetched successfully",
        },
        data: {
          type: "object",
          properties: {
            animal: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                  example: "123e4567-e89b-12d3-a456-426614174000",
                },
                name: { type: "string", example: "Bessie" },
                species: { type: "string", example: "Cow", nullable: true },
                breed: {
                  type: "string",
                  example: "Holstein",
                  nullable: true,
                },
                gender: {
                  type: "string",
                  example: "Female",
                  nullable: true,
                },
                birthdate: {
                  type: "string",
                  format: "date",
                  example: "2020-05-15",
                  nullable: true,
                },
                photo: {
                  type: "string",
                  example:
                    "https://bucket.s3.region.amazonaws.com/animal-photos/photo.jpg",
                  nullable: true,
                },
                isActive: { type: "boolean", example: true },
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
                farm: {
                  type: "object",
                  properties: {
                    id: {
                      type: "string",
                      format: "uuid",
                      example: "123e4567-e89b-12d3-a456-426614174000",
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
                      example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    name: {
                      type: "string",
                      example: "John Doe",
                      nullable: true,
                    },
                    email: { type: "string", example: "john@example.com" },
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
                    name: {
                      type: "string",
                      example: "John Doe",
                      nullable: true,
                    },
                    email: { type: "string", example: "john@example.com" },
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
      "Forbidden - User does not have LIVESTOCK:READ permission or animal does not belong to current farm",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Permission denied: LIVESTOCK:READ is required",
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Animal not found",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Animal not found",
        },
      },
    },
  })
  @RequirePermission({
    module: PermissionModule.LIVESTOCK,
    action: PermissionAction.READ,
  })
  async getAnimalDetails(
    @AuthUser() user: any,
    @Param("animalId") animalId: string,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.animalsService.getAnimalDetails(animalId, user.id, farmId);
  }

  @Put(":animalId")
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Update an animal",
    description:
      "Updates an existing animal record. The animal must belong to the user's current farm. All fields are optional. Requires LIVESTOCK:UPDATE permission. Image upload is optional.",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Display name of the animal",
          example: "Bessie",
        },
        species: {
          type: "string",
          description: "Animal species",
          example: "Cow",
        },
        breed: {
          type: "string",
          description: "Animal breed",
          example: "Holstein",
        },
        gender: {
          type: "string",
          description: "Animal gender",
          example: "Female",
        },
        birthdate: {
          type: "string",
          format: "date",
          description: "Birthdate in ISO format (YYYY-MM-DD)",
          example: "2020-05-15",
        },
        image: {
          type: "string",
          format: "binary",
          description: "Animal photo (image file)",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Animal updated successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Animal updated successfully",
        },
        data: {
          type: "object",
          properties: {
            animal: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                  example: "123e4567-e89b-12d3-a456-426614174000",
                },
                name: { type: "string", example: "Bessie" },
                species: { type: "string", example: "Cow", nullable: true },
                breed: { type: "string", example: "Holstein", nullable: true },
                gender: {
                  type: "string",
                  example: "Female",
                  nullable: true,
                },
                birthdate: {
                  type: "string",
                  format: "date",
                  example: "2020-05-15",
                  nullable: true,
                },
                photo: {
                  type: "string",
                  example:
                    "https://bucket.s3.region.amazonaws.com/animal-photos/photo.jpg",
                  nullable: true,
                },
                isActive: { type: "boolean", example: true },
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
                farm: {
                  type: "object",
                  properties: {
                    id: {
                      type: "string",
                      format: "uuid",
                      example: "123e4567-e89b-12d3-a456-426614174000",
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
                      example: "123e4567-e89b-12d3-a456-426614174000",
                    },
                    name: {
                      type: "string",
                      example: "John Doe",
                      nullable: true,
                    },
                    email: { type: "string", example: "john@example.com" },
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
                    name: {
                      type: "string",
                      example: "John Doe",
                      nullable: true,
                    },
                    email: { type: "string", example: "john@example.com" },
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
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Animal name cannot be empty",
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
      "Forbidden - User does not have LIVESTOCK:UPDATE permission or animal does not belong to current farm",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Permission denied: LIVESTOCK:UPDATE is required",
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Animal not found",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Animal not found",
        },
      },
    },
  })
  @RequirePermission({
    module: PermissionModule.LIVESTOCK,
    action: PermissionAction.UPDATE,
  })
  async updateAnimal(
    @AuthUser() user: any,
    @Param("animalId") animalId: string,
    @Req() req: FastifyRequest,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    const { fields, files } = await parseMultipartData(req);

    const dto: UpdateAnimalDto = {
      name: fields.name,
      species: fields.species,
      breed: fields.breed,
      gender: fields.gender,
      birthdate: fields.birthdate,
    };

    const image = files.get("image");
    const imageBuffer = image?.buffer;
    const imageFilename = image?.filename;

    return this.animalsService.updateAnimal(
      animalId,
      user.id,
      farmId,
      dto,
      imageBuffer,
      imageFilename,
    );
  }

  @Delete(":animalId")
  @ApiOperation({
    summary: "Delete an animal (soft delete)",
    description:
      "Soft deletes an animal by setting the deletedAt timestamp. The animal must belong to the user's current farm. Requires LIVESTOCK:DELETE permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Animal deleted successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Animal deleted successfully",
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description:
      "Forbidden - User does not have LIVESTOCK:DELETE permission or animal does not belong to current farm",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Permission denied: LIVESTOCK:DELETE is required",
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Animal not found",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Animal not found",
        },
      },
    },
  })
  @RequirePermission({
    module: PermissionModule.LIVESTOCK,
    action: PermissionAction.DELETE,
  })
  async deleteAnimal(
    @AuthUser() user: any,
    @Param("animalId") animalId: string,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.animalsService.deleteAnimal(animalId, user.id, farmId);
  }
}
