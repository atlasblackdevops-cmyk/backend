import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AnimalFeed } from "../../database/entities/animal-feed.entity";
import { AnimalHealthRecord } from "../../database/entities/animal-health-record.entity";
import { AnimalWeightRecord } from "../../database/entities/animal-weight-record.entity";
import { Animal } from "../../database/entities/animal.entity";
import { Farm } from "../../database/entities/farm.entity";
import { HealthRecordImage } from "../../database/entities/health-record-image.entity";
import { AnimalsController } from "./animals.controller";
import { AnimalsService } from "./animals.service";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";
import { FeedRecordsController } from "./feed-records.controller";
import { FeedRecordsService } from "./feed-records.service";
import { HealthRecordsController } from "./health-records.controller";
import { HealthRecordsService } from "./health-records.service";
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
    ]),
  ],
  controllers: [
    AnimalsController,
    HealthRecordsController,
    WeightRecordsController,
    FeedRecordsController,
    DashboardController,
  ],
  providers: [
    AnimalsService,
    HealthRecordsService,
    WeightRecordsService,
    FeedRecordsService,
    DashboardService,
  ],
})
export class AnimalsModule {}
