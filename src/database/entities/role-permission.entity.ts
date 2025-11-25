import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { Permission } from "./permission.entity";
import { Role } from "./role.entity";

@Entity({ name: "role_permissions" })
@Unique("uq_role_permission_role_permission", ["role", "permission"])
export class RolePermission {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Role, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "role_id" })
  role: Role;

  @ManyToOne(() => Permission, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "permission_id" })
  permission: Permission;

  @CreateDateColumn({
    name: "created_at",
    type: "timestamp with time zone",
    nullable: true,
  })
  createdAt: Date | null;
}

