import { BadRequestException, Logger } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { Command, CommandRunner, Option } from "nest-commander";
import { DataSource } from "typeorm";
import { Role } from "../database/entities/role.entity";
import { User } from "../database/entities/user.entity";
import { BcryptService } from "../services/bcrypt.service";

@Command({
  name: "create-admin-user",
  description: "Create admin user",
})
export class CreateAdminUserCommand extends CommandRunner {
  private readonly logger = new Logger(CreateAdminUserCommand.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly bcryptService: BcryptService,
  ) {
    super();
  }

  async run(inputs: string[], payload: Record<string, string>): Promise<void> {
    const user = await this.dataSource.getRepository(User).findOneBy({
      email: payload.email,
    });

    if (user) throw new BadRequestException("Already signed up.");

    const roleRepo = this.dataSource.getRepository(Role);
    let role = await roleRepo.findOne({ where: { roleName: "SUPER_ADMIN" } });
    if (!role) {
      role = await roleRepo.save(roleRepo.create({ roleName: "SUPER_ADMIN" }));
    }

    const u = this.dataSource.getRepository(User).create({
      email: payload.email,
      name: `${payload.firstName} ${payload.lastName}`.trim(),
      password: this.bcryptService.hashSync(payload.password),
      role,
      emailVerified: true,
    });

    const _user = await this.dataSource.getRepository(User).save(u);
    this.logger.warn(
      await this.dataSource.getRepository(User).findOneBy({ id: _user.id }),
    );
  }

  @Option({
    flags: "-fn, --firstName <firstName>",
    description: "A first name",
    required: true,
  })
  parsefirstName(val: string) {
    return val;
  }

  @Option({
    flags: "-ln, --lastName <lastName>",
    description: "A last name",
    required: true,
  })
  parselastName(val: string) {
    return val;
  }

  @Option({
    flags: "-e, --email <email>",
    description: "A email",
    required: true,
  })
  parseEmail(val: string) {
    return val;
  }

  @Option({
    flags: "-p, --password <password>",
    description: "A password",
    required: true,
  })
  parsePassword(val: string) {
    return val;
  }

  // @Option({
  //   flags: '-u, --userName <userName>',
  //   description: 'A username',
  //   required: true,
  // })
  // parseUsername(val: string) {
  //   return val;
  // }
}
