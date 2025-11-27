import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Animal } from "../../database/entities/animal.entity";
import { Farm } from "../../database/entities/farm.entity";
import { User } from "../../database/entities/user.entity";
import { S3Service } from "../../services/s3.service";
import { CreateAnimalDto } from "./dto/create-animal.dto";
import { ListAnimalsDto } from "./dto/list-animals.dto";
import { UpdateAnimalDto } from "./dto/update-animal.dto";

@Injectable()
export class AnimalsService {
  constructor(
    @InjectRepository(Animal)
    private readonly animalRepo: Repository<Animal>,
    @InjectRepository(Farm)
    private readonly farmRepo: Repository<Farm>,
    private readonly s3Service: S3Service,
  ) {}

  async createAnimal(
    userId: string,
    farmId: string,
    dto: CreateAnimalDto,
    imageBuffer?: Buffer,
    imageFilename?: string,
  ) {
    const farm = await this.farmRepo.findOne({
      where: { id: farmId },
    });

    if (!farm) {
      throw new NotFoundException("Farm not found");
    }

    if (!dto.name?.trim()) {
      throw new BadRequestException("Animal name is required");
    }

    let birthdate: Date | null = null;
    if (dto.birthdate) {
      const parsedDate = new Date(dto.birthdate);
      if (Number.isNaN(parsedDate.getTime())) {
        throw new BadRequestException("Invalid birthdate");
      }
      birthdate = parsedDate;
    }

    let photoUrl: string | null = null;
    if (imageBuffer && imageFilename) {
      photoUrl = await this.s3Service.uploadFile(
        imageBuffer,
        imageFilename,
        "animal-photos",
      );
    }

    const actor = { id: userId } as User;

    const animal = this.animalRepo.create({
      farm,
      name: dto.name.trim(),
      species: dto.species ?? null,
      breed: dto.breed ?? null,
      gender: dto.gender ?? null,
      birthdate,
      photo: photoUrl,
      createdBy: actor,
      updatedBy: actor,
      isActive: true,
    });

    await this.animalRepo.save(animal);

    const createdAnimal = await this.animalRepo.findOne({
      where: { id: animal.id },
      relations: ["farm", "createdBy", "updatedBy"],
    });

    return {
      message: "Animal created successfully",
      data: {
        animal: createdAnimal,
      },
    };
  }

