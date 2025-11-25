import { applyDecorators, SetMetadata, UseGuards } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { FarmRole } from "../enums/user.enum";
import { FarmRoleGuard } from "../guards/farm-role.guard";
import { JwtAuthGuard } from "../modules/auth/jwt-auth.guard";

export function RequireFarmRole(roles: FarmRole[], farmIdParam?: string) {
  return applyDecorators(
    ApiBearerAuth(),
    SetMetadata("farmRoles", roles),
    SetMetadata("farmIdParam", farmIdParam || "farmId"),
    UseGuards(JwtAuthGuard, FarmRoleGuard),
  );
}
