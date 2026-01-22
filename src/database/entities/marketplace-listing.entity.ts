import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import {
  MarketplaceListingCategory,
  MarketplaceListingStatus,
} from "../../enums/marketplace.enum";
import { Farm } from "./farm.entity";
import { MarketplaceListingImage } from "./marketplace-listing-image.entity";
import { User } from "./user.entity";

@Entity({ name: "marketplace_listings" })
export class MarketplaceListing {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Farm, { nullable: false })
  @JoinColumn({ name: "farm_id" })
  farm: Farm;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: "seller_id" })
  seller: User;

  @Column({ type: "varchar", length: 255 })
  title: string;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({
    type: "varchar",
    length: 50,
    default: MarketplaceListingCategory.OTHER,
  })
  category: MarketplaceListingCategory;

  @Column({
    type: "decimal",
    precision: 10,
    scale: 2,
  })
  price: string;

  @Column({
    name: "quantity_available",
    type: "decimal",
    precision: 10,
    scale: 2,
    default: 0,
  })
  quantityAvailable: string;

  @Column({
    name: "quantity_unit",
    type: "varchar",
    length: 50,
    nullable: true,
  })
  quantityUnit: string | null; // kg, lbs, pieces, etc.

  @Column({ type: "varchar", nullable: true })
  city: string | null;

  @Column({ type: "varchar", nullable: true })
  state: string | null;

  @Column({ type: "varchar", nullable: true })
  country: string | null;

  @Column({
    name: "shipping_available",
    type: "boolean",
    default: false,
  })
  shippingAvailable: boolean;

  @Column({
    type: "varchar",
    length: 50,
    default: MarketplaceListingStatus.ACTIVE,
  })
  status: MarketplaceListingStatus;

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

  @OneToMany(() => MarketplaceListingImage, (image) => image.listing)
  images: MarketplaceListingImage[];
}
