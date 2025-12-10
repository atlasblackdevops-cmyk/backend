import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Breed } from "./breed.entity";

@Entity({ name: "species" })
export class Species {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", unique: true })
  name: string;

  @Column({ type: "varchar", unique: true })
  slug: string;

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

  @OneToMany(() => Breed, (breed) => breed.species)
  breeds: Breed[];
}
