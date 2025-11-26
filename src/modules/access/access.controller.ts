import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Auth } from "../../decorators/auth.decorator";
import { AccessService } from "./access.service";

@ApiTags("Access Management")
@Auth()
@Controller({ path: "access", version: "1" })
export class AccessController {
  constructor(private readonly accessService: AccessService) {}

  @Get("permissions")
  @ApiOperation({
    summary: "List permissions grouped by module",
    description:
      "Returns every permission in the system, grouped by module for permission checkboxes/UI builders.",
  })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        message: { type: "string", example: "Permissions fetched successfully" },
        data: {
          type: "array",
          items: {
            type: "object",
            properties: {
              module: { type: "string", example: "CROPS" },
              actions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: {
                      type: "string",
                      format: "uuid",
                      example: "8fae2e2d-2a40-4f5b-8e4e-d0f7d27d0a0c",
                    },
                    action: { type: "string", example: "READ" },
                    description: {
                      type: "string",
                      example: "View individual records in CROPS module",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  getPermissions() {
    return this.accessService.listPermissionsByModule();
  }

  @Get("roles")
  @ApiOperation({
    summary: "List assignable roles",
    description:
      "Returns roles that can be assigned to regular users (excludes SUPER_ADMIN and OWNER).",
  })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        message: { type: "string", example: "Roles fetched successfully" },
        data: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: {
                type: "string",
                format: "uuid",
                example: "9bb73406-4c74-4fdd-a35b-2e76c869f2bb",
              },
              roleName: { type: "string", example: "MANAGER" },
            },
          },
        },
      },
    },
  })
  getAssignableRoles() {
    return this.accessService.listAssignableRoles();
  }
}
