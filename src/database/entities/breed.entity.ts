import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Species } from "./species.entity";

@Entity({ name: "breeds" })
export class Breed {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar" })
  name: string;

  @Column({ type: "varchar" })
  slug: string;

  @ManyToOne(() => Species, { nullable: false })
  @JoinColumn({ name: "species_id" })
  species: Species;

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

  @DeleteDateColumn({
    name: "deleted_at",
    type: "timestamp with time zone",
    nullable: true,
  })
  deletedAt: Date | null;
}
