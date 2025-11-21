import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";
import { Farm } from "./farm.entity";
import { Role } from "./role.entity";
import { User } from "./user.entity";

@Entity({ name: "farm_members" })
@Unique("uq_farm_member_user_farm", ["user", "farm"])
export class FarmMember {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Farm, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "farm_id" })
  farm: Farm;

  @ManyToOne(() => Role, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "role_id" })
  role: Role; // OWNER, MANAGER, WORKER

  @CreateDateColumn({
    name: "created_at",
    type: "timestamp with time zone",
    nullable: true,
  })
  createdAt: Date | null;

  @UpdateDateColumn({
    name: "updated_at",
    type: "timestamp with time zone",
    nullable: true,
  })
  updatedAt: Date | null;
}
