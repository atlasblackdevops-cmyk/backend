import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AnimalFeed } from "../../database/entities/animal-feed.entity";
import { AnimalHealthRecord } from "../../database/entities/animal-health-record.entity";
import { AnimalWeightRecord } from "../../database/entities/animal-weight-record.entity";
import { Animal } from "../../database/entities/animal.entity";
import { Farm } from "../../database/entities/farm.entity";

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Animal)
    private readonly animalRepo: Repository<Animal>,
    @InjectRepository(AnimalWeightRecord)
    private readonly weightRecordRepo: Repository<AnimalWeightRecord>,
    @InjectRepository(AnimalHealthRecord)
    private readonly healthRecordRepo: Repository<AnimalHealthRecord>,
    @InjectRepository(AnimalFeed)
    private readonly feedRepo: Repository<AnimalFeed>,
    @InjectRepository(Farm)
    private readonly farmRepo: Repository<Farm>,
  ) {}

  async getDashboardStats(farmId: string) {
    // Verify farm exists
    const farmExists = await this.farmRepo.exist({ where: { id: farmId } });
    if (!farmExists) {
      throw new BadRequestException("Farm not found");
    }

    // 1. Total Animals: farm_id = farmId, deleted_at IS NULL, is_active = true
    const totalAnimals = await this.animalRepo.count({
      where: {
        farm: { id: farmId },
        deletedAt: null,
        isActive: true,
      },
    });

    // 2. Average Weight: Get latest weight record for each animal in the farm, then calculate average
    // Get all weight records for farm animals, ordered by createdAt DESC
    // Then group by animalId in memory to get the latest for each animal
    const allWeightRecords = await this.weightRecordRepo
      .createQueryBuilder("weightRecord")
      .innerJoinAndSelect("weightRecord.animal", "animal")
      .where("animal.farm.id = :farmId", { farmId })
      .andWhere("animal.deletedAt IS NULL")
      .andWhere("animal.isActive = :isActive", { isActive: true })
      .andWhere("weightRecord.deletedAt IS NULL")
      .select(["weightRecord.weight", "weightRecord.createdAt", "animal.id"])
      .orderBy("weightRecord.createdAt", "DESC")
      .getMany();

    // Group by animalId and take the first (latest) record for each animal
    const latestWeightsMap = new Map<string, string>();
    for (const record of allWeightRecords) {
      const animalId = record.animal.id;
      if (!latestWeightsMap.has(animalId)) {
        latestWeightsMap.set(animalId, record.weight);
      }
    }

    const latestWeights = Array.from(latestWeightsMap.values()).map((weight) =>
      parseFloat(weight),
    );

    let averageWeight: number | null = null;
    if (latestWeights.length > 0) {
      const sum = latestWeights.reduce((acc, weight) => acc + weight, 0);
      averageWeight = sum / latestWeights.length;
    }

    // 3. Total Weight Records: Count weight records of farm animals
    // where deleted_at IS NULL (for weight records) and animals are is_active = true and deleted_at IS NULL
    const totalWeightRecords = await this.weightRecordRepo
      .createQueryBuilder("weightRecord")
      .innerJoin("weightRecord.animal", "animal")
      .where("animal.farm.id = :farmId", { farmId })
      .andWhere("animal.deletedAt IS NULL")
      .andWhere("animal.isActive = :isActive", { isActive: true })
      .andWhere("weightRecord.deletedAt IS NULL")
      .getCount();

    // 4. Vaccination Compliance: Percentage of animals that have vaccination records
    // We'll check for health records with recordType containing "vaccination" (case-insensitive)
    const animalsWithVaccination = await this.healthRecordRepo
      .createQueryBuilder("healthRecord")
      .innerJoin("healthRecord.animal", "animal")
      .where("animal.farm.id = :farmId", { farmId })
      .andWhere("animal.deletedAt IS NULL")
      .andWhere("animal.isActive = :isActive", { isActive: true })
      .andWhere("healthRecord.deletedAt IS NULL")
      .andWhere("LOWER(healthRecord.recordType) LIKE LOWER(:vaccinationType)", {
        vaccinationType: "%vaccination%",
      })
      .select("DISTINCT animal.id", "animalId")
      .getRawMany();

    // Calculate percentage: (animals with vaccination / total animals) * 100
    const vaccinationCompliance =
      totalAnimals > 0
        ? Number(
            ((animalsWithVaccination.length / totalAnimals) * 100).toFixed(2),
          )
        : 0;

    return {
      message: "Dashboard stats fetched successfully",
      data: {
        totalAnimals,
        averageWeight:
          averageWeight !== null ? Number(averageWeight.toFixed(2)) : null,
        totalWeightRecords,
        vaccinationCompliance,
      },
    };
  }

  /**
   * Convert weight to kilograms based on unit
   */
  private convertToKilograms(weight: number, unit: string): number {
    const normalizedUnit = unit.toLowerCase().trim();

    if (
      normalizedUnit === "kg" ||
      normalizedUnit === "kilogram" ||
      normalizedUnit === "kilograms"
    ) {
      return weight;
    } else if (
      normalizedUnit === "g" ||
      normalizedUnit === "gram" ||
      normalizedUnit === "grams"
    ) {
      return weight / 1000;
    } else if (
      normalizedUnit === "lbs" ||
      normalizedUnit === "lb" ||
      normalizedUnit === "pound" ||
      normalizedUnit === "pounds"
    ) {
      return weight * 0.453592; // 1 lb = 0.453592 kg
    } else {
      // Default to assuming it's already in kg if unit is unknown
      return weight;
    }
  }

  async getWeightTrends(farmId: string) {
    // Verify farm exists
    const farmExists = await this.farmRepo.exist({ where: { id: farmId } });
    if (!farmExists) {
      throw new BadRequestException("Farm not found");
    }

    // Calculate date range: last 12 months from now
    const now = new Date();
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    // Get all weight records for the farm in the last 12 months
    const weightRecords = await this.weightRecordRepo
      .createQueryBuilder("weightRecord")
      .innerJoin("weightRecord.animal", "animal")
      .where("animal.farm.id = :farmId", { farmId })
      .andWhere("animal.deletedAt IS NULL")
      .andWhere("animal.isActive = :isActive", { isActive: true })
      .andWhere("weightRecord.deletedAt IS NULL")
      .andWhere("weightRecord.measuredAt >= :startDate", {
        startDate: twelveMonthsAgo,
      })
      .select([
        "weightRecord.weight",
        "weightRecord.weightUnit",
        "weightRecord.measuredAt",
      ])
      .getMany();

    // Group by month and convert weights to kg
    const monthlyData = new Map<string, { weights: number[]; count: number }>();

    for (const record of weightRecords) {
      const measuredAt = new Date(record.measuredAt);
      const monthKey = `${measuredAt.getFullYear()}-${String(measuredAt.getMonth() + 1).padStart(2, "0")}`;

      const weightInKg = this.convertToKilograms(
        parseFloat(record.weight),
        record.weightUnit,
      );

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { weights: [], count: 0 });
      }

      const monthData = monthlyData.get(monthKey)!;
      monthData.weights.push(weightInKg);
      monthData.count += 1;
    }

    // Generate last 12 months array
    const last12Months: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      last12Months.push(monthKey);
    }

    // Build response array - include all 12 months
    const weightTrends = last12Months.map((monthKey) => {
      const monthData = monthlyData.get(monthKey);

      if (!monthData || monthData.weights.length === 0) {
        // Include months with no data with averageWeight: 0
        return {
          date: monthKey,
          averageWeight: 0,
          count: 0,
        };
      }

      // Calculate average weight
      const sum = monthData.weights.reduce((acc, weight) => acc + weight, 0);
      const averageWeight = sum / monthData.weights.length;

      return {
        date: monthKey,
        averageWeight: Number(averageWeight.toFixed(2)),
        count: monthData.count,
      };
    });

    return {
      message: "Weight trends fetched successfully",
      data: {
        weightTrends,
      },
    };
  }

  async getFeedTrends(farmId: string) {
    // Verify farm exists
    const farmExists = await this.farmRepo.exist({ where: { id: farmId } });
    if (!farmExists) {
      throw new BadRequestException("Farm not found");
    }

    // Calculate date range: last 12 months from now
    const now = new Date();
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    // Get all feed records for the farm in the last 12 months
    const feedRecords = await this.feedRepo
      .createQueryBuilder("feed")
      .innerJoin("feed.animal", "animal")
      .where("animal.farm.id = :farmId", { farmId })
      .andWhere("animal.deletedAt IS NULL")
      .andWhere("animal.isActive = :isActive", { isActive: true })
      .andWhere("feed.deletedAt IS NULL")
      .andWhere("feed.createdAt >= :startDate", {
        startDate: twelveMonthsAgo,
      })
      .select(["feed.quantity", "feed.quantityUnit", "feed.createdAt"])
      .getMany();

    // Group by month and convert quantities to kg
    const monthlyData = new Map<
      string,
      { quantities: number[]; count: number }
    >();

    for (const record of feedRecords) {
      const createdAt = new Date(record.createdAt!);
      const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}`;

      const quantityInKg = this.convertToKilograms(
        parseFloat(record.quantity),
        record.quantityUnit,
      );

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { quantities: [], count: 0 });
      }

      const monthData = monthlyData.get(monthKey)!;
      monthData.quantities.push(quantityInKg);
      monthData.count += 1;
    }

    // Generate last 12 months array
    const last12Months: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      last12Months.push(monthKey);
    }

    // Build response array - include all 12 months
    const feedEntriesTrends = last12Months.map((monthKey) => {
      const monthData = monthlyData.get(monthKey);

      if (!monthData || monthData.quantities.length === 0) {
        // Include months with no data with totalQuantity: 0
        return {
          date: monthKey,
          totalQuantity: 0,
          count: 0,
        };
      }

      // Calculate total quantity (sum)
      const totalQuantity = monthData.quantities.reduce(
        (acc, quantity) => acc + quantity,
        0,
      );

      return {
        date: monthKey,
        totalQuantity: Number(totalQuantity.toFixed(2)),
        count: monthData.count,
      };
    });

    return {
      message: "Feed entries trends fetched successfully",
      data: {
        feedEntriesTrends,
      },
    };
  }
}
