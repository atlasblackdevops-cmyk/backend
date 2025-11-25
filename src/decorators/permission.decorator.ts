import { applyDecorators, SetMetadata, UseGuards } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { PermissionGuard } from "../guards/permission.guard";
import { JwtAuthGuard } from "../modules/auth/jwt-auth.guard";

interface PermissionOptions {
  module: string;
  action: string;
  farmIdParam?: string; // Name of the parameter that contains farmId (default: "farmId")
}

export function RequirePermission(options: PermissionOptions) {
  return applyDecorators(
    ApiBearerAuth(),
    SetMetadata("permission", options),
    UseGuards(JwtAuthGuard, PermissionGuard),
  );
}
