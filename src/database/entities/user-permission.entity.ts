import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { Farm } from "./farm.entity";
import { Permission } from "./permission.entity";
import { User } from "./user.entity";

@Entity({ name: "user_permissions" })
@Unique("uq_user_permission_user_farm_permission", ["user", "farm", "permission"])
export class UserPermission {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Farm, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "farm_id" })
  farm: Farm;

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