  async listAnimals(farmId: string, query: ListAnimalsDto) {
    const farmExists = await this.farmRepo.exist({ where: { id: farmId } });
    if (!farmExists) {
      throw new NotFoundException("Farm not found");
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const qb = this.animalRepo
      .createQueryBuilder("animal")
      .leftJoinAndSelect("animal.farm", "farm")
      .leftJoinAndSelect("animal.createdBy", "createdBy")
      .leftJoinAndSelect("animal.updatedBy", "updatedBy")
      .where("farm.id = :farmId", { farmId })
      .andWhere("animal.deletedAt IS NULL")
      .orderBy("animal.createdAt", "DESC");

    if (query.search) {
      qb.andWhere(
        `(LOWER(animal.name) LIKE LOWER(:search)
          OR LOWER(animal.species) LIKE LOWER(:search)
          OR LOWER(animal.breed) LIKE LOWER(:search))`,
        { search: `%${query.search}%` },
      );
    }

    if (query.gender) {
      qb.andWhere("LOWER(animal.gender) = LOWER(:gender)", {
        gender: query.gender,
      });
    }

    if (query.birthdateFrom) {
      qb.andWhere("animal.birthdate >= :birthdateFrom", {
        birthdateFrom: query.birthdateFrom,
      });
    }

    if (query.birthdateTo) {
      qb.andWhere("animal.birthdate <= :birthdateTo", {
        birthdateTo: query.birthdateTo,
      });
    }

    const total = await qb.getCount();
    const animals = await qb.skip(skip).take(limit).getMany();

    return {
      message: "Animals fetched successfully",
      data: {
        animals,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async getAnimalDetails(animalId: string, userId: string, userFarmId: string) {
    const animal = await this.animalRepo.findOne({
      where: { id: animalId },
      relations: ["farm", "farm.owner", "createdBy", "updatedBy"],
    });

    if (!animal) {
      throw new NotFoundException("Animal not found");
    }

    // Check if animal belongs to user's current farm
    if (animal.farm.id !== userFarmId) {
      throw new ForbiddenException(
        "Animal does not belong to your current farm",
      );
    }

    // Check if animal is soft deleted
    if (animal.deletedAt) {
      throw new NotFoundException("Animal not found");
    }

    return {
      message: "Animal details fetched successfully",
      data: {
        animal,
      },
    };
  }

  async updateAnimal(
    animalId: string,
    userId: string,
    userFarmId: string,
    dto: UpdateAnimalDto,
    imageBuffer?: Buffer,
    imageFilename?: string,
  ) {
    const animal = await this.animalRepo.findOne({
      where: { id: animalId },
      relations: ["farm", "farm.owner"],
    });

    if (!animal) {
      throw new NotFoundException("Animal not found");
    }

    // Check if animal belongs to user's current farm
    if (animal.farm.id !== userFarmId) {
      throw new ForbiddenException(
        "Animal does not belong to your current farm",
      );
    }

    // Check if animal is soft deleted
    if (animal.deletedAt) {
      throw new NotFoundException("Animal not found");
    }

    // Update name if provided
    if (dto.name !== undefined) {
      if (!dto.name?.trim()) {
        throw new BadRequestException("Animal name cannot be empty");
      }
      animal.name = dto.name.trim();
    }

    // Update species if provided
    if (dto.species !== undefined) {
      animal.species = dto.species ?? null;
    }

    // Update breed if provided
    if (dto.breed !== undefined) {
      animal.breed = dto.breed ?? null;
    }

    // Update gender if provided
    if (dto.gender !== undefined) {
      animal.gender = dto.gender ?? null;
    }

    // Update birthdate if provided
    if (dto.birthdate !== undefined) {
      if (dto.birthdate) {
        const parsedDate = new Date(dto.birthdate);
        if (Number.isNaN(parsedDate.getTime())) {
          throw new BadRequestException("Invalid birthdate");
        }
        animal.birthdate = parsedDate;
      } else {
        animal.birthdate = null;
      }
    }

    // Handle photo upload if provided
    if (imageBuffer && imageFilename) {
      // Delete old photo if exists
      if (animal.photo) {
        try {
          await this.s3Service.deleteFile(animal.photo);
        } catch (error) {
          // Log error but don't fail the update
          console.error("Error deleting old animal photo:", error);
        }
      }

      // Upload new photo
      const photoUrl = await this.s3Service.uploadFile(
        imageBuffer,
        imageFilename,
        "animal-photos",
      );
      animal.photo = photoUrl;
    }

    // Update updatedBy
    const actor = { id: userId } as User;
    animal.updatedBy = actor;

    await this.animalRepo.save(animal);

    // Fetch updated animal with relations
    const updatedAnimal = await this.animalRepo.findOne({
      where: { id: animal.id },
      relations: ["farm", "createdBy", "updatedBy"],
    });

    return {
      message: "Animal updated successfully",
      data: {
        animal: updatedAnimal,
      },
    };
  }

  async deleteAnimal(animalId: string, userId: string, userFarmId: string) {
    const animal = await this.animalRepo.findOne({
      where: { id: animalId },
      relations: ["farm", "farm.owner"],
    });

    if (!animal) {
      throw new NotFoundException("Animal not found");
    }

    // Check if animal belongs to user's current farm
    if (animal.farm.id !== userFarmId) {
      throw new ForbiddenException(
        "Animal does not belong to your current farm",
      );
    }

    // Check if already soft deleted
    if (animal.deletedAt) {
      throw new NotFoundException("Animal not found");
    }

    // Soft delete - set deletedAt and updatedBy
    const actor = { id: userId } as User;
    animal.deletedAt = new Date();
    animal.updatedBy = actor;

    await this.animalRepo.save(animal);

    return {
      message: "Animal deleted successfully",
    };
  }
}
