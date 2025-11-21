import { Injectable } from "@nestjs/common";
import { OAuth2Client, TokenPayload } from "google-auth-library";
import { GoogleConfig } from "../config/google.config";

@Injectable()
export class GoogleService {
  private client: OAuth2Client;

  constructor(private readonly config: GoogleConfig) {
    this.client = new OAuth2Client(this.config.clientId);
  }

  async verifyIdToken(idToken: string): Promise<TokenPayload> {
    const ticket = await this.client.verifyIdToken({
      idToken,
      audience: this.config.clientId,
    });
    const payload = ticket.getPayload();
    if (!payload) throw new Error("Invalid Google ID token");
    return payload;
  }
}
