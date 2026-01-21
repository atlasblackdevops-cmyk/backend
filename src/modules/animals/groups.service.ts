import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { AnimalGroup } from "../../database/entities/animal-group.entity";
import { AnimalWeightRecord } from "../../database/entities/animal-weight-record.entity";
import { Animal } from "../../database/entities/animal.entity";
import { Farm } from "../../database/entities/farm.entity";
import { Group } from "../../database/entities/group.entity";
import { User } from "../../database/entities/user.entity";
import { AssignAnimalsDto } from "./dto/assign-animals.dto";
import { CreateGroupDto } from "./dto/create-group.dto";
import { ListGroupAnimalsDto } from "./dto/list-group-animals.dto";
import { ListGroupsDto } from "./dto/list-groups.dto";
import { RemoveAnimalsDto } from "./dto/remove-animals.dto";
import { UpdateGroupDto } from "./dto/update-group.dto";

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private readonly groupRepo: Repository<Group>,
    @InjectRepository(AnimalGroup)
    private readonly animalGroupRepo: Repository<AnimalGroup>,
    @InjectRepository(Animal)
    private readonly animalRepo: Repository<Animal>,
    @InjectRepository(AnimalWeightRecord)
    private readonly weightRecordRepo: Repository<AnimalWeightRecord>,
    @InjectRepository(Farm)
    private readonly farmRepo: Repository<Farm>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * Calculate age in years from birthdate
   */
  private calculateAge(birthdate: Date | null): number | null {
    if (!birthdate) return null;
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }
    return age;
  }

  /**
   * Calculate age in months from birthdate
   */
  private calculateAgeInMonths(birthdate: Date | null): number | null {
    if (!birthdate) return null;
    const today = new Date();
    const birth = new Date(birthdate);
    const years = today.getFullYear() - birth.getFullYear();
    const months = today.getMonth() - birth.getMonth();
    const days = today.getDate() - birth.getDate();

    let totalMonths = years * 12 + months;

    // Adjust if birthday hasn't occurred this month
    if (days < 0) {
      totalMonths--;
    }

    return totalMonths;
  }

  /**
   * Format age in months as a readable string
   * Examples: "8 months", "1 month", "1 year 4 months", "2 years"
   */
  private formatAgeString(totalMonths: number): string {
    if (totalMonths < 12) {
      return totalMonths === 1 ? "1 month" : `${totalMonths} months`;
    }

    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;

    if (months === 0) {
      return years === 1 ? "1 year" : `${years} years`;
    }

    const yearStr = years === 1 ? "1 year" : `${years} years`;
    const monthStr = months === 1 ? "1 month" : `${months} months`;

    return `${yearStr} ${monthStr}`;
  }

  /**
   * Get latest weight for an animal
   */
  private async getLatestWeight(animalId: string): Promise<number | null> {
    const latestWeightRecord = await this.weightRecordRepo
      .createQueryBuilder("weightRecord")
      .where("weightRecord.animal.id = :animalId", { animalId })
      .andWhere("weightRecord.deletedAt IS NULL")
      .orderBy("weightRecord.measuredAt", "DESC")
      .select(["weightRecord.weight", "weightRecord.weightUnit"])
      .getOne();

    if (!latestWeightRecord) return null;

    return parseFloat(latestWeightRecord.weight);
  }

  /**
   * Get groups dashboard statistics
   */
  async getGroupsDashboardStats(farmId: string) {
    // Verify farm exists
    const farmExists = await this.farmRepo.exist({ where: { id: farmId } });
    if (!farmExists) {
      throw new BadRequestException("Farm not found");
    }

    // 1. Total Groups: farm_id = farmId, deleted_at IS NULL
    const totalGroups = await this.groupRepo.count({
      where: {
        farm: { id: farmId },
        deletedAt: null,
      },
    });

    // 2. Animals in Groups: Count distinct animals assigned to groups
    const animalsInGroupsResult = await this.animalGroupRepo
      .createQueryBuilder("animalGroup")
      .innerJoin("animalGroup.group", "group")
      .innerJoin("animalGroup.animal", "animal")
      .where("group.farm.id = :farmId", { farmId })
      .andWhere("group.deletedAt IS NULL")
      .andWhere("animalGroup.deletedAt IS NULL")
      .andWhere("animal.deletedAt IS NULL")
      .andWhere("animal.isActive = :isActive", { isActive: true })
      .select("DISTINCT animal.id", "animalId")
      .getRawMany();

    const totalAnimalsInGroups = animalsInGroupsResult.length;

    // 3. Average Group Size: Average number of animals per group
    const groupSizes = await this.animalGroupRepo
      .createQueryBuilder("animalGroup")
      .innerJoin("animalGroup.group", "group")
      .innerJoin("animalGroup.animal", "animal")
      .where("group.farm.id = :farmId", { farmId })
      .andWhere("group.deletedAt IS NULL")
      .andWhere("animalGroup.deletedAt IS NULL")
      .andWhere("animal.deletedAt IS NULL")
      .andWhere("animal.isActive = :isActive", { isActive: true })
      .groupBy("group.id")
      .select("group.id", "groupId")
      .addSelect("COUNT(DISTINCT animal.id)", "animalCount")
      .getRawMany();

    let averageGroupSize: number | null = null;
    if (groupSizes.length > 0) {
      const totalAnimals = groupSizes.reduce(
        (sum, g) => sum + parseInt(g.animalCount),
        0,
      );
      averageGroupSize = totalAnimals / groupSizes.length;
    }

    // 4. Average Weight: Average weight across all animals in groups
    const animalsInGroupsList = await this.animalGroupRepo
      .createQueryBuilder("animalGroup")
      .innerJoin("animalGroup.animal", "animal")
      .innerJoin("animalGroup.group", "group")
      .where("group.farm.id = :farmId", { farmId })
      .andWhere("group.deletedAt IS NULL")
      .andWhere("animalGroup.deletedAt IS NULL")
      .andWhere("animal.deletedAt IS NULL")
      .andWhere("animal.isActive = :isActive", { isActive: true })
      .select("DISTINCT animal.id", "animalId")
      .getRawMany();

    const animalIdsForWeight = animalsInGroupsList.map(
      (a) => a.animalId || a.animal_id,
    );
    const weights: number[] = [];

    for (const animalId of animalIdsForWeight) {
      const weight = await this.getLatestWeight(animalId);
      if (weight !== null) {
        weights.push(weight);
      }
    }

    let averageWeight: number | null = null;
    if (weights.length > 0) {
      const sum = weights.reduce((acc, w) => acc + w, 0);
      averageWeight = sum / weights.length;
    }

    // 5. Average Age: Average age of animals across all groups
    // Get distinct animals with birthdates using groupBy
    const animalsWithBirthdates = await this.animalRepo
      .createQueryBuilder("animal")
      .innerJoin("animal.animalGroups", "animalGroup")
      .innerJoin("animalGroup.group", "group")
      .where("group.farm.id = :farmId", { farmId })
      .andWhere("group.deletedAt IS NULL")
      .andWhere("animalGroup.deletedAt IS NULL")
      .andWhere("animal.deletedAt IS NULL")
      .andWhere("animal.isActive = :isActive", { isActive: true })
      .andWhere("animal.birthdate IS NOT NULL")
      .groupBy("animal.id")
      .addGroupBy("animal.birthdate")
      .select("animal.id", "animalId")
      .addSelect("animal.birthdate", "birthdate")
      .getRawMany();

    const ages: number[] = [];
    for (const animal of animalsWithBirthdates) {
      const age = this.calculateAge(animal.birthdate);
      if (age !== null) {
        ages.push(age);
      }
    }

    let averageAge: number | null = null;
    if (ages.length > 0) {
      const sum = ages.reduce((acc, age) => acc + age, 0);
      averageAge = sum / ages.length;
    }

    return {
      message: "Groups dashboard stats fetched successfully",
      data: {
        totalGroups,
        animalsInGroups: totalAnimalsInGroups,
        averageGroupSize:
          averageGroupSize !== null
            ? Number(averageGroupSize.toFixed(2))
            : null,
        averageWeight:
          averageWeight !== null ? Number(averageWeight.toFixed(2)) : null,
        averageAge: averageAge !== null ? Number(averageAge.toFixed(2)) : null,
        groupDistribution: totalGroups, // Same as totalGroups
      },
    };
  }

  /**
   * Get all groups with pagination and search
   */
  async listGroups(farmId: string, query: ListGroupsDto) {
    // Verify farm exists
    const farmExists = await this.farmRepo.exist({ where: { id: farmId } });
    if (!farmExists) {
      throw new BadRequestException("Farm not found");
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const qb = this.groupRepo
      .createQueryBuilder("group")
      .leftJoinAndSelect("group.createdBy", "createdBy")
      .leftJoinAndSelect("group.updatedBy", "updatedBy")
      .where("group.farm.id = :farmId", { farmId })
      .andWhere("group.deletedAt IS NULL")
      .select([
        "group.id",
        "group.name",
        "group.description",
        "group.isActive",
        "group.createdAt",
        "group.updatedAt",
        "createdBy.id",
        "createdBy.name",
        "updatedBy.id",
        "updatedBy.name",
      ])
      .orderBy("group.createdAt", "DESC");

    // Apply search filter
    if (query.search) {
      qb.andWhere("LOWER(group.name) LIKE LOWER(:search)", {
        search: `%${query.search}%`,
      });
    }

    const total = await qb.getCount();
    const groups = await qb.skip(skip).take(limit).getMany();

    // Get statistics for each group
    const groupsWithStats = await Promise.all(
      groups.map(async (group) => {
        // Get animal count for this group
        const animalCount = await this.animalGroupRepo
          .createQueryBuilder("animalGroup")
          .innerJoin("animalGroup.animal", "animal")
          .where("animalGroup.group.id = :groupId", { groupId: group.id })
          .andWhere("animalGroup.deletedAt IS NULL")
          .andWhere("animal.deletedAt IS NULL")
          .andWhere("animal.isActive = :isActive", { isActive: true })
          .getCount();

        // Get average weight for animals in this group
        const animalsInGroup = await this.animalGroupRepo
          .createQueryBuilder("animalGroup")
          .innerJoin("animalGroup.animal", "animal")
          .where("animalGroup.group.id = :groupId", { groupId: group.id })
          .andWhere("animalGroup.deletedAt IS NULL")
          .andWhere("animal.deletedAt IS NULL")
          .andWhere("animal.isActive = :isActive", { isActive: true })
          .select("DISTINCT animal.id", "animalId")
          .getRawMany();

        const animalIds = animalsInGroup.map((a) => a.animalId || a.animal_id);
        const weights: number[] = [];

        for (const animalId of animalIds) {
          const weight = await this.getLatestWeight(animalId);
          if (weight !== null) {
            weights.push(weight);
          }
        }

        let averageWeight: number | null = null;
        if (weights.length > 0) {
          const sum = weights.reduce((acc, w) => acc + w, 0);
          averageWeight = sum / weights.length;
        }

        // Get average age for animals in this group
        // First get distinct animal IDs
        const distinctAnimalIdsForAge = await this.animalRepo
          .createQueryBuilder("animal")
          .innerJoin("animal.animalGroups", "animalGroup")
          .where("animalGroup.group.id = :groupId", { groupId: group.id })
          .andWhere("animalGroup.deletedAt IS NULL")
          .andWhere("animal.deletedAt IS NULL")
          .andWhere("animal.isActive = :isActive", { isActive: true })
          .andWhere("animal.birthdate IS NOT NULL")
          .select("DISTINCT animal.id", "animalId")
          .getRawMany();

        const animalIdsForAge = distinctAnimalIdsForAge.map(
          (a) => a.animalId || a.animal_id,
        );

        // Then get birthdates for these animals
        const animalsWithBirthdates =
          animalIdsForAge.length > 0
            ? await this.animalRepo
                .createQueryBuilder("animal")
                .where("animal.id IN (:...animalIds)", {
                  animalIds: animalIdsForAge,
                })
                .andWhere("animal.birthdate IS NOT NULL")
                .select("animal.id", "animalId")
                .addSelect("animal.birthdate", "birthdate")
                .getRawMany()
            : [];

        const agesInMonths: number[] = [];
        for (const animal of animalsWithBirthdates) {
          const ageInMonths = this.calculateAgeInMonths(animal.birthdate);
          if (ageInMonths !== null) {
            agesInMonths.push(ageInMonths);
          }
        }

        let averageAge: string | null = null;
        if (agesInMonths.length > 0) {
          const sum = agesInMonths.reduce((acc, months) => acc + months, 0);
          const averageMonths = Math.round(sum / agesInMonths.length);
          averageAge = this.formatAgeString(averageMonths);
        }

        return {
          ...group,
          animalCount,
          averageWeight:
            averageWeight !== null ? Number(averageWeight.toFixed(2)) : null,
          averageAge,
        };
      }),
    );

    return {
      message: "Groups fetched successfully",
      data: {
        groups: groupsWithStats,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  /**
   * Get single group details
   */
  async getGroupById(groupId: string, farmId: string) {
    // Verify farm exists
    const farmExists = await this.farmRepo.exist({ where: { id: farmId } });
    if (!farmExists) {
      throw new BadRequestException("Farm not found");
    }

    const group = await this.groupRepo
      .createQueryBuilder("group")
      .leftJoin("group.createdBy", "createdBy")
      .leftJoin("group.updatedBy", "updatedBy")
      .leftJoin("group.farm", "farm")
      .where("group.id = :groupId", { groupId })
      .andWhere("group.deletedAt IS NULL")
      .select([
        "group.id",
        "group.name",
        "group.description",
        "group.isActive",
        "group.createdAt",
        "group.updatedAt",
      ])
      .addSelect("createdBy.id", "createdBy_id")
      .addSelect("createdBy.name", "createdBy_name")
      .addSelect("updatedBy.id", "updatedBy_id")
      .addSelect("updatedBy.name", "updatedBy_name")
      .addSelect("farm.id", "farm_id")
      .addSelect("farm.farmName", "farm_farmName")
      .getRawOne();

    if (!group) {
      throw new NotFoundException("Group not found");
    }

    // Check if group belongs to user's current farm
    const farmIdFromRaw = group.farm_id;
    if (farmIdFromRaw !== farmId) {
      throw new BadRequestException(
        "Group does not belong to your current farm",
      );
    }

    // Get animals in this group
    const animalGroups = await this.animalGroupRepo
      .createQueryBuilder("animalGroup")
      .innerJoinAndSelect("animalGroup.animal", "animal")
      .leftJoinAndSelect("animal.speciesRelation", "species")
      .leftJoinAndSelect("animal.breedRelation", "breed")
      .leftJoinAndSelect("breed.species", "breedSpecies")
      .where("animalGroup.group.id = :groupId", { groupId })
      .andWhere("animalGroup.deletedAt IS NULL")
      .andWhere("animal.deletedAt IS NULL")
      .andWhere("animal.isActive = :isActive", { isActive: true })
      .select([
        "animalGroup.id",
        "animalGroup.createdAt",
        "animal.id",
        "animal.name",
        "animal.gender",
        "animal.birthdate",
        "animal.photo",
        "species.id",
        "species.name",
        "species.slug",
        "breed.id",
        "breed.name",
        "breed.slug",
      ])
      .orderBy("animal.name", "ASC")
      .getMany();

    // Get statistics
    const animalIds = animalGroups.map((ag) => ag.animal.id);
    const weights: number[] = [];
    const ages: number[] = [];

    for (const animalGroup of animalGroups) {
      const weight = await this.getLatestWeight(animalGroup.animal.id);
      if (weight !== null) {
        weights.push(weight);
      }

      const age = this.calculateAge(animalGroup.animal.birthdate);
      if (age !== null) {
        ages.push(age);
      }
    }

    let averageWeight: number | null = null;
    if (weights.length > 0) {
      const sum = weights.reduce((acc, w) => acc + w, 0);
      averageWeight = sum / weights.length;
    }

    let averageAge: number | null = null;
    if (ages.length > 0) {
      const sum = ages.reduce((acc, age) => acc + age, 0);
      averageAge = sum / ages.length;
    }

    // Transform raw result to structured object
    const transformedGroup = {
      id: group.group_id || group.id,
      name: group.group_name || group.name,
      description: group.group_description || group.description,
      isActive:
        group.group_isActive !== undefined
          ? group.group_isActive
          : group.isActive,
      createdAt: group.group_createdAt || group.createdAt,
      updatedAt: group.group_updatedAt || group.updatedAt,
      farm: group.farm_id
        ? {
            id: group.farm_id,
            farmName: group.farm_farmName,
          }
        : null,
      createdBy: group.createdBy_id
        ? {
            id: group.createdBy_id,
            name: group.createdBy_name,
          }
        : null,
      updatedBy: group.updatedBy_id
        ? {
            id: group.updatedBy_id,
            name: group.updatedBy_name,
          }
        : null,
    };

    return {
      message: "Group details fetched successfully",
      data: {
        ...transformedGroup,
        animalCount: animalGroups.length,
        averageWeight:
          averageWeight !== null ? Number(averageWeight.toFixed(2)) : null,
        averageAge: averageAge !== null ? Number(averageAge.toFixed(2)) : null,
        animals: animalGroups.map((ag) => ({
          id: ag.id,
          animal: ag.animal,
          assignedAt: ag.createdAt,
        })),
      },
    };
  }

  /**
   * Create a new group
   */
  async createGroup(
    farmId: string,
    userId: string,
    createGroupDto: CreateGroupDto,
  ) {
    // Verify farm exists
    const farm = await this.farmRepo.findOne({ where: { id: farmId } });
    if (!farm) {
      throw new BadRequestException("Farm not found");
    }

    // Verify user exists
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException("User not found");
    }

    // Create group
    const group = this.groupRepo.create({
      name: createGroupDto.name,
      description: createGroupDto.description || null,
      farm,
      isActive: true,
      createdBy: user,
      updatedBy: user,
    });

    await this.groupRepo.save(group);

    return {
      message: "Group created successfully",
    };
  }

  /**
   * Update a group
   */
  async updateGroup(
    groupId: string,
    farmId: string,
    userId: string,
    updateGroupDto: UpdateGroupDto,
  ) {
    // Verify farm exists
    const farmExists = await this.farmRepo.exist({ where: { id: farmId } });
    if (!farmExists) {
      throw new BadRequestException("Farm not found");
    }

    // Get group
    const group = await this.groupRepo.findOne({
      where: { id: groupId, deletedAt: null },
      relations: ["farm"],
    });

    if (!group) {
      throw new NotFoundException("Group not found");
    }

    // Check if group belongs to user's current farm
    if (group.farm.id !== farmId) {
      throw new BadRequestException(
        "Group does not belong to your current farm",
      );
    }

    // Verify user exists
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException("User not found");
    }

    // Update group fields
    if (updateGroupDto.name !== undefined) {
      group.name = updateGroupDto.name;
    }
    if (updateGroupDto.description !== undefined) {
      group.description = updateGroupDto.description || null;
    }
    group.updatedBy = user;

    await this.groupRepo.save(group);

    return {
      message: "Group updated successfully",
    };
  }

  /**
   * Assign animals to a group
   */
  async assignAnimalsToGroup(
    groupId: string,
    farmId: string,
    userId: string,
    assignAnimalsDto: AssignAnimalsDto,
  ) {
    // Verify farm exists
    const farmExists = await this.farmRepo.exist({ where: { id: farmId } });
    if (!farmExists) {
      throw new BadRequestException("Farm not found");
    }

    // Get group
    const group = await this.groupRepo.findOne({
      where: { id: groupId, deletedAt: null },
      relations: ["farm"],
    });

    if (!group) {
      throw new NotFoundException("Group not found");
    }

    // Check if group belongs to user's current farm
    if (group.farm.id !== farmId) {
      throw new BadRequestException(
        "Group does not belong to your current farm",
      );
    }

    // Verify user exists
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException("User not found");
    }

    // Get farm entity
    const farm = await this.farmRepo.findOne({ where: { id: farmId } });
    if (!farm) {
      throw new BadRequestException("Farm not found");
    }

    // Verify all animals exist and belong to the farm
    const animals = await this.animalRepo.find({
      where: assignAnimalsDto.animalIds.map((id) => ({
        id,
        farm: { id: farmId },
        deletedAt: null,
        isActive: true,
      })),
    });

    if (animals.length !== assignAnimalsDto.animalIds.length) {
      throw new BadRequestException(
        "One or more animals not found or do not belong to your farm",
      );
    }

    // Check which animals are already assigned to this group
    const existingAssignments = await this.animalGroupRepo.find({
      where: {
        group: { id: groupId },
        animal: { id: In(assignAnimalsDto.animalIds) },
        deletedAt: null,
      },
      relations: ["animal"],
    });

    const existingAnimalIds = existingAssignments.map((ag) => ag.animal.id);
    const newAnimalIds = assignAnimalsDto.animalIds.filter(
      (id) => !existingAnimalIds.includes(id),
    );

    // Create new assignments
    const newAssignments = newAnimalIds.map((animalId) => {
      const animal = animals.find((a) => a.id === animalId);
      return this.animalGroupRepo.create({
        farm,
        group,
        animal: animal!,
        createdBy: user,
        updatedBy: user,
      });
    });

    if (newAssignments.length > 0) {
      await this.animalGroupRepo.save(newAssignments);
    }

    return {
      message: "Animals assigned to group successfully",
      data: {
        assigned: newAssignments.length,
        alreadyAssigned: existingAnimalIds.length,
        total: assignAnimalsDto.animalIds.length,
      },
    };
  }

  /**
   * Get animals in a group with pagination and search
   */
  async getAnimalsInGroup(
    groupId: string,
    farmId: string,
    query: ListGroupAnimalsDto,
  ) {
    // Verify farm exists
    const farmExists = await this.farmRepo.exist({ where: { id: farmId } });
    if (!farmExists) {
      throw new BadRequestException("Farm not found");
    }

    // Get group
    const group = await this.groupRepo.findOne({
      where: { id: groupId, deletedAt: null },
      relations: ["farm"],
    });

    if (!group) {
      throw new NotFoundException("Group not found");
    }

    // Check if group belongs to user's current farm
    if (group.farm.id !== farmId) {
      throw new BadRequestException(
        "Group does not belong to your current farm",
      );
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const qb = this.animalGroupRepo
      .createQueryBuilder("animalGroup")
      .innerJoinAndSelect("animalGroup.animal", "animal")
      .leftJoinAndSelect("animal.speciesRelation", "species")
      .leftJoinAndSelect("animal.breedRelation", "breed")
      .leftJoinAndSelect("breed.species", "breedSpecies")
      .where("animalGroup.group.id = :groupId", { groupId })
      .andWhere("animalGroup.deletedAt IS NULL")
      .andWhere("animal.deletedAt IS NULL")
      .andWhere("animal.isActive = :isActive", { isActive: true })
      .select([
        "animalGroup.id",
        "animalGroup.createdAt",
        "animal.id",
        "animal.name",
        "animal.gender",
        "animal.birthdate",
        "animal.photo",
        "species.id",
        "species.name",
        "species.slug",
        "breed.id",
        "breed.name",
        "breed.slug",
      ])
      .orderBy("animal.name", "ASC");

    // Apply search filter
    if (query.search) {
      qb.andWhere("LOWER(animal.name) LIKE LOWER(:search)", {
        search: `%${query.search}%`,
      });
    }

    const total = await qb.getCount();
    const animalGroups = await qb.skip(skip).take(limit).getMany();

    return {
      message: "Animals in group fetched successfully",
      data: {
        animals: animalGroups.map((ag) => ({
          id: ag.id,
          animal: ag.animal,
          assignedAt: ag.createdAt,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  /**
   * Remove animals from a group
   */
  async removeAnimalsFromGroup(
    groupId: string,
    farmId: string,
    userId: string,
    removeAnimalsDto: RemoveAnimalsDto,
  ) {
    // Verify farm exists
    const farmExists = await this.farmRepo.exist({ where: { id: farmId } });
    if (!farmExists) {
      throw new BadRequestException("Farm not found");
    }

    // Get group
    const group = await this.groupRepo.findOne({
      where: { id: groupId, deletedAt: null },
      relations: ["farm"],
    });

    if (!group) {
      throw new NotFoundException("Group not found");
    }

    // Check if group belongs to user's current farm
    if (group.farm.id !== farmId) {
      throw new BadRequestException(
        "Group does not belong to your current farm",
      );
    }

    // Verify user exists
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException("User not found");
    }

    // Get animal group assignments
    const animalGroups = await this.animalGroupRepo.find({
      where: {
        group: { id: groupId },
        animal: { id: In(removeAnimalsDto.animalIds) },
        deletedAt: null,
      },
      relations: ["animal"],
    });

    if (animalGroups.length === 0) {
      throw new BadRequestException(
        "No animals found to remove from this group",
      );
    }

    // Soft delete the assignments
    const now = new Date();
    for (const animalGroup of animalGroups) {
      animalGroup.deletedAt = now;
      animalGroup.updatedBy = user;
    }

    await this.animalGroupRepo.save(animalGroups);

    return {
      message: "Animals removed from group successfully",
      data: {
        removed: animalGroups.length,
        requested: removeAnimalsDto.animalIds.length,
      },
    };
  }

  /**
   * Delete a group (soft delete)
   * Also soft deletes all animal-group assignments for this group
   */
  async deleteGroup(groupId: string, farmId: string, userId: string) {
    // Verify farm exists
    const farmExists = await this.farmRepo.exist({ where: { id: farmId } });
    if (!farmExists) {
      throw new BadRequestException("Farm not found");
    }

    // Get group
    const group = await this.groupRepo.findOne({
      where: { id: groupId, deletedAt: null },
      relations: ["farm"],
    });

    if (!group) {
      throw new NotFoundException("Group not found");
    }

    // Check if group belongs to user's current farm
    if (group.farm.id !== farmId) {
      throw new BadRequestException(
        "Group does not belong to your current farm",
      );
    }

    // Verify user exists
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException("User not found");
    }

    // Get all animal-group assignments for this group that are not deleted
    const animalGroups = await this.animalGroupRepo.find({
      where: {
        group: { id: groupId },
        deletedAt: null,
      },
    });

    // Soft delete all animal-group assignments
    const now = new Date();
    if (animalGroups.length > 0) {
      for (const animalGroup of animalGroups) {
        animalGroup.deletedAt = now;
        animalGroup.updatedBy = user;
      }
      await this.animalGroupRepo.save(animalGroups);
    }

    // Soft delete the group
    group.deletedAt = now;
    group.updatedBy = user;

    await this.groupRepo.save(group);

    return {
      message: "Group deleted successfully",
      data: {
        deletedAnimalAssignments: animalGroups.length,
      },
    };
  }
}
