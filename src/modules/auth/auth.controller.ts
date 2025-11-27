import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { FastifyRequest } from "fastify";
import { AuthService } from "./auth.service";
import { GoogleSignInDto } from "./dto/google-signin.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { RegisterDto } from "./dto/register.dto";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post("login")
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post("refresh")
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post("google")
  google(@Body() dto: GoogleSignInDto) {
    return this.authService.googleSignIn(dto.idToken);
  }

  @Post("logout")
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(AuthGuard("jwt"))
  logout(@Req() req: FastifyRequest) {
    return this.authService.logout(req.user as any);
  }

  @Get("me")
  @ApiOperation({
    summary: "Get current user information",
    description:
      "Returns the authenticated user's profile information. For non-admin/owner users, also includes their assigned permissions for the current farm, which can be used to control UI access (e.g., showing/hiding tabs).",
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard("jwt"))
  @ApiResponse({
    status: 200,
    description: "User information retrieved successfully",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        statusCode: { type: "number", example: 200 },
        data: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            email: { type: "string", example: "user@example.com" },
            name: { type: "string", nullable: true, example: "John Doe" },
            mobile: { type: "string", nullable: true },
            emailVerified: { type: "boolean", example: false },
            isActive: { type: "boolean", example: true },
            profilePicture: { type: "string", nullable: true },
            requiresFarmCreation: {
              type: "boolean",
              example: false,
              description:
                "Indicates if the user needs to create a farm (only for OWNER role with no farms)",
            },
            role: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                roleName: {
                  type: "string",
                  enum: ["SUPER_ADMIN", "OWNER", "MANAGER", "USER"],
                  example: "MANAGER",
                },
              },
            },
            currentFarm: {
              type: "object",
              nullable: true,
              properties: {
                id: { type: "string", format: "uuid" },
                farmName: { type: "string", example: "My Farm" },
              },
            },
            permissions: {
              type: "array",
              nullable: true,
              description:
                "Only included for non-SUPER_ADMIN and non-OWNER users who have permissions assigned to their current farm. Used to control UI access (e.g., showing/hiding tabs).",
              items: {
                type: "object",
                properties: {
                  id: { type: "string", format: "uuid" },
                  module: {
                    type: "string",
                    example: "CROPS",
                    description: "The module this permission applies to",
                  },
                  action: {
                    type: "string",
                    example: "CREATE",
                    description:
                      "The action allowed (CREATE, READ, UPDATE, DELETE, LISTING)",
                  },
                  description: {
                    type: "string",
                    nullable: true,
                    example: "Create new records in CROPS module",
                  },
                },
              },
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid or missing token",
  })
  @ApiResponse({
    status: 404,
    description: "User not found",
  })
  me(@Req() req: FastifyRequest) {
    return this.authService.me(req.user as any);
  }
}
