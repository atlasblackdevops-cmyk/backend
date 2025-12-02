import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { InjectDataSource } from "@nestjs/typeorm";
import { FastifyRequest } from "fastify";
import { DataSource } from "typeorm";
import { FarmMember } from "../database/entities/farm-member.entity";
import { Farm } from "../database/entities/farm.entity";
import { Permission } from "../database/entities/permission.entity";
import { UserPermission } from "../database/entities/user-permission.entity";
import { User } from "../database/entities/user.entity";
import { UserRole } from "../enums/user.enum";

interface PermissionMetadata {
  module: string;
  action: string;
  farmIdParam?: string; // Name of the parameter that contains farmId (default: "farmId")
}

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException("User not authenticated");
    }

    // Check if user is SUPER_ADMIN - allow all
    const userRole =
      typeof (user as any).role === "string"
        ? ((user as any).role as string)
        : ((user as any).role?.roleName as string | undefined);

    if (userRole === UserRole.SUPER_ADMIN) {
      return true;
    }

    // Get permission requirement from decorator
    const permissionMeta = this.reflector.get<PermissionMetadata>(
      "permission",
      context.getHandler(),
    );

    if (!permissionMeta) {
      // No permission requirement, allow
      return true;
    }

    const { module, action, farmIdParam } = permissionMeta;

    let farmId: string | null = null;

    // If farmIdParam is provided, check params/query/body for farmId
    // If not provided, use user's currentFarm from token (for endpoints like animals)
    if (farmIdParam) {
      // Get farm ID from request (params, query, or body)
      farmId =
        request.params?.[farmIdParam] ||
        request.query?.[farmIdParam] ||
        request.body?.[farmIdParam] ||
        null;
    }

    // If farmId not found in request (or farmIdParam not provided), use user's currentFarm
    if (!farmId) {
      // Load user with currentFarm if not already loaded
      let userWithFarm = user as any;
      if (!userWithFarm.currentFarm && userWithFarm.id) {
        const userRepo = this.dataSource.getRepository(User);
        const fullUser = await userRepo.findOne({
          where: { id: userWithFarm.id },
          relations: ["currentFarm"],
        });
        if (fullUser) {
          userWithFarm = fullUser;
          // Update request.user for potential use in controllers
          request.user = fullUser as any;
        }
      }

      farmId = userWithFarm.currentFarm?.id || userWithFarm.currentFarm || null;
    }

    if (!farmId) {
      throw new ForbiddenException(
        "Farm context is required for permission check. Please ensure you have a current farm selected.",
      );
    }

    // Check if user is OWNER of this farm - allow all
    const farmRepo = this.dataSource.getRepository(Farm);
    const farm = await farmRepo.findOne({
      where: { id: farmId },
      relations: ["owner"],
    });

    if (!farm) {
      throw new ForbiddenException("Farm not found");
    }

    if (farm.owner.id === (user as any).id) {
      return true;
    }

    // Check user's role in this farm
    const farmMemberRepo = this.dataSource.getRepository(FarmMember);
    const farmMember = await farmMemberRepo.findOne({
      where: {
        user: { id: (user as any).id },
        farm: { id: farmId },
      },
      relations: ["role"],
    });

    if (!farmMember) {
      throw new ForbiddenException("User is not a member of this farm");
    }

    // Check if user has the required permission
    const permissionRepo = this.dataSource.getRepository(Permission);
    const permission = await permissionRepo.findOne({
      where: { module, action },
    });

    if (!permission) {
      throw new ForbiddenException(
        `Permission ${module}:${action} does not exist`,
      );
    }

    const userPermissionRepo = this.dataSource.getRepository(UserPermission);
    const userPermission = await userPermissionRepo.findOne({
      where: {
        user: { id: (user as any).id },
        farm: { id: farmId },
        permission: { id: permission.id },
      },
    });

    if (!userPermission) {
      throw new ForbiddenException(
        `Permission denied: ${module}:${action} is required`,
      );
    }

    return true;
  }
}
