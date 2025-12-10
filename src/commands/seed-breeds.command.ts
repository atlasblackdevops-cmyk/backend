import { Logger } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { Command, CommandRunner } from "nest-commander";
import { DataSource } from "typeorm";
import { Breed } from "../database/entities/breed.entity";
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
  name: "seed-breeds",
  description: "Seed breed data",
})
export class SeedBreedsCommand extends CommandRunner {
  private readonly logger = new Logger(SeedBreedsCommand.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    super();
  }

  async run(): Promise<void> {
    const breedRepo = this.dataSource.getRepository(Breed);
    const speciesRepo = this.dataSource.getRepository(Species);

    // Define breeds by species
    const breedsData: Record<string, string[]> = {
      Cattle: [
        "Holstein",
        "Jersey",
        "Guernsey",
        "Ayrshire",
        "Brown Swiss",
        "Milking Shorthorn",
        "Angus",
        "Hereford",
        "Charolais",
        "Limousin",
        "Simmental",
        "Texas Longhorn",
        "Brahman",
        "Beefmaster",
        "Brangus",
      ],
      Sheep: [
        "Suffolk",
        "Hampshire",
        "Dorset",
        "Rambouillet",
        "Katahdin",
        "Dorper",
        "Merino",
        "Texel",
        "Southdown",
      ],
      Goats: [
        "Alpine",
        "Nubian",
        "Saanen",
        "LaMancha",
        "Oberhasli",
        "Toggenburg",
        "Boer",
        "Kiko",
        "Spanish",
        "Myotonic (Fainting Goat)",
      ],
      Swine: [
        "Berkshire",
        "Duroc",
        "Hampshire",
        "Yorkshire",
        "Landrace",
        "Chester White",
        "Poland China",
        "Spotted",
      ],
      Horses: [
        "Quarter Horse",
        "Thoroughbred",
        "Arabian",
        "Paint",
        "Appaloosa",
        "Clydesdale",
        "Belgian",
        "Morgan",
        "Tennessee Walker",
      ],
      Poultry: [
        "Rhode Island Red",
        "Plymouth Rock (Barred Rock)",
        "Leghorn",
        "Orpington",
        "Wyandotte",
        "Sussex",
        "Australorp",
        "Silkie",
        "Brahma",
      ],
      Turkeys: [
        "Broad Breasted White",
        "Broad Breasted Bronze",
        "Bourbon Red",
        "Narragansett",
      ],
      Ducks: [
        "Pekin",
        "Mallard",
        "Rouen",
        "Khaki Campbell",
        "Muscovy",
        "Runner",
      ],
      Geese: ["Embden", "Toulouse", "Pilgrim", "Chinese", "African"],
      Rabbits: [
        "New Zealand",
        "Californian",
        "Rex",
        "Flemish Giant",
        "Holland Lop",
        "Mini Rex",
        "Silver Fox",
      ],
      Bison: ["Plains Bison (most common)", "Wood Bison"],
      Camelids: ["Alpaca", "Huacaya", "Suri", "Llama", "Standard Llama"],
    };

    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const [speciesName, breedNames] of Object.entries(breedsData)) {
      const species = await speciesRepo.findOne({
        where: { name: speciesName },
      });

      if (!species) {
        this.logger.error(
          `Species not found: ${speciesName}. Please run seed-species first.`,
        );
        errorCount++;
        continue;
      }

      for (const breedName of breedNames) {
        // Check if breed already exists for this species
        const existing = await breedRepo.findOne({
          where: {
            name: breedName,
            species: { id: species.id },
          },
          relations: ["species"],
        });

        if (existing) {
          skippedCount++;
          continue;
        }

        const slug = generateSlug(breedName);
        const breed = breedRepo.create({
          name: breedName,
          slug,
          species: species,
        });

        await breedRepo.save(breed);
        createdCount++;
        this.logger.log(
          `Created breed: ${breedName} (slug: ${slug}) - ${speciesName}`,
        );
      }
    }

    this.logger.log(
      `Breed seeding completed. Created: ${createdCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`,
    );
  }
}
