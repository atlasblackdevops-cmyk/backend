import "fastify";
import { User } from "../database/entities/user.entity";

declare module "fastify" {
  export interface FastifyRequest {
    user: User | { id: string; email: string; role: string } | undefined;
    session: string | undefined;
  }
}
