import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Permission } from "../../database/entities/permission.entity";
import { Role } from "../../database/entities/role.entity";
import { FarmRole, UserRole } from "../../enums/user.enum";

@Injectable()
export class AccessService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
  ) {}

  async listPermissionsByModule() {
    const permissions = await this.permissionRepo.find({
      order: { module: "ASC", action: "ASC" },
    });

    const grouped = permissions.reduce<
      Record<
        string,
        {
          module: string;
          actions: { id: string; action: string; description: string | null }[];
        }
      >
    >((acc, permission) => {
      if (!acc[permission.module]) {
        acc[permission.module] = { module: permission.module, actions: [] };
      }
      acc[permission.module].actions.push({
        id: permission.id,
        action: permission.action,
        description: permission.description,
      });
      return acc;
    }, {});

    return {
      message: "Permissions fetched successfully",
      data: Object.values(grouped),
    };
  }

  async listAssignableRoles() {
    const excludedRoles = [UserRole.SUPER_ADMIN, FarmRole.OWNER];
    const roles = await this.roleRepo
      .createQueryBuilder("role")
      .where("role.roleName NOT IN (:...excludedRoles)", { excludedRoles })
      .orderBy("role.roleName", "ASC")
      .getMany();

    return {
      message: "Roles fetched successfully",
      data: roles.map((role) => ({
        id: role.id,
        roleName: role.roleName,
      })),
    };
  }
}
