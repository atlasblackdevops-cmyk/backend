import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { FastifyRequest } from "fastify";
import { Auth } from "../../decorators/auth.decorator";
import { AuthUser } from "../../decorators/user.decorator";
import { parseMultipartData } from "../../utils/multipart.helper";
import { AddExistingUserDto } from "./dto/add-existing-user.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { ListAllUsersDto } from "./dto/list-all-users.dto";
import { ListUsersDto } from "./dto/list-users.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
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
    summary: "Create a new user and add to the current farm",
    description:
      "Creates a new user with a unique email and adds them to the farm associated with the authenticated user's token. The farm ID is automatically retrieved from the user's currentFarm. Only farm owners can create users. If a user with the email already exists, an error will be returned. Use the 'Add Existing User' endpoint to add existing users to a farm.",
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
    description:
      "Conflict - User with this email already exists. Use the 'Add Existing User' endpoint instead.",
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

  @Post("add-existing")
  @ApiOperation({
    summary: "Add an existing user to the current farm",
    description:
      "Adds an existing user to the farm associated with the authenticated user's token. The user must belong to a farm owned by the same owner. The farm ID is automatically retrieved from the creator's currentFarm. Only farm owners can add existing users.",
  })
  @ApiResponse({
    status: 201,
    description: "User added to farm successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "User added to farm successfully",
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
    description:
      "Forbidden - Only farm owners can add users, or user belongs to a different owner's farm",
  })
  @ApiResponse({
    status: 404,
    description: "Not found - User, role, or farm not found",
  })
  @ApiResponse({
    status: 409,
    description: "Conflict - User is already a member of this farm",
  })
  async addExistingUser(
    @AuthUser() user: { id: string },
    @Body() dto: AddExistingUserDto,
  ) {
    return this.usersService.addExistingUserToFarm(
      user.id,
      dto.userId,
      dto.roleId,
      dto.permissionIds,
    );
  }

  @Get("all")
  @ApiOperation({
    summary: "List all users across all owner's farms (except current farm)",
    description:
      "Get a list of all users from all farms owned by the authenticated user, excluding the current farm. Each user object includes their farm memberships across all the owner's farms. Optional search parameter to filter by email or name. Only farm owners can access this endpoint.",
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
                  email: { type: "string", example: "user@example.com" },
                  name: { type: "string", example: "John Doe" },
                  mobile: { type: "string", nullable: true },
                  isActive: { type: "boolean", example: true },
                  emailVerified: { type: "boolean", example: false },
                  farms: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        farmMemberId: { type: "string", format: "uuid" },
                        farm: {
                          type: "object",
                          properties: {
                            id: { type: "string", format: "uuid" },
                            farmName: { type: "string", example: "My Farm" },
                          },
                        },
                        role: {
                          type: "object",
                          properties: {
                            id: { type: "string", format: "uuid" },
                            roleName: { type: "string", example: "MANAGER" },
                          },
                        },
                      },
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
  @ApiResponse({
    status: 403,
    description: "Forbidden - Only farm owners can access this endpoint",
  })
  async listAllUsers(
    @AuthUser() user: { id: string },
    @Query() query: ListAllUsersDto,
  ) {
    return this.usersService.listAllUsersAcrossOwnerFarms(
      user.id,
      query.search,
      query.page || 1,
      query.limit || 10,
    );
  }

  @Put("profile")
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Update user profile",
    description:
      "Update the authenticated user's profile including name, email, and profile picture. All fields are optional. Use multipart/form-data.",
  })
  @ApiResponse({
    status: 200,
    description: "Profile updated successfully",
    schema: {
      type: "object",
      properties: {
        message: { type: "string", example: "Profile updated successfully" },
        data: {
          type: "object",
          properties: {
            user: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                email: { type: "string", example: "user@example.com" },
                name: { type: "string", example: "John Doe" },
                profilePicture: {
                  type: "string",
                  nullable: true,
                  example:
                    "https://bucket.s3.region.amazonaws.com/profile-pictures/uuid.jpg",
                },
                mobile: { type: "string", nullable: true },
                isActive: { type: "boolean", example: true },
                emailVerified: { type: "boolean", example: false },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - Invalid input",
  })
  @ApiResponse({
    status: 409,
    description: "Conflict - Email already exists",
  })
  async updateProfile(
    @AuthUser() user: { id: string },
    @Req() req: FastifyRequest,
  ) {
    const { fields, files } = await parseMultipartData(req);

    const formData: UpdateProfileDto = {};
    if (fields.name) {
      formData.name = fields.name;
    }
    if (fields.email) {
      formData.email = fields.email;
    }

    const profilePicture = files.get("profilePicture");
    const profilePictureFile = profilePicture?.buffer;
    const profilePictureFilename = profilePicture?.filename;

    return this.usersService.updateProfile(
      user.id,
      formData,
      profilePictureFile,
      profilePictureFilename,
    );
  }
}
