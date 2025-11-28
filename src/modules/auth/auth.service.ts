import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuthConfig } from "../../config/auth.config";
import { Farm } from "../../database/entities/farm.entity";
import { Role } from "../../database/entities/role.entity";
import { UserPermission } from "../../database/entities/user-permission.entity";
import { User } from "../../database/entities/user.entity";
import { BcryptService } from "../../services/bcrypt.service";
import { GoogleService } from "../../services/google.service";
import { S3Service } from "../../services/s3.service";
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
    @InjectRepository(Farm) private readonly farms: Repository<Farm>,
    @InjectRepository(UserPermission)
    private readonly userPermissions: Repository<UserPermission>,
    private readonly bcrypt: BcryptService,
    private readonly jwt: JwtService,
    private readonly authConfig: AuthConfig,
    private readonly googleService: GoogleService,
    private readonly s3Service: S3Service,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.users.findOne({ where: { email: dto.email } });
    if (existing) throw new BadRequestException("Already signed up.");

    let role = await this.roles.findOne({ where: { roleName: "OWNER" } });
    if (!role) {
      role = await this.roles.save(this.roles.create({ roleName: "OWNER" }));
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

    // Reload user with currentFarm relation
    const userWithRelations = await this.users.findOne({
      where: { id: saved.id },
      relations: { role: true, currentFarm: true },
    });
    if (!userWithRelations)
      throw new NotFoundException("User not found after creation.");

    const tokens = await this.issueTokens(userWithRelations);
    const userWithFarmCheck =
      await this.enrichUserWithFarmCheck(userWithRelations);
    return {
      message: "Registered successfully",
      data: {
        user: userWithFarmCheck,
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
        relations: { role: true, currentFarm: true },
      });
    }
    // Fallback to email
    if (!user) {
      user = await this.users.findOne({
        where: { email },
        relations: { role: true, currentFarm: true },
      });
    }

    console.log("===========user============", user);

    // Helper function to upload Google picture to S3
    const uploadGooglePicture = async (
      pictureUrl: string | null,
    ): Promise<string | null> => {
      if (!pictureUrl) return null;
      try {
        // Download from Google and upload to S3, store only the key
        return await this.s3Service.uploadFromUrl(
          pictureUrl,
          "profile-pictures",
        );
      } catch (error) {
        console.error("Error uploading Google picture to S3:", error);
        // If upload fails, return null (don't fail the sign-in)
        return null;
      }
    };

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

      // Upload Google picture to S3 and get the key
      const profilePictureKey = await uploadGooglePicture(picture);

      const toCreate = this.users.create({
        email,
        password: this.bcrypt.hashSync(
          `google:${payload.sub ?? Math.random().toString(36).slice(2)}`,
        ),
        name,
        profilePicture: profilePictureKey, // Store only the S3 key
        emailVerified: true,
        googleSub: sub,
        role: defaultRole,
      });
      try {
        user = await this.users.save(toCreate);
        console.log("===========user 2============", user);
        // Reload with currentFarm relation
        user = await this.users.findOne({
          where: { id: user.id },
          relations: { role: true, currentFarm: true },
        });
        if (!user)
          throw new NotFoundException("User not found after creation.");
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
            // Only update profile picture if user doesn't have one
            if (!user.profilePicture && picture) {
              user.profilePicture = await uploadGooglePicture(picture);
            }
            user.emailVerified = user.emailVerified || emailVerified;
            await this.users.save(user);
          }
          // Reload with currentFarm relation
          user = await this.users.findOne({
            where: { id: user.id },
            relations: { role: true, currentFarm: true },
          });
          if (!user)
            throw new NotFoundException("User not found after update.");
        } else {
          throw e;
        }
      }
    } else {
      // Update basic profile fields if changed
      user.name = user.name ?? name;
      // Only update profile picture if user doesn't have one and Google provides one
      if (!user.profilePicture && picture) {
        user.profilePicture = await uploadGooglePicture(picture);
      }
      user.emailVerified = user.emailVerified || emailVerified;
      if (!user.googleSub && sub) user.googleSub = sub;
      await this.users.save(user);

      // Reload with currentFarm relation
      user = await this.users.findOne({
        where: { id: user.id },
        relations: { role: true, currentFarm: true },
      });
      if (!user) throw new NotFoundException("User not found after update.");
    }

    const tokens = await this.issueTokens(user);
    console.log("===========tokens============", tokens);
    const userWithFarmCheck = await this.enrichUserWithFarmCheck(user);
    return {
      message: "Logged in successfully",
      data: {
        user: userWithFarmCheck,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.users.findOne({
      where: { email: dto.email },
      relations: { role: true, currentFarm: true },
    });
    if (!user) throw new NotFoundException("Account not found.");

    this.bcrypt.compareSync(dto.password, user.password);
    const tokens = await this.issueTokens(user);
    const userWithFarmCheck = await this.enrichUserWithFarmCheck(user);
    return {
      message: "Logged in successfully",
      data: {
        user: userWithFarmCheck,
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
      relations: { role: true, currentFarm: true },
    });
    if (!user) throw new NotFoundException("Account not found.");
    const tokens = await this.issueTokens(user);
    const userWithFarmCheck = await this.enrichUserWithFarmCheck(user);
    return {
      message: "Token refreshed",
      data: {
        user: userWithFarmCheck,
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
    const userWithFarmCheck = await this.enrichUserWithFarmCheck(user);

    // Get role name
    const roleName =
      (user.role && user.role.roleName) ||
      (await this.roles.findOneBy({ id: (user as any).roleId }))?.roleName ||
      "";

    // If user is not SUPER_ADMIN or OWNER, fetch their permissions
    let permissions = [];
    if (roleName !== "SUPER_ADMIN" && roleName !== "OWNER") {
      // Only fetch permissions if user has a currentFarm
      if (user.currentFarm) {
        const userPermissionsList = await this.userPermissions.find({
          where: {
            user: { id: user.id },
            farm: { id: user.currentFarm.id },
          },
          relations: ["permission"],
        });

        permissions = userPermissionsList.map((up) => ({
          id: up.permission.id,
          module: up.permission.module,
          action: up.permission.action,
          description: up.permission.description,
        }));
      }
    }

    const responseData: any = { ...userWithFarmCheck };

    // Only include permissions if user is not SUPER_ADMIN or OWNER and has permissions
    if (
      roleName !== "SUPER_ADMIN" &&
      roleName !== "OWNER" &&
      permissions.length > 0
    ) {
      responseData.permissions = permissions;
    }

    return {
      data: responseData,
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

  /**
   * Check if user with OWNER role has at least one farm
   * Returns true if user requires farm creation (OWNER role but no farms)
   */
  private async checkRequiresFarmCreation(user: User): Promise<boolean> {
    // Ensure role is loaded
    const roleName =
      (user.role && user.role.roleName) ||
      (await this.roles.findOneBy({ id: (user as any).roleId }))?.roleName ||
      "";

    // Only check for OWNER role
    if (roleName !== "OWNER") {
      return false;
    }

    // Count farms owned by this user
    const farmCount = await this.farms.count({
      where: { owner: { id: user.id } },
    });

    // If OWNER has no farms, they need to create one
    return farmCount === 0;
  }

  /**
   * Enrich user object with farm requirement check
   */
  private async enrichUserWithFarmCheck(user: User) {
    const requiresFarmCreation = await this.checkRequiresFarmCreation(user);
    const publicUserData = await this.publicUser(user);
    return {
      ...publicUserData,
      requiresFarmCreation,
    };
  }

  /**
   * Returns user object without password and with presigned URL for profile picture
   */
  private async publicUser(user: User) {
    const { password, ...rest } = user;

    // Generate presigned URL for profile picture if it exists
    return this.s3Service.attachPresignedUrls(rest, ["profilePicture"]);
  }
}
