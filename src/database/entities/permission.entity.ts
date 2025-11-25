import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { RolePermission } from "./role-permission.entity";
import { UserPermission } from "./user-permission.entity";

@Entity({ name: "permissions" })
@Unique("uq_permission_module_action", ["module", "action"])
export class Permission {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar" })
  @Index()
  module: string; // e.g., "LIVESTOCK", "CROPS", "EQUIPMENT"

  @Column({ type: "varchar" })
  @Index()
  action: string; // e.g., "CREATE", "READ", "UPDATE", "DELETE", "LISTING"

  @Column({ type: "text", nullable: true })
  description: string | null;

  @CreateDateColumn({
    name: "created_at",
    type: "timestamp with time zone",
    nullable: true,
  })
  createdAt: Date | null;

  @OneToMany(() => UserPermission, (userPermission) => userPermission.permission)
  userPermissions: UserPermission[];

  @OneToMany(
    () => RolePermission,
    (rolePermission) => rolePermission.permission,
  )
  rolePermissions: RolePermission[];
}

