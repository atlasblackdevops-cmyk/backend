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
import { CreatePlantingDto } from "./dto/create-planting.dto";
import { ListPlantingsDto } from "./dto/list-plantings.dto";
import { UpdatePlantingDto } from "./dto/update-planting.dto";
import { PlantingsService } from "./plantings.service";

@ApiTags("Plantings")
@ApiBearerAuth()
@Controller({ path: "crops/plantings", version: "1" })
export class PlantingsController {
  constructor(private readonly plantingsService: PlantingsService) {}

  @Post()
  @ApiOperation({
    summary: "Create a planting record",
    description:
      "Creates a planting record for a field. Uses the provided farmId or the user's current farm. Requires CROPS:CREATE permission.",
  })
  @RequirePermission({
    module: PermissionModule.CROPS,
    action: PermissionAction.CREATE,
    farmIdParam: "farmId",
  })
  createPlanting(@AuthUser() user: any, @Body() dto: CreatePlantingDto) {
    const fallbackFarmId =
      (user as any).currentFarm?.id || (user as any).currentFarm;
    const farmId = dto.farmId ?? fallbackFarmId;

    if (!farmId) {
      throw new BadRequestException("Farm ID is required");
    }

    return this.plantingsService.createPlanting(user.id, farmId, dto);
  }

  @Get()
  @ApiOperation({
    summary: "List planting records",
    description:
      "Lists plantings for the given farm (or current farm) with pagination and filters. Requires CROPS:LISTING permission.",
  })
  @RequirePermission({
    module: PermissionModule.CROPS,
    action: PermissionAction.LISTING,
    farmIdParam: "farmId",
  })
  listPlantings(@AuthUser() user: any, @Query() query: ListPlantingsDto) {
    const fallbackFarmId =
      (user as any).currentFarm?.id || (user as any).currentFarm;
    const farmId = query.farmId ?? fallbackFarmId;

    if (!farmId) {
      throw new BadRequestException("Farm ID is required");
    }

    return this.plantingsService.listPlantings(farmId, query);
  }

  @Get(":plantingId")
  @ApiOperation({
    summary: "Get planting details",
    description:
      "Returns details for a specific planting record. Uses current farm context. Requires CROPS:READ permission.",
  })
  @RequirePermission({
    module: PermissionModule.CROPS,
    action: PermissionAction.READ,
  })
  getPlanting(@AuthUser() user: any, @Param("plantingId") plantingId: string) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.plantingsService.getPlantingDetails(plantingId, farmId);
  }

  @Put(":plantingId")
  @ApiOperation({
    summary: "Update a planting record",
    description:
      "Updates a planting record. Uses current farm context unless farmId is supplied. Requires CROPS:UPDATE permission.",
  })
  @RequirePermission({
    module: PermissionModule.CROPS,
    action: PermissionAction.UPDATE,
    farmIdParam: "farmId",
  })
  updatePlanting(
    @AuthUser() user: any,
    @Param("plantingId") plantingId: string,
    @Body() dto: UpdatePlantingDto,
  ) {
    const fallbackFarmId =
      (user as any).currentFarm?.id || (user as any).currentFarm;
    const farmId = dto.farmId ?? fallbackFarmId;

    if (!farmId) {
      throw new BadRequestException("Farm ID is required");
    }

    return this.plantingsService.updatePlanting(
      plantingId,
      farmId,
      user.id,
      dto,
    );
  }

  @Delete(":plantingId")
  @ApiOperation({
    summary: "Delete a planting record",
    description:
      "Soft-deletes a planting record under the current farm. Requires CROPS:DELETE permission.",
  })
  @RequirePermission({
    module: PermissionModule.CROPS,
    action: PermissionAction.DELETE,
  })
  deletePlanting(
    @AuthUser() user: any,
    @Param("plantingId") plantingId: string,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.plantingsService.deletePlanting(plantingId, farmId, user.id);
  }

  @Get("stats/summary")
  @ApiOperation({
    summary: "Get planting statistics",
    description:
      "Retrieves comprehensive statistics about plantings for the current farm, including current planted crops per field, crop breakdown, upcoming harvests, and more. Requires CROPS:LISTING permission.",
  })
  @RequirePermission({
    module: PermissionModule.CROPS,
    action: PermissionAction.LISTING,
  })
  @ApiResponse({
    status: 200,
    description: "Planting statistics fetched successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Planting statistics fetched successfully",
        },
        data: {
          type: "object",
          properties: {
            summary: {
              type: "object",
              properties: {
                totalActivePlantings: { type: "number", example: 15 },
                totalFieldsWithPlantings: { type: "number", example: 8 },
                totalFields: { type: "number", example: 10 },
                totalFieldsWithoutPlantings: { type: "number", example: 2 },
                totalAreaPlanted: { type: "number", example: 125.5 },
                uniqueCrops: { type: "number", example: 5 },
                upcomingHarvestsCount: { type: "number", example: 3 },
              },
            },
            plantingsByField: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  fieldId: { type: "string", format: "uuid" },
                  fieldName: { type: "string", example: "North Field" },
                  fieldSize: { type: "number", nullable: true, example: 50 },
                  sizeUnit: {
                    type: "string",
                    nullable: true,
                    example: "acres",
                  },
                  plantings: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", format: "uuid" },
                        cropName: { type: "string", example: "Corn" },
                        seedType: { type: "string", nullable: true },
                        plantingDate: {
                          type: "string",
                          format: "date",
                          nullable: true,
                        },
                        expectedHarvestDate: {
                          type: "string",
                          format: "date",
                          nullable: true,
                        },
                        quantityPlanted: { type: "number", nullable: true },
                        quantityUnit: { type: "string", nullable: true },
                        area: { type: "number", nullable: true },
                        areaUnit: { type: "string", nullable: true },
                      },
                    },
                  },
                },
              },
            },
            fieldsWithNoActivePlantings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  fieldId: { type: "string", format: "uuid" },
                  fieldName: { type: "string", example: "South Field" },
                  fieldSize: { type: "number", nullable: true },
                  sizeUnit: { type: "string", nullable: true },
                },
              },
            },
            cropBreakdown: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  cropName: { type: "string", example: "Corn" },
                  plantingCount: { type: "number", example: 5 },
                  totalArea: { type: "number", example: 75.5 },
                  fieldsCount: { type: "number", example: 3 },
                },
              },
            },
            upcomingHarvests: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string", format: "uuid" },
                  cropName: { type: "string", example: "Wheat" },
                  fieldName: { type: "string", example: "East Field" },
                  expectedHarvestDate: { type: "string", format: "date" },
                  daysUntilHarvest: { type: "number", example: 15 },
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
    description: "User must have a current farm selected",
  })
  @ApiResponse({
    status: 404,
    description: "Farm not found",
  })
  getPlantingStats(@AuthUser() user: any) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.plantingsService.getPlantingStats(farmId);
  }
}
