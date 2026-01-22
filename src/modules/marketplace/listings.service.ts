import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Farm } from "../../database/entities/farm.entity";
import { MarketplaceListingImage } from "../../database/entities/marketplace-listing-image.entity";
import { MarketplaceListing } from "../../database/entities/marketplace-listing.entity";
import { User } from "../../database/entities/user.entity";
import {
  MarketplaceListingCategory,
  MarketplaceListingStatus,
} from "../../enums/marketplace.enum";
import { S3Service } from "../../services/s3.service";
import { BrowseListingsDto } from "./dto/browse-listings.dto";
import { CreateListingDto } from "./dto/create-listing.dto";
import { ListListingsDto } from "./dto/list-listings.dto";
import { UpdateListingDto } from "./dto/update-listing.dto";

@Injectable()
export class ListingsService {
  constructor(
    @InjectRepository(MarketplaceListing)
    private readonly listingRepo: Repository<MarketplaceListing>,
    @InjectRepository(MarketplaceListingImage)
    private readonly listingImageRepo: Repository<MarketplaceListingImage>,
    @InjectRepository(Farm)
    private readonly farmRepo: Repository<Farm>,
    private readonly s3Service: S3Service,
  ) {}

  async createListing(
    userId: string,
    farmId: string,
    dto: CreateListingDto,
    images?: Array<{ buffer: Buffer; filename: string }>,
  ) {
    const farm = await this.farmRepo.findOne({
      where: { id: farmId, deletedAt: null, isActive: true },
    });

    if (!farm) {
      throw new NotFoundException("Farm not found");
    }

    if (!dto.title?.trim()) {
      throw new BadRequestException("Title is required");
    }

    if (dto.price === undefined || dto.price < 0) {
      throw new BadRequestException("Price must be a positive number");
    }

    if (dto.quantityAvailable === undefined || dto.quantityAvailable < 0) {
      throw new BadRequestException(
        "Quantity available must be a positive number",
      );
    }

    const actor = { id: userId } as User;

    const listing = this.listingRepo.create({
      farm,
      seller: actor,
      title: dto.title.trim(),
      description: dto.description?.trim() || null,
      category: dto.category || MarketplaceListingCategory.OTHER,
      price: dto.price.toString(),
      quantityAvailable: dto.quantityAvailable.toString(),
      quantityUnit: dto.quantityUnit?.trim() || null,
      city: dto.city?.trim() || null,
      state: dto.state?.trim() || null,
      country: dto.country?.trim() || null,
      shippingAvailable: dto.shippingAvailable ?? false,
      status: dto.status || MarketplaceListingStatus.ACTIVE,
      createdBy: actor,
      updatedBy: actor,
    });

    await this.listingRepo.save(listing);

    // Upload images if provided
    if (images && images.length > 0) {
      const imagePromises = images.map(async (image) => {
        const imageKey = await this.s3Service.uploadFile(
          image.buffer,
          image.filename,
          "marketplace-listing-images",
        );

        const listingImage = this.listingImageRepo.create({
          listing,
          imageKey,
        });

        return this.listingImageRepo.save(listingImage);
      });

      await Promise.all(imagePromises);
    }

    return {
      message: "Listing created successfully",
    };
  }

