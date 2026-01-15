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
import { Farm } from "./farm.entity";
import { User } from "./user.entity";

@Entity({ name: "revenues" })
export class Revenue {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Farm, { nullable: false })
  @JoinColumn({ name: "farm_id" })
  farm: Farm;

  @Column({ name: "revenue_date", type: "date", nullable: false })
  revenueDate: Date;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: false })
  amount: number;

  @Column({
    name: "currency_type",
    type: "varchar",
    length: 3,
    nullable: false,
  })
  currencyType: string;

  @Column({
    name: "buyer_name",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  buyerName: string | null;

  @Column({
    name: "product_sold",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  productSold: string | null;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  quantity: number | null;

  @Column({
    name: "quantity_unit",
    type: "varchar",
    length: 50,
    nullable: true,
  })
  quantityUnit: string | null;

  @Column({
    name: "payment_method",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  paymentMethod: string | null;

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
