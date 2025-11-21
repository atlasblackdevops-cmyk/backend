import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { FastifyRequest } from "fastify";
import { UserRole } from "../enums/user.enum";
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const user = request.user;

    if (user) {
      const roles = this.reflector.get<UserRole[]>(
        "roles",
        context.getHandler(),
      );
      if (!roles || roles.length === 0) return true;
      const roleValue =
        typeof (user as any).role === "string"
          ? ((user as any).role as string)
          : ((user as any).role?.roleName as string | undefined);
      if (!roleValue) return false;
      return roles.includes(roleValue as UserRole);
    }

    const allowed = this.reflector.get<boolean>(
      "allowed",
      context.getHandler(),
    );
    if (allowed) return allowed;

    return false;
  }
}
