import { BadRequestException, Logger } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { Command, CommandRunner, Option } from "nest-commander";
import { DataSource } from "typeorm";
import { Role } from "../database/entities/role.entity";
import { User } from "../database/entities/user.entity";
import { BcryptService } from "../services/bcrypt.service";

@Command({
  name: "seed-super-admin",
  description: "Seed a SUPER_ADMIN user if not exists",
})
export class SeedSuperAdminCommand extends CommandRunner {
  private readonly logger = new Logger(SeedSuperAdminCommand.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly bcryptService: BcryptService,
  ) {
    super();
  }

  async run(inputs: string[], payload: Record<string, string>): Promise<void> {
    const email = payload.email || process.env.SUPER_ADMIN_EMAIL;
    const password = payload.password || process.env.SUPER_ADMIN_PASSWORD;
    const firstName = payload.firstName || "Super";
    const lastName = payload.lastName || "Admin";

    if (!email || !password)
      throw new BadRequestException(
        "Provide email and password via flags or env vars SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD",
      );

    const repo = this.dataSource.getRepository(User);
    const exists = await repo.findOne({ where: { email } });
    if (exists) {
      this.logger.log("Super admin already exists. Skipping.");
      return;
    }

    const roleRepo = this.dataSource.getRepository(Role);
    let role = await roleRepo.findOne({ where: { roleName: "SUPER_ADMIN" } });
    if (!role) {
      role = await roleRepo.save(roleRepo.create({ roleName: "SUPER_ADMIN" }));
    }

    const u = repo.create({
      email,
      name: `${firstName} ${lastName}`.trim(),
      password: this.bcryptService.hashSync(password),
      role,
      emailVerified: true,
    });
    const saved = await repo.save(u);
    this.logger.log(`Super admin created with id=${saved.id} email=${email}`);
  }

  @Option({
    flags: "-e, --email <email>",
    description: "Super admin email",
  })
  parseEmail(val: string) {
    return val;
  }

  @Option({
    flags: "-p, --password <password>",
    description: "Super admin password",
  })
  parsePassword(val: string) {
    return val;
  }

  @Option({
    flags: "-fn, --firstName <firstName>",
    description: "First name",
  })
  parseFirstName(val: string) {
    return val;
  }

  @Option({
    flags: "-ln, --lastName <lastName>",
    description: "Last name",
  })
  parseLastName(val: string) {
    return val;
  }
}
