import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { RolePermission } from "./role-permission.entity";
import { User } from "./user.entity";

@Entity({ name: "roles" })
export class Role {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "role_name", type: "varchar", unique: true })
  roleName: string;

  @CreateDateColumn({
    name: "created_at",
    type: "timestamp with time zone",
    nullable: true,
  })
  createdAt: Date | null;

  @OneToMany(() => User, (user) => user.role)
  users: User[];

  @OneToMany(() => RolePermission, (rolePermission) => rolePermission.role)
  rolePermissions: RolePermission[];
}