  async listListings(farmId: string, query: ListListingsDto) {
    const farmExists = await this.farmRepo.exist({
      where: { id: farmId, deletedAt: null, isActive: true },
    });
    if (!farmExists) {
      throw new NotFoundException("Farm not found");
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const qb = this.listingRepo
      .createQueryBuilder("listing")
      .leftJoinAndSelect("listing.farm", "farm")
      .leftJoinAndSelect("listing.seller", "seller")
      .leftJoinAndSelect("listing.images", "images")
      .where("farm.id = :farmId", { farmId })
      .andWhere("listing.deletedAt IS NULL")
      .andWhere("images.deletedAt IS NULL")
      .orderBy("listing.createdAt", "DESC");

    if (query.search) {
      qb.andWhere(
        `(LOWER(listing.title) LIKE LOWER(:search)
          OR LOWER(listing.description) LIKE LOWER(:search))`,
        { search: `%${query.search}%` },
      );
    }

    if (query.category) {
      qb.andWhere("listing.category = :category", {
        category: query.category,
      });
    }

    if (query.status) {
      qb.andWhere("listing.status = :status", {
        status: query.status,
      });
    }

    if (query.city) {
      qb.andWhere("LOWER(listing.city) = LOWER(:city)", {
        city: query.city,
      });
    }

    if (query.state) {
      qb.andWhere("LOWER(listing.state) = LOWER(:state)", {
        state: query.state,
      });
    }

    if (query.country) {
      qb.andWhere("LOWER(listing.country) = LOWER(:country)", {
        country: query.country,
      });
    }

    const total = await qb.getCount();
    const listings = await qb.skip(skip).take(limit).getMany();

    // Attach presigned URLs to images
    const listingsWithUrls = await Promise.all(
      listings.map(async (listing) => {
        const listingData = {
          ...listing,
          images: await Promise.all(
            (listing.images || []).map(async (img) => {
              const imageUrl = await this.s3Service.getPresignedUrl(
                img.imageKey,
              );
              return {
                id: img.id,
                imageKey: img.imageKey,
                imageUrl,
              };
            }),
          ),
        };
        return listingData;
      }),
    );

    return {
      message: "Listings fetched successfully",
      data: {
        listings: listingsWithUrls,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async getListingDetails(
    listingId: string,
    userId: string,
    userFarmId: string,
  ) {
    const listing = await this.listingRepo
      .createQueryBuilder("listing")
      .leftJoinAndSelect("listing.farm", "farm")
      .leftJoinAndSelect("listing.seller", "seller")
      .leftJoinAndSelect("listing.images", "images")
      .leftJoinAndSelect("listing.createdBy", "createdBy")
      .leftJoinAndSelect("listing.updatedBy", "updatedBy")
      .where("listing.id = :listingId", { listingId })
      .andWhere("images.deletedAt IS NULL")
      .getOne();

    if (!listing) {
      throw new NotFoundException("Listing not found");
    }

    // Check if listing belongs to user's current farm
    if (listing.farm.id !== userFarmId) {
      throw new ForbiddenException(
        "Listing does not belong to your current farm",
      );
    }

    // Check if listing is soft deleted
    if (listing.deletedAt) {
      throw new NotFoundException("Listing not found");
    }

    // Attach presigned URLs to images
    const imagesWithUrls = await Promise.all(
      (listing.images || []).map(async (img) => {
        const imageUrl = await this.s3Service.getPresignedUrl(img.imageKey);
        return {
          id: img.id,
          imageKey: img.imageKey,
          imageUrl,
        };
      }),
    );

    return {
      message: "Listing details fetched successfully",
      data: {
        listing: {
          ...listing,
          images: imagesWithUrls,
        },
      },
    };
  }

  async updateListing(
    listingId: string,
    userId: string,
    userFarmId: string,
    dto: UpdateListingDto,
    newImages?: Array<{ buffer: Buffer; filename: string }>,
    deletedImageIds?: string[],
  ) {
    const listing = await this.listingRepo.findOne({
      where: { id: listingId },
      relations: ["farm", "images"],
    });

    if (!listing) {
      throw new NotFoundException("Listing not found");
    }

    // Check if listing belongs to user's current farm
    if (listing.farm.id !== userFarmId) {
      throw new ForbiddenException(
        "Listing does not belong to your current farm",
      );
    }

    // Check if listing is soft deleted
    if (listing.deletedAt) {
      throw new NotFoundException("Listing not found");
    }

    const actor = { id: userId } as User;

    // Update fields if provided
    if (dto.title !== undefined) {
      if (!dto.title?.trim()) {
        throw new BadRequestException("Title cannot be empty");
      }
      listing.title = dto.title.trim();
    }

    if (dto.description !== undefined) {
      listing.description = dto.description?.trim() || null;
    }

    if (dto.category !== undefined) {
      listing.category = dto.category;
    }

    if (dto.price !== undefined) {
      if (dto.price < 0) {
        throw new BadRequestException("Price must be a positive number");
      }
      listing.price = dto.price.toString();
    }

    if (dto.quantityAvailable !== undefined) {
      if (dto.quantityAvailable < 0) {
        throw new BadRequestException(
          "Quantity available must be a positive number",
        );
      }
      listing.quantityAvailable = dto.quantityAvailable.toString();
    }

    if (dto.quantityUnit !== undefined) {
      listing.quantityUnit = dto.quantityUnit?.trim() || null;
    }

    if (dto.city !== undefined) {
      listing.city = dto.city?.trim() || null;
    }

    if (dto.state !== undefined) {
      listing.state = dto.state?.trim() || null;
    }

    if (dto.country !== undefined) {
      listing.country = dto.country?.trim() || null;
    }

    if (dto.shippingAvailable !== undefined) {
      listing.shippingAvailable = dto.shippingAvailable;
    }

    if (dto.status !== undefined) {
      listing.status = dto.status;
    }

    listing.updatedBy = actor;

    // Handle image deletions
    if (deletedImageIds && deletedImageIds.length > 0) {
      const imagesToDelete = await this.listingImageRepo.find({
        where: {
          id: In(deletedImageIds),
          listing: { id: listingId },
        },
      });

      for (const image of imagesToDelete) {
        // Delete from S3
        if (image.imageKey) {
          try {
            await this.s3Service.deleteFile(image.imageKey);
          } catch (error) {
            console.error(
              `Failed to delete image from S3: ${image.imageKey}`,
              error,
            );
          }
        }
        // Soft delete from database
        await this.listingImageRepo.softRemove(image);
      }
    }

    // Handle new image uploads
    if (newImages && newImages.length > 0) {
      const imagePromises = newImages.map(async (image) => {
        const imageKey = await this.s3Service.uploadFile(
          image.buffer,
          image.filename,
          "marketplace-listing-images",
        );

        const listingImage = this.listingImageRepo.create({
          listing,
          imageKey,
        });

        return this.listingImageRepo.save(listingImage);
      });

      await Promise.all(imagePromises);
    }

    await this.listingRepo.save(listing);

    return {
      message: "Listing updated successfully",
    };
  }

  async deleteListing(listingId: string, userId: string, userFarmId: string) {
    const listing = await this.listingRepo.findOne({
      where: { id: listingId },
      relations: ["farm", "images"],
    });

    if (!listing) {
      throw new NotFoundException("Listing not found");
    }

    // Check if listing belongs to user's current farm
    if (listing.farm.id !== userFarmId) {
      throw new ForbiddenException(
        "Listing does not belong to your current farm",
      );
    }

    // Check if listing is soft deleted
    if (listing.deletedAt) {
      throw new NotFoundException("Listing not found");
    }

    // Delete images from S3 before soft deleting
    if (listing.images && listing.images.length > 0) {
      for (const image of listing.images) {
        if (image.imageKey) {
          try {
            await this.s3Service.deleteFile(image.imageKey);
          } catch (error) {
            console.error(
              `Failed to delete image from S3: ${image.imageKey}`,
              error,
            );
          }
        }
      }
    }

    await this.listingRepo.softRemove(listing);

    return {
      message: "Listing deleted successfully",
    };
  }

  async browseListings(userFarmId: string | null, query: BrowseListingsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const qb = this.listingRepo
      .createQueryBuilder("listing")
      .leftJoinAndSelect("listing.farm", "farm")
      .leftJoinAndSelect("listing.seller", "seller")
      .leftJoinAndSelect("listing.images", "images")
      .where("listing.status = :status", {
        status: MarketplaceListingStatus.ACTIVE,
      })
      .andWhere("listing.deletedAt IS NULL")
      .andWhere("farm.deletedAt IS NULL")
      .andWhere("farm.isActive = :isActive", { isActive: true })
      .andWhere("images.deletedAt IS NULL")
      .orderBy("listing.createdAt", "DESC");

    // Exclude listings from user's own farm
    if (userFarmId) {
      qb.andWhere("farm.id != :userFarmId", { userFarmId });
    }

    if (query.search) {
      qb.andWhere(
        `(LOWER(listing.title) LIKE LOWER(:search)
          OR LOWER(listing.description) LIKE LOWER(:search))`,
        { search: `%${query.search}%` },
      );
    }

    if (query.category) {
      qb.andWhere("listing.category = :category", {
        category: query.category,
      });
    }

    if (query.city) {
      qb.andWhere("LOWER(listing.city) = LOWER(:city)", {
        city: query.city,
      });
    }

    if (query.state) {
      qb.andWhere("LOWER(listing.state) = LOWER(:state)", {
        state: query.state,
      });
    }

    if (query.country) {
      qb.andWhere("LOWER(listing.country) = LOWER(:country)", {
        country: query.country,
      });
    }

    // Distance filtering (if latitude, longitude, and maxDistance are provided)
    if (
      query.latitude !== undefined &&
      query.longitude !== undefined &&
      query.maxDistance !== undefined &&
      query.maxDistance > 0
    ) {
      // Use farm's latitude/longitude for distance calculation
      // Formula: Haversine distance in kilometers
      // Only calculate distance for farms that have latitude/longitude
      qb.andWhere("farm.latitude IS NOT NULL");
      qb.andWhere("farm.longitude IS NOT NULL");
      qb.andWhere(
        `(
          6371 * acos(
            LEAST(1.0, GREATEST(-1.0,
              cos(radians(:lat)) * 
              cos(radians(CAST(farm.latitude AS DOUBLE PRECISION))) * 
              cos(radians(CAST(farm.longitude AS DOUBLE PRECISION)) - radians(:lng)) + 
              sin(radians(:lat)) * 
              sin(radians(CAST(farm.latitude AS DOUBLE PRECISION)))
            ))
          )
        ) <= :maxDistance`,
        {
          lat: query.latitude,
          lng: query.longitude,
          maxDistance: query.maxDistance,
        },
      );
    }

    const total = await qb.getCount();
    const listings = await qb.skip(skip).take(limit).getMany();

    // Attach presigned URLs to images and format response
    const listingsWithUrls = await Promise.all(
      listings.map(async (listing) => {
        // Get first image URL for grid view
        const firstImage =
          listing.images && listing.images.length > 0
            ? listing.images[0]
            : null;

        const imageUrl = firstImage
          ? await this.s3Service.getPresignedUrl(firstImage.imageKey)
          : null;

        return {
          id: listing.id,
          title: listing.title,
          price: listing.price,
          category: listing.category,
          city: listing.city,
          state: listing.state,
          country: listing.country,
          shippingAvailable: listing.shippingAvailable,
          imageUrl, // First image for grid view
          farm: {
            id: listing.farm.id,
            farmName: listing.farm.farmName,
          },
        };
      }),
    );

    return {
      message: "Listings fetched successfully",
      data: {
        listings: listingsWithUrls,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async browseListingDetails(listingId: string, userFarmId: string | null) {
    const listing = await this.listingRepo
      .createQueryBuilder("listing")
      .leftJoinAndSelect("listing.farm", "farm")
      .leftJoinAndSelect("listing.seller", "seller")
      .leftJoinAndSelect("listing.images", "images")
      .where("listing.id = :listingId", { listingId })
      .andWhere("listing.status = :status", {
        status: MarketplaceListingStatus.ACTIVE,
      })
      .andWhere("listing.deletedAt IS NULL")
      .andWhere("farm.deletedAt IS NULL")
      .andWhere("farm.isActive = :isActive", { isActive: true })
      .andWhere("images.deletedAt IS NULL")
      .getOne();

    if (!listing) {
      throw new NotFoundException("Listing not found");
    }

    // Check if listing belongs to user's own farm (should not be accessible via browse)
    if (userFarmId && listing.farm.id === userFarmId) {
      throw new ForbiddenException(
        "You cannot browse your own farm's listings. Use the farm management endpoints instead.",
      );
    }

    // Attach presigned URLs to all images
    const imagesWithUrls = await Promise.all(
      (listing.images || []).map(async (img) => {
        const imageUrl = await this.s3Service.getPresignedUrl(img.imageKey);
        return {
          id: img.id,
          imageKey: img.imageKey,
          imageUrl,
        };
      }),
    );

    return {
      message: "Listing details fetched successfully",
      data: {
        listing: {
          id: listing.id,
          title: listing.title,
          description: listing.description,
          category: listing.category,
          price: listing.price,
          quantityAvailable: listing.quantityAvailable,
          quantityUnit: listing.quantityUnit,
          city: listing.city,
          state: listing.state,
          country: listing.country,
          shippingAvailable: listing.shippingAvailable,
          images: imagesWithUrls,
          farm: {
            id: listing.farm.id,
            farmName: listing.farm.farmName,
            city: listing.farm.city,
            state: listing.farm.state,
            country: listing.farm.country,
          },
          seller: {
            id: listing.seller.id,
            email: listing.seller.email,
          },
          createdAt: listing.createdAt,
          updatedAt: listing.updatedAt,
        },
      },
    };
  }
}
