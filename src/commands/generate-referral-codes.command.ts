import { Logger } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { Command, CommandRunner } from "nest-commander";
import { DataSource } from "typeorm";

@Command({
  name: "generate-referral-codes",
  description:
    "Generate unique referral codes for all existing users who don't have one",
})
export class GenerateReferralCodesCommand extends CommandRunner {
  private readonly logger = new Logger(GenerateReferralCodesCommand.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    super();
  }

  /**
   * Generates a unique 8-character alphanumeric referral code
   * Uses characters that are easy to distinguish (removes 0, O, I, 1)
   */
  private generateReferralCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing chars
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Checks if a referral code already exists in the database
   */
  private async codeExists(code: string): Promise<boolean> {
    const result = await this.dataSource.query(
      `SELECT 1 FROM users WHERE referral_code = $1 LIMIT 1`,
      [code],
    );
    return result.length > 0;
  }

  /**
   * Generates a unique referral code with retry logic
   */
  private async generateUniqueReferralCode(): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const code = this.generateReferralCode();
      const exists = await this.codeExists(code);

      if (!exists) {
        return code;
      }

      attempts++;
      this.logger.debug(
        `Code collision detected, retrying... (attempt ${attempts}/${maxAttempts})`,
      );
    }

    // Fallback: use UUID-based code if too many collisions
    const uuidResult = await this.dataSource.query(
      `SELECT UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 8)) as code`,
    );
    return uuidResult[0].code;
  }

  /**
   * Checks if a column exists in the users table
   */
  private async columnExists(columnName: string): Promise<boolean> {
    const result = await this.dataSource.query(
      `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = $1;
    `,
      [columnName],
    );
    return result.length > 0;
  }

  async run(): Promise<void> {
    this.logger.log("Starting referral code generation for existing users...");

    try {
      // Check if migration 1 has run (check for referral_code_generated_at column)
      const hasNewColumns = await this.columnExists(
        "referral_code_generated_at",
      );

      if (!hasNewColumns) {
        this.logger.error(
          "❌ Error: Migration 1 (CreateReferralSystemTables) has not been run yet!",
        );
        this.logger.error(
          "Please run 'npm run migration:run:local' first to create the required columns.",
        );
        throw new Error(
          "Migration 1 must be run before generating referral codes",
        );
      }

      // Step 1: Find all users without referral codes
      const usersWithoutCodes = await this.dataSource.query(
        `
        SELECT id, email, name, created_at
        FROM users
        WHERE referral_code IS NULL
        AND deleted_at IS NULL
        ORDER BY created_at ASC;
      `,
      );

      this.logger.log(
        `Found ${usersWithoutCodes.length} users without referral codes`,
      );

      if (usersWithoutCodes.length === 0) {
        this.logger.log("✅ All users already have referral codes!");
        return;
      }

      let processed = 0;
      let errors = 0;

      // Step 2: Generate unique codes for each user
      for (const user of usersWithoutCodes) {
        try {
          const referralCode = await this.generateUniqueReferralCode();

          // Step 3: Update user with referral code
          // Only update referral_code_generated_at if column exists
          await this.dataSource.query(
            `
            UPDATE users
            SET 
              referral_code = $1,
              referral_code_generated_at = NOW()
            WHERE id = $2;
          `,
            [referralCode, user.id],
          );

          processed++;
          this.logger.debug(
            `Generated code for user: ${user.email || user.name || user.id} -> ${referralCode}`,
          );

          // Log progress every 10 users
          if (processed % 10 === 0) {
            this.logger.log(
              `Processed ${processed}/${usersWithoutCodes.length} users...`,
            );
          }
        } catch (error) {
          errors++;
          this.logger.error(
            `Error generating code for user ${user.email || user.id}:`,
            error,
          );
        }
      }

      this.logger.log(
        `✅ Referral code generation completed! Processed: ${processed}, Errors: ${errors}`,
      );

      // Step 4: Verify all users have codes
      const verification = await this.dataSource.query(
        `
        SELECT 
          COUNT(*) FILTER (WHERE referral_code IS NOT NULL) as users_with_code,
          COUNT(*) FILTER (WHERE referral_code IS NULL) as users_without_code
        FROM users
        WHERE deleted_at IS NULL;
      `,
      );

      const usersWithCode = parseInt(verification[0].users_with_code);
      const usersWithoutCode = parseInt(verification[0].users_without_code);

      this.logger.log(
        `Verification: ${usersWithCode} users with codes, ${usersWithoutCode} users without codes`,
      );

      // Step 5: Verify all users have codes
      if (usersWithoutCode === 0) {
        this.logger.log("✅ All users have referral codes!");
        this.logger.log(
          "You can now run the migration to make referral_code NOT NULL.",
        );
      } else {
        this.logger.warn(
          `⚠️  Warning: ${usersWithoutCode} users still don't have referral codes.`,
        );
        this.logger.warn(
          "Please fix these users before running the migration to make referral_code NOT NULL.",
        );
      }
    } catch (error) {
      this.logger.error("Error during referral code generation:", error);
      throw error;
    }
  }
}
