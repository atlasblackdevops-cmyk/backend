import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Breed } from "../../database/entities/breed.entity";
import { Species } from "../../database/entities/species.entity";

@Injectable()
export class SpeciesBreedService {
  constructor(
    @InjectRepository(Species)
    private readonly speciesRepo: Repository<Species>,
    @InjectRepository(Breed)
    private readonly breedRepo: Repository<Breed>,
  ) {}

  async listSpecies() {
    const species = await this.speciesRepo.find({
      where: { deletedAt: null },
      order: { name: "ASC" },
    });

    return {
      message: "Species fetched successfully",
      data: {
        species,
      },
    };
  }

  async listBreedsBySpecies(speciesId: string) {
    // Verify species exists
    const species = await this.speciesRepo.findOne({
      where: { id: speciesId, deletedAt: null },
    });

    if (!species) {
      throw new NotFoundException("Species not found");
    }

    const breeds = await this.breedRepo.find({
      where: {
        species: { id: speciesId },
        deletedAt: null,
      },
      relations: ["species"],
      order: { name: "ASC" },
    });

    return {
      message: "Breeds fetched successfully",
      data: {
        breeds,
      },
    };
  }
}
