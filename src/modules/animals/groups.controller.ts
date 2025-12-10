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
import { AssignAnimalsDto } from "./dto/assign-animals.dto";
import { CreateGroupDto } from "./dto/create-group.dto";
import { ListGroupAnimalsDto } from "./dto/list-group-animals.dto";
import { ListGroupsDto } from "./dto/list-groups.dto";
import { RemoveAnimalsDto } from "./dto/remove-animals.dto";
import { UpdateGroupDto } from "./dto/update-group.dto";
import { GroupsService } from "./groups.service";

@ApiTags("Animal Groups")
@ApiBearerAuth()
@Controller({ path: "animals/groups", version: "1" })
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get("dashboard")
  @ApiOperation({
    summary: "Get animal groups dashboard statistics",
    description:
      "Retrieves dashboard statistics for animal groups including total groups, animals in groups, average group size, average weight, and average age. The farm ID is automatically retrieved from the user's token (currentFarm). Requires LIVESTOCK:LISTING permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Groups dashboard stats fetched successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Groups dashboard stats fetched successfully",
        },
        data: {
          type: "object",
          properties: {
            totalGroups: {
              type: "number",
              description:
                "Total number of groups in the farm (deleted_at is null)",
              example: 5,
            },
            animalsInGroups: {
              type: "number",
              description: "Total number of animals assigned to groups",
              example: 25,
            },
            averageGroupSize: {
              type: "number",
              nullable: true,
              description: "Average number of animals per group",
              example: 5.0,
            },
            averageWeight: {
              type: "number",
              nullable: true,
              description: "Average weight across all animals in groups",
              example: 450.75,
            },
            averageAge: {
              type: "number",
              nullable: true,
              description: "Average age of animals across all groups",
              example: 3.5,
            },
            groupDistribution: {
              type: "number",
              description: "Total number of groups (same as totalGroups)",
              example: 5,
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      "Bad request - User must have a current farm selected or farm not found",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - User does not have LIVESTOCK:LISTING permission",
  })
  @RequirePermission({
    module: PermissionModule.LIVESTOCK,
    action: PermissionAction.LISTING,
  })
  async getGroupsDashboard(@AuthUser() user: any) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.groupsService.getGroupsDashboardStats(farmId);
  }

  @Get()
  @ApiOperation({
    summary: "Get all farm groups with pagination and search",
    description:
      "Retrieves all groups for the user's current farm with pagination and optional search by name. Returns group details along with animal count, average weight, and average age for each group. The farm ID is automatically retrieved from the user's token (currentFarm). Requires LIVESTOCK:LISTING permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Groups fetched successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Groups fetched successfully",
        },
        data: {
          type: "object",
          properties: {
            groups: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: {
                    type: "string",
                    format: "uuid",
                    example: "123e4567-e89b-12d3-a456-426614174000",
                  },
                  name: {
                    type: "string",
                    example: "Cattle Barn 1",
                  },
                  description: {
                    type: "string",
                    nullable: true,
                    example: "Main cattle barn for dairy cows",
                  },
                  isActive: {
                    type: "boolean",
                    example: true,
                  },
                  animalCount: {
                    type: "number",
                    description: "Total number of animals in this group",
                    example: 10,
                  },
                  averageWeight: {
                    type: "number",
                    nullable: true,
                    description: "Average weight of animals in this group",
                    example: 450.5,
                  },
                  averageAge: {
                    type: "number",
                    nullable: true,
                    description: "Average age of animals in this group",
                    example: 3.2,
                  },
                  createdAt: {
                    type: "string",
                    format: "date-time",
                    example: "2024-01-15T10:30:00Z",
                  },
                  updatedAt: {
                    type: "string",
                    format: "date-time",
                    example: "2024-01-15T10:30:00Z",
                  },
                  createdBy: {
                    type: "object",
                    nullable: true,
                    properties: {
                      id: {
                        type: "string",
                        format: "uuid",
                      },
                      email: {
                        type: "string",
                      },
                    },
                  },
                  updatedBy: {
                    type: "object",
                    nullable: true,
                    properties: {
                      id: {
                        type: "string",
                        format: "uuid",
                      },
                      email: {
                        type: "string",
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
    status: 400,
    description:
      "Bad request - User must have a current farm selected or farm not found",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - User does not have LIVESTOCK:LISTING permission",
  })
  @RequirePermission({
    module: PermissionModule.LIVESTOCK,
    action: PermissionAction.LISTING,
  })
  async listGroups(@AuthUser() user: any, @Query() query: ListGroupsDto) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.groupsService.listGroups(farmId, query);
  }

  @Get(":groupId/animals")
  @ApiOperation({
    summary: "Get animals in a group",
    description:
      "Retrieves all animals assigned to a specific group with pagination and optional search by animal name. The farm ID is automatically retrieved from the user's token (currentFarm). Requires LIVESTOCK:LISTING permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Animals in group fetched successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Animals in group fetched successfully",
        },
        data: {
          type: "object",
          properties: {
            animals: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: {
                    type: "string",
                    format: "uuid",
                    description: "AnimalGroup assignment ID",
                  },
                  animal: {
                    type: "object",
                    properties: {
                      id: {
                        type: "string",
                        format: "uuid",
                      },
                      name: {
                        type: "string",
                      },
                      speciesRelation: {
                        type: "object",
                        nullable: true,
                        properties: {
                          id: { type: "string", format: "uuid" },
                          name: { type: "string", example: "Cattle" },
                          slug: { type: "string", example: "cattle" },
                        },
                      },
                      breedRelation: {
                        type: "object",
                        nullable: true,
                        properties: {
                          id: { type: "string", format: "uuid" },
                          name: { type: "string", example: "Holstein" },
                          slug: { type: "string", example: "holstein" },
                          species: {
                            type: "object",
                            properties: {
                              id: { type: "string", format: "uuid" },
                              name: { type: "string", example: "Cattle" },
                              slug: { type: "string", example: "cattle" },
                            },
                          },
                        },
                      },
                      gender: {
                        type: "string",
                        nullable: true,
                      },
                      birthdate: {
                        type: "string",
                        format: "date",
                        nullable: true,
                      },
                      photo: {
                        type: "string",
                        nullable: true,
                      },
                    },
                  },
                  assignedAt: {
                    type: "string",
                    format: "date-time",
                    description: "When the animal was assigned to the group",
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
    status: 400,
    description:
      "Bad request - User must have a current farm selected, farm not found, or group does not belong to current farm",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - User does not have LIVESTOCK:LISTING permission",
  })
  @ApiResponse({
    status: 404,
    description: "Group not found",
  })
  @RequirePermission({
    module: PermissionModule.LIVESTOCK,
    action: PermissionAction.LISTING,
  })
  async getAnimalsInGroup(
    @AuthUser() user: any,
    @Param("groupId") groupId: string,
    @Query() query: ListGroupAnimalsDto,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.groupsService.getAnimalsInGroup(groupId, farmId, query);
  }

  @Get(":groupId")
  @ApiOperation({
    summary: "Get single group details",
    description:
      "Retrieves detailed information about a specific group including all animals assigned to it, animal count, average weight, and average age. The farm ID is automatically retrieved from the user's token (currentFarm). Requires LIVESTOCK:LISTING permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Group details fetched successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Group details fetched successfully",
        },
        data: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
              example: "123e4567-e89b-12d3-a456-426614174000",
            },
            name: {
              type: "string",
              example: "Cattle Barn 1",
            },
            description: {
              type: "string",
              nullable: true,
              example: "Main cattle barn for dairy cows",
            },
            isActive: {
              type: "boolean",
              example: true,
            },
            animalCount: {
              type: "number",
              description: "Total number of animals in this group",
              example: 10,
            },
            averageWeight: {
              type: "number",
              nullable: true,
              description: "Average weight of animals in this group",
              example: 450.5,
            },
            averageAge: {
              type: "number",
              nullable: true,
              description: "Average age of animals in this group",
              example: 3.2,
            },
            animals: {
              type: "array",
              description: "List of animals assigned to this group",
              items: {
                type: "object",
                properties: {
                  id: {
                    type: "string",
                    format: "uuid",
                    description: "AnimalGroup assignment ID",
                  },
                  animal: {
                    type: "object",
                    properties: {
                      id: {
                        type: "string",
                        format: "uuid",
                      },
                      name: {
                        type: "string",
                      },
                      speciesRelation: {
                        type: "object",
                        nullable: true,
                        properties: {
                          id: { type: "string", format: "uuid" },
                          name: { type: "string", example: "Cattle" },
                          slug: { type: "string", example: "cattle" },
                        },
                      },
                      breedRelation: {
                        type: "object",
                        nullable: true,
                        properties: {
                          id: { type: "string", format: "uuid" },
                          name: { type: "string", example: "Holstein" },
                          slug: { type: "string", example: "holstein" },
                          species: {
                            type: "object",
                            properties: {
                              id: { type: "string", format: "uuid" },
                              name: { type: "string", example: "Cattle" },
                              slug: { type: "string", example: "cattle" },
                            },
                          },
                        },
                      },
                      gender: {
                        type: "string",
                        nullable: true,
                      },
                      birthdate: {
                        type: "string",
                        format: "date",
                        nullable: true,
                      },
                      photo: {
                        type: "string",
                        nullable: true,
                      },
                    },
                  },
                  assignedAt: {
                    type: "string",
                    format: "date-time",
                    description: "When the animal was assigned to the group",
                  },
                },
              },
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
            createdBy: {
              type: "object",
              nullable: true,
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                },
                email: {
                  type: "string",
                },
              },
            },
            updatedBy: {
              type: "object",
              nullable: true,
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                },
                email: {
                  type: "string",
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
      "Bad request - User must have a current farm selected, farm not found, or group does not belong to current farm",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - User does not have LIVESTOCK:LISTING permission",
  })
  @ApiResponse({
    status: 404,
    description: "Group not found",
  })
  @RequirePermission({
    module: PermissionModule.LIVESTOCK,
    action: PermissionAction.LISTING,
  })
  async getGroupById(@AuthUser() user: any, @Param("groupId") groupId: string) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    return this.groupsService.getGroupById(groupId, farmId);
  }

  @Post()
  @ApiOperation({
    summary: "Create a new group",
    description:
      "Creates a new animal group for the user's current farm. The farm ID is automatically retrieved from the user's token (currentFarm). Requires LIVESTOCK:CREATE permission.",
  })
  @ApiResponse({
    status: 201,
    description: "Group created successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Group created successfully",
        },
        data: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
              example: "123e4567-e89b-12d3-a456-426614174000",
            },
            name: {
              type: "string",
              example: "Cattle Barn 1",
            },
            description: {
              type: "string",
              nullable: true,
              example: "Main cattle barn for dairy cows",
            },
            isActive: {
              type: "boolean",
              example: true,
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      "Bad request - User must have a current farm selected, farm not found, or validation error",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - User does not have LIVESTOCK:CREATE permission",
  })
  @RequirePermission({
    module: PermissionModule.LIVESTOCK,
    action: PermissionAction.CREATE,
  })
  async createGroup(
    @AuthUser() user: any,
    @Body() createGroupDto: CreateGroupDto,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    const userId = (user as any).id;
    return this.groupsService.createGroup(farmId, userId, createGroupDto);
  }

  @Put(":groupId")
  @ApiOperation({
    summary: "Update a group",
    description:
      "Updates an existing group. The group must belong to the user's current farm. All fields are optional. The farm ID is automatically retrieved from the user's token (currentFarm). Requires LIVESTOCK:UPDATE permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Group updated successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Group updated successfully",
        },
        data: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
              example: "123e4567-e89b-12d3-a456-426614174000",
            },
            name: {
              type: "string",
              example: "Cattle Barn 1",
            },
            description: {
              type: "string",
              nullable: true,
              example: "Main cattle barn for dairy cows",
            },
            isActive: {
              type: "boolean",
              example: true,
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      "Bad request - User must have a current farm selected, farm not found, or group does not belong to current farm",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - User does not have LIVESTOCK:UPDATE permission",
  })
  @ApiResponse({
    status: 404,
    description: "Group not found",
  })
  @RequirePermission({
    module: PermissionModule.LIVESTOCK,
    action: PermissionAction.UPDATE,
  })
  async updateGroup(
    @AuthUser() user: any,
    @Param("groupId") groupId: string,
    @Body() updateGroupDto: UpdateGroupDto,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    const userId = (user as any).id;
    return this.groupsService.updateGroup(
      groupId,
      farmId,
      userId,
      updateGroupDto,
    );
  }

  @Post(":groupId/animals")
  @ApiOperation({
    summary: "Assign animals to a group",
    description:
      "Assigns multiple animals to a group. All animals must belong to the user's current farm. The farm ID is automatically retrieved from the user's token (currentFarm). Requires LIVESTOCK:UPDATE permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Animals assigned to group successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Animals assigned to group successfully",
        },
        data: {
          type: "object",
          properties: {
            assigned: {
              type: "number",
              description: "Number of animals newly assigned",
              example: 5,
            },
            alreadyAssigned: {
              type: "number",
              description: "Number of animals that were already assigned",
              example: 2,
            },
            total: {
              type: "number",
              description: "Total number of animals in the request",
              example: 7,
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      "Bad request - User must have a current farm selected, farm not found, group does not belong to current farm, or one or more animals not found",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - User does not have LIVESTOCK:UPDATE permission",
  })
  @ApiResponse({
    status: 404,
    description: "Group not found",
  })
  @RequirePermission({
    module: PermissionModule.LIVESTOCK,
    action: PermissionAction.UPDATE,
  })
  async assignAnimalsToGroup(
    @AuthUser() user: any,
    @Param("groupId") groupId: string,
    @Body() assignAnimalsDto: AssignAnimalsDto,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    const userId = (user as any).id;
    return this.groupsService.assignAnimalsToGroup(
      groupId,
      farmId,
      userId,
      assignAnimalsDto,
    );
  }

  @Delete(":groupId/animals")
  @ApiOperation({
    summary: "Remove animals from a group",
    description:
      "Removes specific animals from a group. The group must belong to the user's current farm. The farm ID is automatically retrieved from the user's token (currentFarm). Requires LIVESTOCK:DELETE permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Animals removed from group successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Animals removed from group successfully",
        },
        data: {
          type: "object",
          properties: {
            removed: {
              type: "number",
              description: "Number of animals successfully removed",
              example: 3,
            },
            requested: {
              type: "number",
              description: "Total number of animals in the request",
              example: 3,
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      "Bad request - User must have a current farm selected, farm not found, group does not belong to current farm, or no animals found to remove",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - User does not have LIVESTOCK:DELETE permission",
  })
  @ApiResponse({
    status: 404,
    description: "Group not found",
  })
  @RequirePermission({
    module: PermissionModule.LIVESTOCK,
    action: PermissionAction.DELETE,
  })
  async removeAnimalsFromGroup(
    @AuthUser() user: any,
    @Param("groupId") groupId: string,
    @Body() removeAnimalsDto: RemoveAnimalsDto,
  ) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    const userId = (user as any).id;
    return this.groupsService.removeAnimalsFromGroup(
      groupId,
      farmId,
      userId,
      removeAnimalsDto,
    );
  }

  @Delete(":groupId")
  @ApiOperation({
    summary: "Delete a group (soft delete)",
    description:
      "Soft deletes a group by setting the deletedAt timestamp. Also soft deletes all animal-group assignments for this group. The group must belong to the user's current farm. The farm ID is automatically retrieved from the user's token (currentFarm). Requires LIVESTOCK:DELETE permission.",
  })
  @ApiResponse({
    status: 200,
    description: "Group deleted successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Group deleted successfully",
        },
        data: {
          type: "object",
          properties: {
            deletedAnimalAssignments: {
              type: "number",
              description:
                "Number of animal-group assignments that were deleted",
              example: 5,
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      "Bad request - User must have a current farm selected, farm not found, or group does not belong to current farm",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - User does not have LIVESTOCK:DELETE permission",
  })
  @ApiResponse({
    status: 404,
    description: "Group not found",
  })
  @RequirePermission({
    module: PermissionModule.LIVESTOCK,
    action: PermissionAction.DELETE,
  })
  async deleteGroup(@AuthUser() user: any, @Param("groupId") groupId: string) {
    const farmId = (user as any).currentFarm?.id || (user as any).currentFarm;
    if (!farmId) {
      throw new BadRequestException("User must have a current farm selected");
    }

    const userId = (user as any).id;
    return this.groupsService.deleteGroup(groupId, farmId, userId);
  }
}
