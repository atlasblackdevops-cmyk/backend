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
import { BrowseListingsDto } from "./dto/browse-listings.dto";
import { CreateListingDto } from "./dto/create-listing.dto";
import { ListListingsDto } from "./dto/list-listings.dto";
import { UpdateListingDto } from "./dto/update-listing.dto";
import { ListingsService } from "./listings.service";

@ApiTags("Marketplace Listings")
@ApiBearerAuth()
@Controller({ path: "marketplace", version: "1" })
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  // ========== BROWSE ENDPOINTS (Public Marketplace) ==========

  @Get("browse")
  @ApiOperation({
    summary: "Browse marketplace listings",
    description:
      "Browse all active marketplace listings from other farms. Excludes listings from the user's own farm. Supports filtering by category, location, and distance. Requires authentication to identify user's farm.",
  })
  @ApiResponse({
    status: 200,
    description: "Listings fetched successfully",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        statusCode: { type: "number", example: 200 },
        message: {
          type: "string",
          example: "Listings fetched successfully",
        },
        data: {
          type: "object",
          properties: {
            listings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string", format: "uuid" },
                  title: { type: "string" },
                  price: { type: "string" },
                  category: { type: "string" },
                  city: { type: "string", nullable: true },
                  state: { type: "string", nullable: true },
                  country: { type: "string", nullable: true },
                  shippingAvailable: { type: "boolean" },
                  imageUrl: {
                    type: "string",
                    nullable: true,
                    example: "https://presigned-s3-url...",
                    description: "First image URL for grid view",
                  },
                  farm: {
                    type: "object",
                    properties: {
                      id: { type: "string", format: "uuid" },
                      farmName: { type: "string" },
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
  async browseListings(
    @AuthUser() user: any,
    @Query() query: BrowseListingsDto,
  ) {
    const userFarmId =
      (user as any)?.currentFarm?.id || (user as any)?.currentFarm || null;

    return this.listingsService.browseListings(userFarmId, query);
  }

  @Get("browse/:listingId")
  @ApiOperation({
    summary: "Get marketplace listing details for browsing",
    description:
      "Retrieves detailed information about a specific active marketplace listing from other farms. Cannot access listings from your own farm. Requires authentication.",
  })
  @ApiResponse({
    status: 200,
    description: "Listing details fetched successfully",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        statusCode: { type: "number", example: 200 },
        message: {
          type: "string",
          example: "Listing details fetched successfully",
        },
        data: {
          type: "object",
          properties: {
            listing: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                title: { type: "string" },
                description: { type: "string", nullable: true },
                category: { type: "string" },
                price: { type: "string" },
                quantityAvailable: { type: "string" },
                quantityUnit: { type: "string", nullable: true },
                city: { type: "string", nullable: true },
                state: { type: "string", nullable: true },
                country: { type: "string", nullable: true },
                shippingAvailable: { type: "boolean" },
                images: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string", format: "uuid" },
                      imageKey: { type: "string" },
                      imageUrl: {
                        type: "string",
                        example: "https://presigned-s3-url...",
                      },
                    },
                  },
                },
                farm: {
                  type: "object",
                  properties: {
                    id: { type: "string", format: "uuid" },
                    farmName: { type: "string" },
                    city: { type: "string", nullable: true },
                    state: { type: "string", nullable: true },
                    country: { type: "string", nullable: true },
                  },
                },
                seller: {
                  type: "object",
                  properties: {
                    id: { type: "string", format: "uuid" },
                    email: { type: "string" },
                  },
                },
                createdAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string", format: "date-time" },
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
      "Forbidden - Cannot browse your own farm's listings or listing is not active",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: false },
        statusCode: { type: "number", example: 403 },
        message: {
          type: "string",
          example:
            "You cannot browse your own farm's listings. Use the farm management endpoints instead.",
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Listing not found or not active",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: false },
        statusCode: { type: "number", example: 404 },
        message: {
          type: "string",
          example: "Listing not found",
        },
      },
    },
  })
  async browseListingDetails(
    @Param("listingId") listingId: string,
    @AuthUser() user: any,
  ) {
    const userFarmId =
      (user as any)?.currentFarm?.id || (user as any)?.currentFarm || null;

    return this.listingsService.browseListingDetails(listingId, userFarmId);
  }

  // ========== FARM MANAGEMENT ENDPOINTS ==========

  @Post("listings")
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Create a new marketplace listing",
    description:
      "Creates a new marketplace listing for the user's current farm. The farm ID is automatically retrieved from the user's token (currentFarm). Requires MARKETPLACE:CREATE permission. Multiple photos can be uploaded.",
  })
  @ApiBody({
    schema: {
      type: "object",
      required: ["title", "price", "quantityAvailable"],
      properties: {
        title: {
          type: "string",
          description: "Listing title",
          example: "Fresh Organic Tomatoes",
        },
        description: {
          type: "string",
          description: "Listing description",
          example: "Fresh organic tomatoes from our farm",
        },
        category: {
          type: "string",
          enum: [
            "produce",
            "livestock",
            "equipment",
            "seeds",
            "fertilizer",
            "other",
          ],
          description: "Product category",
          example: "produce",
        },
        price: {
          type: "number",
          description: "Price per unit",
          example: 25.99,
        },
        quantityAvailable: {
          type: "number",
          description: "Quantity available",
          example: 100,
        },
        quantityUnit: {
          type: "string",
          description: "Quantity unit (e.g., kg, lbs, pieces)",
          example: "kg",
        },
        city: {
          type: "string",
          description: "City",
          example: "Springfield",
        },
        state: {
          type: "string",
          description: "State",
          example: "Illinois",
        },
        country: {
          type: "string",
          description: "Country",
          example: "USA",
        },
        shippingAvailable: {
          type: "boolean",
          description: "Whether shipping is available",
          example: true,
        },
        status: {
          type: "string",
          enum: ["active", "inactive", "sold", "pending"],
          description: "Listing status",
          example: "active",
        },
        photos: {
          type: "array",
          items: {
            type: "string",
            format: "binary",
          },
          description: "Listing photos (multiple images allowed)",
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: "Listing created successfully",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        statusCode: { type: "number", example: 201 },
        message: {
          type: "string",
          example: "Listing created successfully",
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
        success: { type: "boolean", example: false },
        statusCode: { type: "number", example: 400 },
        message: {
          type: "string",
          example: "Title is required",
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
      "Forbidden - User does not have MARKETPLACE:CREATE permission or is not a member of the farm",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: false },
        statusCode: { type: "number", example: 403 },
        message: {
          type: "string",
          example: "Permission denied: MARKETPLACE:CREATE is required",
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
        success: { type: "boolean", example: false },
        statusCode: { type: "number", example: 404 },
        message: {
          type: "string",
          example: "Farm not found",
        },
      },
    },
  })
  @RequirePermission({
    module: PermissionModule.MARKETPLACE,
    action: PermissionAction.CREATE,
  })
  async createListing(@AuthUser() user: any, @Req() req: FastifyRequest) {
    const { fields, files } = await parseMultipartData(req);

    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    const dto: CreateListingDto = {
      title: getFieldValue(fields.title) ?? "",
      description: getFieldValue(fields.description),
      category: getFieldValue(fields.category) as any,
      price: getFieldValue(fields.price)
        ? parseFloat(getFieldValue(fields.price)!)
        : undefined,
      quantityAvailable: getFieldValue(fields.quantityAvailable)
        ? parseFloat(getFieldValue(fields.quantityAvailable)!)
        : undefined,
      quantityUnit: getFieldValue(fields.quantityUnit),
      city: getFieldValue(fields.city),
      state: getFieldValue(fields.state),
      country: getFieldValue(fields.country),
      shippingAvailable: getFieldValue(fields.shippingAvailable)
        ? getFieldValue(fields.shippingAvailable) === "true"
        : undefined,
      status: getFieldValue(fields.status) as any,
    };

    if (!dto.title) {
      throw new BadRequestException("Title is required");
    }

    // Handle multiple photos
    const photos = files.get("photos");
    let images: Array<{ buffer: Buffer; filename: string }> | undefined;

    if (photos) {
      if (Array.isArray(photos)) {
        images = photos.map((photo) => ({
          buffer: photo.buffer,
          filename: photo.filename,
        }));
      } else {
        images = [
          {
            buffer: photos.buffer,
            filename: photos.filename,
          },
        ];
      }
    }

    return this.listingsService.createListing(user.id, farmId, dto, images);
  }

  @Get("listings")
  @ApiOperation({
    summary: "List marketplace listings for the current farm",
    description:
      "Retrieves a paginated list of marketplace listings for the user's current farm. Supports search and filtering. Requires MARKETPLACE:LISTING permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Listings fetched successfully",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        statusCode: { type: "number", example: 200 },
        message: {
          type: "string",
          example: "Listings fetched successfully",
        },
        data: {
          type: "object",
          properties: {
            listings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string", format: "uuid" },
                  title: { type: "string" },
                  description: { type: "string", nullable: true },
                  category: { type: "string" },
                  price: { type: "string" },
                  quantityAvailable: { type: "string" },
                  quantityUnit: { type: "string", nullable: true },
                  city: { type: "string", nullable: true },
                  state: { type: "string", nullable: true },
                  country: { type: "string", nullable: true },
                  shippingAvailable: { type: "boolean" },
                  status: { type: "string" },
                  images: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", format: "uuid" },
                        imageKey: { type: "string" },
                        imageUrl: {
                          type: "string",
                          example: "https://presigned-s3-url...",
                        },
                      },
                    },
                  },
                  createdAt: { type: "string", format: "date-time" },
                  updatedAt: { type: "string", format: "date-time" },
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
        success: { type: "boolean", example: false },
        statusCode: { type: "number", example: 400 },
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
      "Forbidden - User does not have MARKETPLACE:LISTING permission",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: false },
        statusCode: { type: "number", example: 403 },
        message: {
          type: "string",
          example: "Permission denied: MARKETPLACE:LISTING is required",
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
        success: { type: "boolean", example: false },
        statusCode: { type: "number", example: 404 },
        message: {
          type: "string",
          example: "Farm not found",
        },
      },
    },
  })
  @RequirePermission({
    module: PermissionModule.MARKETPLACE,
    action: PermissionAction.LISTING,
  })
  async listListings(@AuthUser() user: any, @Query() query: ListListingsDto) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.listingsService.listListings(farmId, query);
  }

  @Get("listings/:listingId")
  @ApiOperation({
    summary: "Get listing details by ID",
    description:
      "Retrieves detailed information about a specific listing by its ID. The listing must belong to the user's current farm. Requires MARKETPLACE:READ permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Listing details fetched successfully",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        statusCode: { type: "number", example: 200 },
        message: {
          type: "string",
          example: "Listing details fetched successfully",
        },
        data: {
          type: "object",
          properties: {
            listing: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                title: { type: "string" },
                description: { type: "string", nullable: true },
                category: { type: "string" },
                price: { type: "string" },
                quantityAvailable: { type: "string" },
                quantityUnit: { type: "string", nullable: true },
                city: { type: "string", nullable: true },
                state: { type: "string", nullable: true },
                country: { type: "string", nullable: true },
                shippingAvailable: { type: "boolean" },
                status: { type: "string" },
                images: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string", format: "uuid" },
                      imageKey: { type: "string" },
                      imageUrl: {
                        type: "string",
                        example: "https://presigned-s3-url...",
                      },
                    },
                  },
                },
                createdAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string", format: "date-time" },
                farm: { type: "object" },
                seller: { type: "object" },
                createdBy: { type: "object", nullable: true },
                updatedBy: { type: "object", nullable: true },
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
        success: { type: "boolean", example: false },
        statusCode: { type: "number", example: 400 },
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
      "Forbidden - User does not have MARKETPLACE:READ permission or listing does not belong to current farm",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: false },
        statusCode: { type: "number", example: 403 },
        message: {
          type: "string",
          example: "Listing does not belong to your current farm",
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Listing not found",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: false },
        statusCode: { type: "number", example: 404 },
        message: {
          type: "string",
          example: "Listing not found",
        },
      },
    },
  })
  @RequirePermission({
    module: PermissionModule.MARKETPLACE,
    action: PermissionAction.READ,
  })
  async getListingDetails(
    @Param("listingId") listingId: string,
    @AuthUser() user: any,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.listingsService.getListingDetails(listingId, user.id, farmId);
  }

  @Put("listings/:listingId")
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Update marketplace listing",
    description:
      "Updates an existing marketplace listing. The listing must belong to the user's current farm. Requires MARKETPLACE:UPDATE permission. Photos can be added or removed.",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Listing title",
          example: "Fresh Organic Tomatoes",
        },
        description: {
          type: "string",
          description: "Listing description",
        },
        category: {
          type: "string",
          enum: [
            "produce",
            "livestock",
            "equipment",
            "seeds",
            "fertilizer",
            "other",
          ],
          description: "Product category",
        },
        price: {
          type: "number",
          description: "Price per unit",
        },
        quantityAvailable: {
          type: "number",
          description: "Quantity available",
        },
        quantityUnit: {
          type: "string",
          description: "Quantity unit",
        },
        city: {
          type: "string",
          description: "City",
        },
        state: {
          type: "string",
          description: "State",
        },
        country: {
          type: "string",
          description: "Country",
        },
        shippingAvailable: {
          type: "boolean",
          description: "Whether shipping is available",
        },
        status: {
          type: "string",
          enum: ["active", "inactive", "sold", "pending"],
          description: "Listing status",
        },
        photos: {
          type: "array",
          items: {
            type: "string",
            format: "binary",
          },
          description: "New photos to add (multiple images allowed)",
        },
        deletedImageIds: {
          type: "string",
          description: "Comma-separated list of image IDs to delete",
          example: "uuid1,uuid2",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Listing updated successfully",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        statusCode: { type: "number", example: 200 },
        message: {
          type: "string",
          example: "Listing updated successfully",
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
        success: { type: "boolean", example: false },
        statusCode: { type: "number", example: 400 },
        message: {
          type: "string",
          example: "Title cannot be empty",
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description:
      "Forbidden - User does not have MARKETPLACE:UPDATE permission or listing does not belong to current farm",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: false },
        statusCode: { type: "number", example: 403 },
        message: {
          type: "string",
          example: "Listing does not belong to your current farm",
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Listing not found",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: false },
        statusCode: { type: "number", example: 404 },
        message: {
          type: "string",
          example: "Listing not found",
        },
      },
    },
  })
  @RequirePermission({
    module: PermissionModule.MARKETPLACE,
    action: PermissionAction.UPDATE,
  })
  async updateListing(
    @Param("listingId") listingId: string,
    @AuthUser() user: any,
    @Req() req: FastifyRequest,
  ) {
    const { fields, files } = await parseMultipartData(req);

    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    const dto: UpdateListingDto = {
      title: getFieldValue(fields.title),
      description: getFieldValue(fields.description),
      category: getFieldValue(fields.category) as any,
      price: getFieldValue(fields.price)
        ? parseFloat(getFieldValue(fields.price)!)
        : undefined,
      quantityAvailable: getFieldValue(fields.quantityAvailable)
        ? parseFloat(getFieldValue(fields.quantityAvailable)!)
        : undefined,
      quantityUnit: getFieldValue(fields.quantityUnit),
      city: getFieldValue(fields.city),
      state: getFieldValue(fields.state),
      country: getFieldValue(fields.country),
      shippingAvailable: getFieldValue(fields.shippingAvailable)
        ? getFieldValue(fields.shippingAvailable) === "true"
        : undefined,
      status: getFieldValue(fields.status) as any,
    };

    // Handle new photos
    const photos = files.get("photos");
    let newImages: Array<{ buffer: Buffer; filename: string }> | undefined;

    if (photos) {
      if (Array.isArray(photos)) {
        newImages = photos.map((photo) => ({
          buffer: photo.buffer,
          filename: photo.filename,
        }));
      } else {
        newImages = [
          {
            buffer: photos.buffer,
            filename: photos.filename,
          },
        ];
      }
    }

    // Handle deleted image IDs
    const deletedImageIdsStr = getFieldValue(fields.deletedImageIds);
    let deletedImageIds: string[] | undefined;
    if (deletedImageIdsStr) {
      deletedImageIds = deletedImageIdsStr
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id.length > 0);
    }

    return this.listingsService.updateListing(
      listingId,
      user.id,
      farmId,
      dto,
      newImages,
      deletedImageIds,
    );
  }

  @Delete("listings/:listingId")
  @ApiOperation({
    summary: "Delete marketplace listing",
    description:
      "Soft deletes a marketplace listing. The listing must belong to the user's current farm. Requires MARKETPLACE:DELETE permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Listing deleted successfully",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        statusCode: { type: "number", example: 200 },
        message: {
          type: "string",
          example: "Listing deleted successfully",
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
        success: { type: "boolean", example: false },
        statusCode: { type: "number", example: 400 },
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
      "Forbidden - User does not have MARKETPLACE:DELETE permission or listing does not belong to current farm",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: false },
        statusCode: { type: "number", example: 403 },
        message: {
          type: "string",
          example: "Listing does not belong to your current farm",
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Listing not found",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: false },
        statusCode: { type: "number", example: 404 },
        message: {
          type: "string",
          example: "Listing not found",
        },
      },
    },
  })
  @RequirePermission({
    module: PermissionModule.MARKETPLACE,
    action: PermissionAction.DELETE,
  })
  async deleteListing(
    @Param("listingId") listingId: string,
    @AuthUser() user: any,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.listingsService.deleteListing(listingId, user.id, farmId);
  }
}
