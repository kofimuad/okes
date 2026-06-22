import type { FastifyReply, FastifyRequest } from "fastify";

type TokenType = "access" | "refresh";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; type: TokenType };
    user: { sub: string; type: TokenType };
  }
}

declare module "fastify" {
  interface FastifyInstance {
    /** Verifies a valid *access* JWT or replies 401. */
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
