import { Body, Controller, Get, Param, Post, Put, Query } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Auth } from "../../decorators/auth.decorator";
import { AuthUser } from "../../decorators/user.decorator";
import { CreateUserDto } from "./dto/create-user.dto";
import { ListUsersDto } from "./dto/list-users.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersService } from "./users.service";

@ApiTags("Users")
@Auth()
@ApiBearerAuth()
@Controller({ path: "users", version: "1" })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({
    summary: "Add a new user to the current farm",
    description:
      "Creates a new user and adds them to the farm associated with the authenticated user's token. The farm ID is automatically retrieved from the user's currentFarm. Only farm owners can add users.",
  })
  @ApiResponse({
    status: 201,
    description: "User created and added to farm successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "User created and added to farm successfully",
        },
        data: {
          type: "object",
          properties: {
            user: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                email: { type: "string", example: "user@example.com" },
                name: { type: "string", example: "John Doe" },
                role: {
                  type: "object",
                  properties: {
                    id: { type: "string", format: "uuid" },
                    roleName: { type: "string", example: "MANAGER" },
                  },
                },
              },
            },
            farmMember: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                farmId: { type: "string", format: "uuid" },
                farmName: { type: "string", example: "My Farm" },
              },
            },
            permissions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string", format: "uuid" },
                  module: { type: "string", example: "LIVESTOCK" },
                  action: { type: "string", example: "CREATE" },
                  description: {
                    type: "string",
                    example: "Create new records in LIVESTOCK module",
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
    status: 400,
    description:
      "Bad request - Invalid input or role/permission validation failed",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Only farm owners can add users",
  })
  @ApiResponse({
    status: 404,
    description: "Not found - Farm or role not found",
  })
  @ApiResponse({
    status: 409,
    description: "Conflict - User already exists as a member of this farm",
  })
  async createUser(
    @AuthUser() user: { id: string },
    @Body() dto: CreateUserDto,
  ) {
    return this.usersService.createUser(user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary: "List users in the current farm",
    description:
      "Get a paginated list of users in the current farm with optional filters for role and active status. Only farm owners can list users.",
  })
  @ApiResponse({
    status: 200,
    description: "Users fetched successfully",
    schema: {
      type: "object",
      properties: {
        message: { type: "string", example: "Users fetched successfully" },
        data: {
          type: "object",
          properties: {
            users: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string", format: "uuid" },
                  user: {
                    type: "object",
                    properties: {
                      id: { type: "string", format: "uuid" },
                      email: { type: "string" },
                      name: { type: "string" },
                      mobile: { type: "string", nullable: true },
                      isActive: { type: "boolean" },
                      emailVerified: { type: "boolean" },
                      createdAt: { type: "string", format: "date-time" },
                    },
                  },
                  role: {
                    type: "object",
                    properties: {
                      id: { type: "string", format: "uuid" },
                      roleName: { type: "string" },
                    },
                  },
                  permissions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", format: "uuid" },
                        module: { type: "string" },
                        action: { type: "string" },
                        description: { type: "string", nullable: true },
                      },
                    },
                  },
                  createdAt: { type: "string", format: "date-time" },
                },
              },
            },
            pagination: {
              type: "object",
              properties: {
                page: { type: "number" },
                limit: { type: "number" },
                total: { type: "number" },
                totalPages: { type: "number" },
              },
            },
          },
        },
      },
    },
  })
  async listUsers(
    @AuthUser() user: { id: string },
    @Query() query: ListUsersDto,
  ) {
    return this.usersService.listUsers(user.id, query);
  }

  @Get(":userId")
  @ApiOperation({
    summary: "Get user details",
    description:
      "Get detailed information about a specific user in the current farm. Only farm owners can view user details.",
  })
  @ApiResponse({
    status: 200,
    description: "User details fetched successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "User details fetched successfully",
        },
        data: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            user: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                email: { type: "string" },
                name: { type: "string" },
                mobile: { type: "string", nullable: true },
                isActive: { type: "boolean" },
                emailVerified: { type: "boolean" },
                createdAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string", format: "date-time" },
              },
            },
            role: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                roleName: { type: "string" },
              },
            },
            farm: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                farmName: { type: "string" },
              },
            },
            permissions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string", format: "uuid" },
                  module: { type: "string" },
                  action: { type: "string" },
                  description: { type: "string", nullable: true },
                },
              },
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "User not found or is not a member of this farm",
  })
  async getUserDetails(
    @AuthUser() user: { id: string },
    @Param("userId") userId: string,
  ) {
    return this.usersService.getUserDetails(user.id, userId);
  }

  @Put(":userId")
  @ApiOperation({
    summary: "Update user",
    description:
      "Update user information. This endpoint supports three types of updates:\n" +
      "1. Status update: Only provide 'isActive' field to toggle active/inactive status\n" +
      "2. Permission update: Only provide 'permissionIds' array to update permissions\n" +
      "3. User details update: Provide 'email', 'password' (optional), and/or 'roleId' to update user details\n\n" +
      "You can combine these updates in a single request. Only farm owners can update users.",
  })
  @ApiResponse({
    status: 200,
    description: "User updated successfully",
    schema: {
      type: "object",
      properties: {
        message: { type: "string", example: "User updated successfully" },
        data: {
          type: "object",
          properties: {
            user: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                email: { type: "string" },
                name: { type: "string" },
                mobile: { type: "string", nullable: true },
                isActive: { type: "boolean" },
                role: {
                  type: "object",
                  properties: {
                    id: { type: "string", format: "uuid" },
                    roleName: { type: "string" },
                  },
                },
              },
            },
            permissions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string", format: "uuid" },
                  module: { type: "string" },
                  action: { type: "string" },
                  description: { type: "string", nullable: true },
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
    description:
      "Bad request - Invalid input or role/permission validation failed",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Only farm owners can update users",
  })
  @ApiResponse({
    status: 404,
    description: "Not found - User or role not found",
  })
  @ApiResponse({
    status: 409,
    description: "Conflict - Email already exists",
  })
  async updateUser(
    @AuthUser() user: { id: string },
    @Param("userId") userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(user.id, userId, dto);
  }
}
