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
import { Animal } from "./animal.entity";
import { User } from "./user.entity";

@Entity({ name: "animal_feed" })
export class AnimalFeed {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Animal, { nullable: false })
  @JoinColumn({ name: "animal_id" })
  animal: Animal;

  @Column({ type: "decimal" })
  quantity: string;

  @Column({ name: "quantity_unit", type: "varchar" })
  quantityUnit: string;

  @Column({ name: "feed_type", type: "varchar" })
  feedType: string;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "created_by" })
  createdBy: User | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "updated_by" })
  updatedBy: User | null;

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
