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
import { FarmRole, UserRole } from "../enums/user.enum";

@Injectable()
export class FarmRoleGuard implements CanActivate {
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

    // Get required farm roles from decorator
    const requiredRoles = this.reflector.get<FarmRole[]>(
      "farmRoles",
      context.getHandler(),
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      // No role requirement, allow
      return true;
    }

    // Get farm ID from request
    const farmIdParam =
      this.reflector.get<string>("farmIdParam", context.getHandler()) ||
      "farmId";

    const farmId =
      request.params?.[farmIdParam] ||
      request.query?.[farmIdParam] ||
      request.body?.[farmIdParam] ||
      (user as any).currentFarm?.id ||
      (user as any).currentFarm;

    if (!farmId) {
      throw new ForbiddenException("Farm context is required for role check");
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

    const userFarmRole = farmMember.role.roleName as FarmRole;

    // Check if user has one of the required roles
    if (!requiredRoles.includes(userFarmRole)) {
      throw new ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(", ")}`,
      );
    }

    return true;
  }
}
