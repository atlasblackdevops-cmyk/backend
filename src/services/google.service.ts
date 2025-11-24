import { BadRequestException, Injectable } from "@nestjs/common";
import { OAuth2Client, TokenPayload } from "google-auth-library";
import { GoogleConfig } from "../config/google.config";

@Injectable()
export class GoogleService {
  private client: OAuth2Client;

  constructor(private readonly config: GoogleConfig) {
    this.client = new OAuth2Client(this.config.clientId);
  }

  async verifyIdToken(idToken: string): Promise<TokenPayload> {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.config.clientId,
      });
      const payload = ticket.getPayload();
      if (!payload) {
        throw new BadRequestException("Invalid Google ID token");
      }
      return payload;
    } catch (error: any) {
      // Handle token expiration errors
      if (
        error.message?.includes("Token used too late") ||
        error.message?.includes("expired")
      ) {
        throw new BadRequestException(
          "Google ID token has expired. Please sign in again to get a fresh token.",
        );
      }
      // Handle other verification errors
      if (
        error.message?.includes("Invalid token signature") ||
        error.message?.includes("Invalid token")
      ) {
        throw new BadRequestException(
          "Invalid Google ID token. Please sign in again.",
        );
      }
      // Re-throw BadRequestException as-is
      if (error instanceof BadRequestException) {
        throw error;
      }
      // Wrap other errors
      throw new BadRequestException(
        `Failed to verify Google ID token: ${error.message || "Unknown error"}`,
      );
    }
  }
}
