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
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { RequirePermission } from "../../decorators/permission.decorator";
import { AuthUser } from "../../decorators/user.decorator";
import {
  PermissionAction,
  PermissionModule,
} from "../../enums/permission.enum";
import { CreateFieldDto } from "./dto/create-field.dto";
import { ListFieldsDto } from "./dto/list-fields.dto";
import { UpdateFieldDto } from "./dto/update-field.dto";
import { FieldsService } from "./fields.service";

@ApiTags("Fields")
@ApiBearerAuth()
@Controller({ path: "fields", version: "1" })
export class FieldsController {
  constructor(private readonly fieldsService: FieldsService) {}

  @Post()
  @ApiOperation({
    summary: "Create a new field for the current farm",
    description:
      "Creates a field under the user's current farm context. Requires CROPS:CREATE permission.",
  })
  @RequirePermission({
    module: PermissionModule.CROPS,
    action: PermissionAction.CREATE,
  })
  createField(@AuthUser() user: any, @Body() dto: CreateFieldDto) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.fieldsService.createField(user.id, farmId, dto);
  }

  @Get()
  @ApiOperation({
    summary: "List fields for the current farm",
    description:
      "Lists fields belonging to the user's current farm with pagination and filters. Requires CROPS:LISTING permission.",
  })
  @RequirePermission({
    module: PermissionModule.CROPS,
    action: PermissionAction.LISTING,
    farmIdParam: "farmId",
  })
  listFields(@AuthUser() user: any, @Query() query: ListFieldsDto) {
    const fallbackFarmId =
      (user as any).currentFarm?.id || (user as any).currentFarm;
    const farmId = query.farmId ?? fallbackFarmId;
    if (!farmId) {
      throw new BadRequestException(
        "Farm ID is required (provide farmId or set current farm)",
      );
    }

    return this.fieldsService.listFields(farmId, query);
  }

  @Get("active")
  @ApiOperation({
    summary: "List active fields for dropdowns",
    description:
      "Returns active fields for the specified farm (or user's current farm). Requires CROPS:LISTING permission.",
  })
  @RequirePermission({
    module: PermissionModule.CROPS,
    action: PermissionAction.LISTING,
    farmIdParam: "farmId",
  })
  listActiveFields(@AuthUser() user: any, @Query() query: ListFieldsDto) {
    const fallbackFarmId =
      (user as any).currentFarm?.id || (user as any).currentFarm;
    const farmId = query.farmId ?? fallbackFarmId;
    if (!farmId) {
      throw new BadRequestException(
        "Farm ID is required (provide farmId or set current farm)",
      );
    }

    return this.fieldsService.listActiveFields(farmId, query.limit ?? 1000);
  }

  @Get(":fieldId")
  @ApiOperation({
    summary: "Get details for a specific field",
    description:
      "Returns details for a field under the user's current farm. Requires CROPS:READ permission.",
  })
  @RequirePermission({
    module: PermissionModule.CROPS,
    action: PermissionAction.READ,
  })
  getField(@AuthUser() user: any, @Param("fieldId") fieldId: string) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.fieldsService.getFieldDetails(fieldId, farmId);
  }

  @Put(":fieldId")
  @ApiOperation({
    summary: "Update a field",
    description:
      "Updates a field belonging to the user's current farm. Requires CROPS:UPDATE permission.",
  })
  @RequirePermission({
    module: PermissionModule.CROPS,
    action: PermissionAction.UPDATE,
  })
  updateField(
    @AuthUser() user: any,
    @Param("fieldId") fieldId: string,
    @Body() dto: UpdateFieldDto,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.fieldsService.updateField(fieldId, farmId, user.id, dto);
  }

  @Delete(":fieldId")
  @ApiOperation({
    summary: "Delete a field",
    description:
      "Soft-deletes a field belonging to the user's current farm. Requires CROPS:DELETE permission.",
  })
  @RequirePermission({
    module: PermissionModule.CROPS,
    action: PermissionAction.DELETE,
  })
  deleteField(@AuthUser() user: any, @Param("fieldId") fieldId: string) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.fieldsService.deleteField(fieldId, farmId, user.id);
  }
}
