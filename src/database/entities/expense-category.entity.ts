import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Expense } from "./expense.entity";

@Entity({ name: "expense_categories" })
export class ExpenseCategory {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({
    name: "category_name",
    type: "varchar",
    length: 255,
    unique: true,
    nullable: false,
  })
  categoryName: string;

  @Column({ type: "varchar", unique: true })
  slug: string;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

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

  @OneToMany(() => Expense, (expense) => expense.category)
  expenses: Expense[];
}
