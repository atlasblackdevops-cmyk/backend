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
import { parseMultipartData } from "../../utils/multipart.helper";
import { CreateFarmDto } from "./dto/create-farm.dto";
import { SwitchFarmDto } from "./dto/switch-farm.dto";
import { UpdateFarmDto } from "./dto/update-farm.dto";
import { FarmService } from "./farm.service";

@ApiTags("Farms")
@Auth()
@Controller({ path: "farms", version: "1" }) // All endpoints require JWT authentication
export class FarmController {
  constructor(private readonly farmService: FarmService) {}

  @Post()
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Create a new farm",
    description:
      "Create a new farm owned by the authenticated user. Farm logo is optional. Use multipart/form-data.",
  })
  @ApiResponse({
    status: 201,
    description: "Farm created successfully",
  })
  async createFarm(@AuthUser() user: any, @Req() req: FastifyRequest) {
    const { fields, files } = await parseMultipartData(req);

    const dto: CreateFarmDto = {
      farmName: fields.farmName || "",
      city: fields.city,
      state: fields.state,
      country: fields.country,
      address: fields.address,
    };

    const farmLogo = files.get("farmLogo");
    const farmLogoFile = farmLogo?.buffer;
    const farmLogoFilename = farmLogo?.filename;

    return this.farmService.createFarm(
      user.id,
      dto,
      farmLogoFile,
      farmLogoFilename,
    );
  }

  @Put(":farmId")
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Update farm details",
    description:
      "Update farm details including name, city, state, country, address, and logo. All fields are optional. Use multipart/form-data.",
  })
  @ApiResponse({
    status: 200,
    description: "Farm updated successfully",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - You do not own this farm",
  })
  async updateFarm(
    @AuthUser() user: any,
    @Param("farmId") farmId: string,
    @Req() req: FastifyRequest,
  ) {
    const { fields, files } = await parseMultipartData(req);

    const dto: UpdateFarmDto = {};
    if (fields.farmName) {
      dto.farmName = fields.farmName;
    }
    if (fields.city) {
      dto.city = fields.city;
    }
    if (fields.state) {
      dto.state = fields.state;
    }
    if (fields.country) {
      dto.country = fields.country;
    }
    if (fields.address) {
      dto.address = fields.address;
    }
    if (fields.isActive) {
      dto.isActive = fields.isActive === "true" || fields.isActive === "1";
    }

    const farmLogo = files.get("farmLogo");
    const farmLogoFile = farmLogo?.buffer;
    const farmLogoFilename = farmLogo?.filename;

    return this.farmService.updateFarm(
      user.id,
      farmId,
      dto,
      farmLogoFile,
      farmLogoFilename,
    );
  }

  @Get()
  listFarms(@AuthUser() user: any) {
    return this.farmService.getOwnerFarms(user.id);
  }

  @Post("switch")
  switchFarm(@AuthUser() user: any, @Body() dto: SwitchFarmDto) {
    return this.farmService.switchFarm(user.id, dto.farmId);
  }

  @Get(":farmId")
  farmDetails(@AuthUser() user: any, @Param("farmId") farmId: string) {
    return this.farmService.getFarmDetails(user.id, farmId);
  }
}
