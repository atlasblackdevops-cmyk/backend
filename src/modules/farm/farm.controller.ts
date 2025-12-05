import { Body, Controller, Get, Param, Post, Put, Req } from "@nestjs/common";
import {
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { FastifyRequest } from "fastify";
import { Auth } from "../../decorators/auth.decorator";
import { AuthUser } from "../../decorators/user.decorator";
import { UserRole } from "../../enums/user.enum";
import {
  getFieldValue,
  parseMultipartData,
} from "../../utils/multipart.helper";
import { CreateFarmDto } from "./dto/create-farm.dto";
import { SwitchFarmDto } from "./dto/switch-farm.dto";
import { UpdateFarmDto } from "./dto/update-farm.dto";
import { FarmService } from "./farm.service";

@ApiTags("Farms")
@Controller({ path: "farms", version: "1" })
export class FarmController {
  constructor(private readonly farmService: FarmService) {}

  @Post()
  @Auth([UserRole.OWNER])
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Create a new farm",
    description:
      "Create a new farm owned by the authenticated user. Only users with OWNER role can create farms. Farm logo is optional. Use multipart/form-data.",
  })
  @ApiResponse({
    status: 201,
    description: "Farm created successfully",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Only users with OWNER role can create farms",
  })
  async createFarm(@AuthUser() user: any, @Req() req: FastifyRequest) {
    const { fields, files } = await parseMultipartData(req);

    const dto: CreateFarmDto = {
      farmName: getFieldValue(fields.farmName) || "",
      city: getFieldValue(fields.city),
      state: getFieldValue(fields.state),
      country: getFieldValue(fields.country),
      address: getFieldValue(fields.address),
    };

    const farmLogo = files.get("farmLogo");
    // Handle both single file and array (from updated multipart helper)
    let farmLogoFile: Buffer | undefined;
    let farmLogoFilename: string | undefined;

    if (farmLogo) {
      if (Array.isArray(farmLogo)) {
        // If array, take the first file
        farmLogoFile = farmLogo[0]?.buffer;
        farmLogoFilename = farmLogo[0]?.filename;
      } else {
        farmLogoFile = farmLogo.buffer;
        farmLogoFilename = farmLogo.filename;
      }
    }

    return this.farmService.createFarm(
      user.id,
      dto,
      farmLogoFile,
      farmLogoFilename,
    );
  }

  @Put(":farmId")
  @Auth([UserRole.OWNER])
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Update farm details",
    description:
      "Update farm details including name, city, state, country, address, and logo. Only the farm owner with OWNER role can update. All fields are optional. Use multipart/form-data.",
  })
  @ApiResponse({
    status: 200,
    description: "Farm updated successfully",
  })
  @ApiResponse({
    status: 403,
    description:
      "Forbidden - You do not own this farm or you don't have OWNER role",
  })
  async updateFarm(
    @AuthUser() user: any,
    @Param("farmId") farmId: string,
    @Req() req: FastifyRequest,
  ) {
    const { fields, files } = await parseMultipartData(req);

    const dto: UpdateFarmDto = {};
    if (fields.farmName) {
      dto.farmName = getFieldValue(fields.farmName);
    }
    if (fields.city) {
      dto.city = getFieldValue(fields.city);
    }
    if (fields.state) {
      dto.state = getFieldValue(fields.state);
    }
    if (fields.country) {
      dto.country = getFieldValue(fields.country);
    }
    if (fields.address) {
      dto.address = getFieldValue(fields.address);
    }
    if (fields.isActive) {
      const isActiveValue = getFieldValue(fields.isActive);
      dto.isActive = isActiveValue === "true" || isActiveValue === "1";
    }

    const farmLogo = files.get("farmLogo");
    // Handle both single file and array (from updated multipart helper)
    let farmLogoFile: Buffer | undefined;
    let farmLogoFilename: string | undefined;

    if (farmLogo) {
      if (Array.isArray(farmLogo)) {
        // If array, take the first file
        farmLogoFile = farmLogo[0]?.buffer;
        farmLogoFilename = farmLogo[0]?.filename;
      } else {
        farmLogoFile = farmLogo.buffer;
        farmLogoFilename = farmLogo.filename;
      }
    }

    return this.farmService.updateFarm(
      user.id,
      farmId,
      dto,
      farmLogoFile,
      farmLogoFilename,
    );
  }

  @Get()
  @Auth()
  @ApiOperation({
    summary: "List all farms where user is a member",
    description:
      "Returns all farms where the authenticated user is a member (OWNER, MANAGER, or USER role).",
  })
  @ApiResponse({
    status: 200,
    description: "List of farms where user is a member",
  })
  listFarms(@AuthUser() user: any) {
    return this.farmService.getOwnerFarms(user.id);
  }

  @Post("switch")
  @Auth()
  @ApiOperation({
    summary: "Switch current farm",
    description:
      "Switch the user's current farm to a farm where they are a member (OWNER, MANAGER, or USER role).",
  })
  @ApiResponse({
    status: 200,
    description: "Farm switched successfully",
  })
  @ApiResponse({
    status: 403,
    description:
      "Forbidden - User does not have access to this farm (not a member)",
  })
  @ApiResponse({
    status: 404,
    description: "Farm not found",
  })
  switchFarm(@AuthUser() user: any, @Body() dto: SwitchFarmDto) {
    return this.farmService.switchFarm(user.id, dto.farmId);
  }

  @Get(":farmId")
  @Auth()
  farmDetails(@AuthUser() user: any, @Param("farmId") farmId: string) {
    return this.farmService.getFarmDetails(user.id, farmId);
  }
}
