import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Farm } from "../../database/entities/farm.entity";
import { MarketplaceListingImage } from "../../database/entities/marketplace-listing-image.entity";
import { MarketplaceListing } from "../../database/entities/marketplace-listing.entity";
import { SharedModule } from "../shared/shared.module";
import { ListingsController } from "./listings.controller";
import { ListingsService } from "./listings.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MarketplaceListing,
      MarketplaceListingImage,
      Farm,
    ]),
    SharedModule,
  ],
  controllers: [ListingsController],
  providers: [ListingsService],
  exports: [ListingsService],
})
export class MarketplaceModule {}
