import { Logger } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { Command, CommandRunner } from "nest-commander";
import { DataSource } from "typeorm";
import { Permission } from "../database/entities/permission.entity";
import { PermissionAction, PermissionModule } from "../enums/permission.enum";

@Command({
  name: "seed-permissions",
  description: "Seed permissions for all modules and actions",
})
export class SeedPermissionsCommand extends CommandRunner {
  private readonly logger = new Logger(SeedPermissionsCommand.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    super();
  }

  async run(): Promise<void> {
    const permissionRepo = this.dataSource.getRepository(Permission);

    // Define all modules and their actions
    const modules = Object.values(PermissionModule);
    const actions = Object.values(PermissionAction);

    let createdCount = 0;
    let skippedCount = 0;

    for (const module of modules) {
      for (const action of actions) {
        const existing = await permissionRepo.findOne({
          where: { module, action },
        });

        if (existing) {
          skippedCount++;
          continue;
        }

        const description = this.getDescription(module, action);
        const permission = permissionRepo.create({
          module,
          action,
          description,
        });

        await permissionRepo.save(permission);
        createdCount++;
        this.logger.log(`Created permission: ${module}:${action}`);
      }
    }

    this.logger.log(
      `Permission seeding completed. Created: ${createdCount}, Skipped: ${skippedCount}`,
    );
  }

  private getDescription(module: string, action: string): string {
    const actionDescriptions: Record<PermissionAction, string> = {
      [PermissionAction.CREATE]: "Create new records",
      [PermissionAction.READ]: "View individual records",
      [PermissionAction.UPDATE]: "Edit existing records",
      [PermissionAction.DELETE]: "Delete records",
      [PermissionAction.LISTING]: "View list of records",
    };

    return `${actionDescriptions[action]} in ${module} module`;
  }
}
