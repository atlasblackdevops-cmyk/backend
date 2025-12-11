import { Logger } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { Command, CommandRunner } from "nest-commander";
import { DataSource } from "typeorm";
import { Species } from "../database/entities/species.entity";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

@Command({
  name: "seed-species",
  description: "Seed species data",
})
export class SeedSpeciesCommand extends CommandRunner {
  private readonly logger = new Logger(SeedSpeciesCommand.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    super();
  }

  async run(): Promise<void> {
    const speciesRepo = this.dataSource.getRepository(Species);

    const speciesList = [
      "Cattle",
      "Sheep",
      "Goats",
      "Swine",
      "Horses",
      "Poultry",
      "Turkeys",
      "Ducks",
      "Geese",
      "Rabbits",
      "Bison",
      "Camelids",
    ];

    let createdCount = 0;
    let skippedCount = 0;

    for (const speciesName of speciesList) {
      const existing = await speciesRepo.findOne({
        where: { name: speciesName },
      });

      if (existing) {
        skippedCount++;
        this.logger.log(`Species already exists: ${speciesName}`);
        continue;
      }

      const slug = generateSlug(speciesName);
      const species = speciesRepo.create({
        name: speciesName,
        slug,
      });

      await speciesRepo.save(species);
      createdCount++;
      this.logger.log(`Created species: ${speciesName} (slug: ${slug})`);
    }

    this.logger.log(
      `Species seeding completed. Created: ${createdCount}, Skipped: ${skippedCount}`,
    );
  }
}
