import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../modules/auth/jwt-auth.guard";
import { SpeciesBreedService } from "./species-breed.service";

@ApiTags("Species & Breeds")
@ApiBearerAuth()
@Controller({ path: "species-breeds", version: "1" })
export class SpeciesBreedController {
  constructor(private readonly speciesBreedService: SpeciesBreedService) {}

  @Get("species")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get list of all species",
    description:
      "Retrieves a list of all available animal species. Requires authentication token. Accessible to OWNER, MANAGER, and USER roles.",
  })
  @ApiResponse({
    status: 200,
    description: "Species fetched successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Species fetched successfully",
        },
        data: {
          type: "object",
          properties: {
            species: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: {
                    type: "string",
                    format: "uuid",
                    example: "123e4567-e89b-12d3-a456-426614174000",
                  },
                  name: {
                    type: "string",
                    example: "Cattle",
                  },
                  slug: {
                    type: "string",
                    example: "cattle",
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
                },
              },
            },
          },
        },
      },
    },
  })
  async listSpecies() {
    return this.speciesBreedService.listSpecies();
  }

  @Get("breeds/:speciesId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get list of breeds by species",
    description:
      "Retrieves a list of all breeds for a specific species. Requires authentication token. Accessible to OWNER, MANAGER, and USER roles.",
  })
  @ApiParam({
    name: "speciesId",
    type: "string",
    format: "uuid",
    description: "Species ID (UUID)",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: 200,
    description: "Breeds fetched successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Breeds fetched successfully",
        },
        data: {
          type: "object",
          properties: {
            breeds: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: {
                    type: "string",
                    format: "uuid",
                    example: "123e4567-e89b-12d3-a456-426614174001",
                  },
                  name: {
                    type: "string",
                    example: "Holstein",
                  },
                  slug: {
                    type: "string",
                    example: "holstein",
                  },
                  species: {
                    type: "object",
                    properties: {
                      id: {
                        type: "string",
                        format: "uuid",
                        example: "123e4567-e89b-12d3-a456-426614174000",
                      },
                      name: {
                        type: "string",
                        example: "Cattle",
                      },
                      slug: {
                        type: "string",
                        example: "cattle",
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
    description: "Species not found",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 404 },
        message: { type: "string", example: "Species not found" },
      },
    },
  })
  async listBreedsBySpecies(@Param("speciesId") speciesId: string) {
    return this.speciesBreedService.listBreedsBySpecies(speciesId);
  }
}
