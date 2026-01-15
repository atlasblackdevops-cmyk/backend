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
import { ExpenseCategory } from "./expense-category.entity";
import { Farm } from "./farm.entity";
import { User } from "./user.entity";

@Entity({ name: "expenses" })
export class Expense {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Farm, { nullable: false })
  @JoinColumn({ name: "farm_id" })
  farm: Farm;

  @ManyToOne(() => ExpenseCategory, { nullable: true })
  @JoinColumn({ name: "category_id" })
  category: ExpenseCategory | null;

  @Column({
    name: "other_category_name",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  otherCategoryName: string | null;

  @Column({ name: "expense_date", type: "date", nullable: false })
  expenseDate: Date;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: false })
  amount: number;

  @Column({
    name: "currency_type",
    type: "varchar",
    length: 3,
    nullable: false,
  })
  currencyType: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  vendor: string | null;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({
    name: "payment_method",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  paymentMethod: string | null;

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
