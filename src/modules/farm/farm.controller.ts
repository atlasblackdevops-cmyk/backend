import { Body, Controller, Get, Param, Post, Put } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Auth } from "../../decorators/auth.decorator";
import { AuthUser } from "../../decorators/user.decorator";
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
  createFarm(@AuthUser() user: any, @Body() dto: CreateFarmDto) {
    return this.farmService.createFarm(user.id, dto);
  }

  @Put(":farmId")
  updateFarm(
    @AuthUser() user: any,
    @Param("farmId") farmId: string,
    @Body() dto: UpdateFarmDto,
  ) {
    return this.farmService.updateFarm(user.id, farmId, dto);
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
