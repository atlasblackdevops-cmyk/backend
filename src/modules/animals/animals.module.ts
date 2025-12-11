import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AnimalFeed } from "../../database/entities/animal-feed.entity";
import { AnimalGroup } from "../../database/entities/animal-group.entity";
import { AnimalHealthRecord } from "../../database/entities/animal-health-record.entity";
import { AnimalWeightRecord } from "../../database/entities/animal-weight-record.entity";
import { Animal } from "../../database/entities/animal.entity";
import { Breed } from "../../database/entities/breed.entity";
import { Farm } from "../../database/entities/farm.entity";
import { Group } from "../../database/entities/group.entity";
import { HealthRecordImage } from "../../database/entities/health-record-image.entity";
import { Species } from "../../database/entities/species.entity";
import { User } from "../../database/entities/user.entity";
import { AnimalsController } from "./animals.controller";
import { AnimalsService } from "./animals.service";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";
import { FeedRecordsController } from "./feed-records.controller";
import { FeedRecordsService } from "./feed-records.service";
import { GroupsController } from "./groups.controller";
import { GroupsService } from "./groups.service";
import { HealthRecordsController } from "./health-records.controller";
import { HealthRecordsService } from "./health-records.service";
import { SpeciesBreedController } from "./species-breed.controller";
import { SpeciesBreedService } from "./species-breed.service";
import { WeightRecordsController } from "./weight-records.controller";
import { WeightRecordsService } from "./weight-records.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Animal,
      Farm,
      AnimalHealthRecord,
      HealthRecordImage,
      AnimalWeightRecord,
      AnimalFeed,
      Group,
      AnimalGroup,
      User,
      Species,
      Breed,
    ]),
  ],
  controllers: [
    AnimalsController,
    HealthRecordsController,
    WeightRecordsController,
    FeedRecordsController,
    DashboardController,
    GroupsController,
    SpeciesBreedController,
  ],
  providers: [
    AnimalsService,
    HealthRecordsService,
    WeightRecordsService,
    FeedRecordsService,
    DashboardService,
    GroupsService,
    SpeciesBreedService,
  ],
})
export class AnimalsModule {}
