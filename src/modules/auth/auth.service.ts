import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuthConfig } from "../../config/auth.config";
import { Role } from "../../database/entities/role.entity";
import { User } from "../../database/entities/user.entity";
import { BcryptService } from "../../services/bcrypt.service";
import { GoogleService } from "../../services/google.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

type JwtPayload = {
  sub: string;
  email: string;
  role: string;
};

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    private readonly bcrypt: BcryptService,
    private readonly jwt: JwtService,
    private readonly authConfig: AuthConfig,
    private readonly googleService: GoogleService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.users.findOne({ where: { email: dto.email } });
    if (existing) throw new BadRequestException("Already signed up.");

    let role = await this.roles.findOne({ where: { roleName: "USER" } });
    if (!role) {
      role = await this.roles.save(this.roles.create({ roleName: "USER" }));
    }

    const user = this.users.create({
      email: dto.email,
      password: this.bcrypt.hashSync(dto.password),
      name: dto.name ?? null,
      mobile: dto.mobile ?? null,
      emailVerified: false,
      role,
    });
    const saved = await this.users.save(user);
    const tokens = await this.issueTokens(saved);
    return {
      message: "Registered successfully",
      data: {
        user: this.publicUser(saved),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    };
  }

  async googleSignIn(idToken: string) {
    const payload = await this.googleService.verifyIdToken(idToken);
    const email = payload.email;
    const name = payload.name ?? null;
    const picture = (payload as any).picture ?? null;
    const emailVerified = payload.email_verified ?? false;
    const sub = payload.sub ?? null;
    if (!email) throw new BadRequestException("Google account has no email.");
    if (!emailVerified)
      throw new BadRequestException("Google email is not verified.");

    console.log("===========email============", email);

    let user: User | null = null;
    // Try lookup by Google sub first
    if (sub) {
      user = await this.users.findOne({
        where: { googleSub: sub },
        relations: { role: true },
      });
    }
    // Fallback to email
    if (!user) {
      user = await this.users.findOne({
        where: { email },
        relations: { role: true },
      });
    }

    console.log("===========user============", user);
    if (!user) {
      let defaultRole = await this.roles.findOne({
        where: { roleName: "OWNER" },
      });
      if (!defaultRole) {
        defaultRole = await this.roles.save(
          this.roles.create({ roleName: "OWNER" }),
        );
      }
      console.log("===========defaultRole============", defaultRole);
      const toCreate = this.users.create({
        email,
        password: this.bcrypt.hashSync(
          `google:${payload.sub ?? Math.random().toString(36).slice(2)}`,
        ),
        name,
        profilePicture: picture,
        emailVerified: true,
        googleSub: sub,
        role: defaultRole,
      });
      try {
        user = await this.users.save(toCreate);
        console.log("===========user 2============", user);
      } catch (e: any) {
        // If another user with same email already exists, link googleSub and continue
        if (e?.code === "23505") {
          user = await this.users.findOne({
            where: { email },
            relations: { role: true },
          });
          if (!user) throw e;
          if (!user.googleSub && sub) {
            user.googleSub = sub;
            user.name = user.name ?? name;
            user.profilePicture = user.profilePicture ?? picture;
            user.emailVerified = user.emailVerified || emailVerified;
            await this.users.save(user);
          }
        } else {
          throw e;
        }
      }
    } else {
      // Update basic profile fields if changed
      user.name = user.name ?? name;
      user.profilePicture = user.profilePicture ?? picture;
      user.emailVerified = user.emailVerified || emailVerified;
      if (!user.googleSub && sub) user.googleSub = sub;
      await this.users.save(user);
    }

    const tokens = await this.issueTokens(user);
    console.log("===========tokens============", tokens);
    return {
      message: "Logged in successfully",
      data: {
        user: this.publicUser(user),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.users.findOne({
      where: { email: dto.email },
      relations: { role: true },
    });
    if (!user) throw new NotFoundException("Account not found.");

    this.bcrypt.compareSync(dto.password, user.password);
    const tokens = await this.issueTokens(user);
    return {
      message: "Logged in successfully",
      data: {
        user: this.publicUser(user),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    };
  }

  async refresh(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.authConfig.refreshSecret,
      });
    } catch {
      throw new BadRequestException("Invalid refresh token.");
    }
    const user = await this.users.findOne({
      where: { id: payload.sub },
      relations: { role: true },
    });
    if (!user) throw new NotFoundException("Account not found.");
    const tokens = await this.issueTokens(user);
    return {
      message: "Token refreshed",
      data: {
        user: this.publicUser(user),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    };
  }

  async logout(userFromReq: { id: string }) {
    // Verify user exists
    const user = await this.users.findOne({
      where: { id: userFromReq.id },
    });
    if (!user) throw new NotFoundException("Account not found.");

    // In a stateless JWT system, logout is primarily handled client-side
    // by removing tokens from storage. This endpoint confirms the logout.
    // For enhanced security, you could implement token blacklisting here.
    return {
      message: "Logged out successfully",
    };
  }

  async me(userFromReq: { id: string }) {
    const user = await this.users.findOne({
      where: { id: userFromReq.id },
      relations: { role: true, currentFarm: true },
    });
    if (!user) throw new NotFoundException("Account not found.");
    return {
      data: this.publicUser(user),
    };
  }

  private async issueTokens(user: User) {
    // Ensure role is loaded
    const roleName =
      (user.role && user.role.roleName) ||
      (await this.roles.findOneBy({ id: (user as any).roleId }))?.roleName ||
      "USER";

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: roleName,
    };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.authConfig.accessSecret,
      // cast due to jsonwebtoken typings
      expiresIn: this.authConfig.accessExpires as any,
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.authConfig.refreshSecret,
      expiresIn: this.authConfig.refreshExpires as any,
    });
    return { accessToken, refreshToken };
  }

  private publicUser(user: User) {
    const { password, ...rest } = user;
    return rest;
  }
}
