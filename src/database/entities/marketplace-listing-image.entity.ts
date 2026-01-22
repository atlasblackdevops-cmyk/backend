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
import { MarketplaceListing } from "./marketplace-listing.entity";

@Entity({ name: "marketplace_listing_images" })
export class MarketplaceListingImage {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => MarketplaceListing, (listing) => listing.images, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "listing_id" })
  listing: MarketplaceListing;

  @Column({ name: "image_key", type: "varchar", length: 500 })
  imageKey: string;

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
