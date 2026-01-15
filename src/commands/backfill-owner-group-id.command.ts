import { Logger } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { Command, CommandRunner } from "nest-commander";
import { DataSource } from "typeorm";

@Command({
  name: "backfill-owner-group-id",
  description:
    "Generate UUID for every unique owner and assign to owner and their farm users",
})
export class BackfillOwnerGroupIdCommand extends CommandRunner {
  private readonly logger = new Logger(BackfillOwnerGroupIdCommand.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    super();
  }

  async run(): Promise<void> {
    this.logger.log("Starting owner group ID backfill...");

    try {
      // Step 1: Find all unique owners (users who own farms)
      const ownersQuery = `
        SELECT DISTINCT u.id as owner_id, u.email as owner_email, u.created_at
        FROM users u
        INNER JOIN farms f ON f.owner_id = u.id
        WHERE u.deleted_at IS NULL
        AND f.deleted_at IS NULL
        ORDER BY u.created_at ASC;
      `;

      const owners = await this.dataSource.query(ownersQuery);
      this.logger.log(`Found ${owners.length} unique owners`);

      if (owners.length === 0) {
        this.logger.warn("No owners found. Nothing to backfill.");
        return;
      }

      let processedOwners = 0;
      let processedUsers = 0;

      // Step 2: For each owner, generate UUID and assign to owner and their users
      for (const owner of owners) {
        const ownerId = owner.owner_id;
        const ownerEmail = owner.owner_email;

        // Generate UUID for this owner group
        const ownerGroupIdResult = await this.dataSource.query(
          `SELECT uuid_generate_v4() as group_id;`,
        );
        const ownerGroupId = ownerGroupIdResult[0].group_id;

        this.logger.log(
          `Processing owner: ${ownerEmail} (${ownerId}) -> Group ID: ${ownerGroupId}`,
        );

        // Step 3: Update owner's owner_group_id
        await this.dataSource.query(
          `
          UPDATE users
          SET owner_group_id = $1
          WHERE id = $2
          AND deleted_at IS NULL;
        `,
          [ownerGroupId, ownerId],
        );

        processedOwners++;

        // Step 4: Find all users that belong to farms owned by this owner
        // These are users in farm_members table for farms owned by this owner
        const farmUsersQuery = `
          SELECT DISTINCT u.id as user_id, u.email as user_email
          FROM users u
          INNER JOIN farm_members fm ON fm.user_id = u.id
          INNER JOIN farms f ON f.id = fm.farm_id
          WHERE f.owner_id = $1
          AND u.id != $1
          AND u.deleted_at IS NULL
          AND f.deleted_at IS NULL
          AND fm.user_id IS NOT NULL;
        `;

        const farmUsers = await this.dataSource.query(farmUsersQuery, [
          ownerId,
        ]);

        if (farmUsers.length > 0) {
          this.logger.log(
            `  Found ${farmUsers.length} users for owner ${ownerEmail}`,
          );

          // Step 5: Update all farm users with the owner's group ID
          for (const farmUser of farmUsers) {
            await this.dataSource.query(
              `
              UPDATE users
              SET owner_group_id = $1
              WHERE id = $2
              AND deleted_at IS NULL;
            `,
              [ownerGroupId, farmUser.user_id],
            );

            processedUsers++;
            this.logger.debug(
              `    Assigned group ID to user: ${farmUser.user_email}`,
            );
          }
        } else {
          this.logger.debug(`  No farm users found for owner ${ownerEmail}`);
        }
      }

      // Step 6: Handle owners who don't have farms yet (newly registered owners)
      const ownersWithoutFarmsQuery = `
        SELECT u.id as user_id, u.email as user_email
        FROM users u
        INNER JOIN roles r ON r.id = u.role_id
        WHERE r.role_name = 'OWNER'
        AND u.owner_group_id IS NULL
        AND u.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM farms f WHERE f.owner_id = u.id AND f.deleted_at IS NULL
        );
      `;

      const ownersWithoutFarms = await this.dataSource.query(
        ownersWithoutFarmsQuery,
      );

      if (ownersWithoutFarms.length > 0) {
        this.logger.log(
          `Found ${ownersWithoutFarms.length} owners without farms. Generating group IDs...`,
        );

        for (const ownerWithoutFarm of ownersWithoutFarms) {
          const ownerGroupIdResult = await this.dataSource.query(
            `SELECT uuid_generate_v4() as group_id;`,
          );
          const ownerGroupId = ownerGroupIdResult[0].group_id;

          await this.dataSource.query(
            `
            UPDATE users
            SET owner_group_id = $1
            WHERE id = $2
            AND deleted_at IS NULL;
          `,
            [ownerGroupId, ownerWithoutFarm.user_id],
          );

          processedOwners++;
          this.logger.log(
            `  Generated group ID for owner without farms: ${ownerWithoutFarm.user_email}`,
          );
        }
      }

      this.logger.log(
        `✅ Backfill completed successfully! Processed ${processedOwners} owners and ${processedUsers} farm users.`,
      );

      // Step 7: Verify the backfill
      const verificationQuery = `
        SELECT 
          COUNT(*) FILTER (WHERE owner_group_id IS NOT NULL) as users_with_group_id,
          COUNT(*) FILTER (WHERE owner_group_id IS NULL) as users_without_group_id
        FROM users
        WHERE deleted_at IS NULL;
      `;

      const verification = await this.dataSource.query(verificationQuery);
      this.logger.log(
        `Verification: ${verification[0].users_with_group_id} users with group ID, ${verification[0].users_without_group_id} users without group ID`,
      );

      if (verification[0].users_without_group_id > 0) {
        // Check what types of users don't have group IDs
        const usersWithoutGroupIdQuery = `
          SELECT r.role_name, COUNT(*) as count
          FROM users u
          INNER JOIN roles r ON r.id = u.role_id
          WHERE u.owner_group_id IS NULL
          AND u.deleted_at IS NULL
          GROUP BY r.role_name;
        `;

        const usersWithoutGroupId = await this.dataSource.query(
          usersWithoutGroupIdQuery,
        );

        this.logger.warn(
          `⚠️  Warning: ${verification[0].users_without_group_id} users still don't have owner_group_id:`,
        );
        usersWithoutGroupId.forEach(
          (row: { role_name: string; count: string }) => {
            this.logger.warn(`  - ${row.role_name}: ${row.count} users`);
          },
        );
        this.logger.warn(
          `  Note: SUPER_ADMIN users don't need owner_group_id. Other users should be assigned to an owner's group.`,
        );
      }
    } catch (error) {
      this.logger.error("Error during backfill:", error);
      throw error;
    }
  }
}
