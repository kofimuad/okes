import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import Fastify from "fastify";
import { env } from "./env";
import { approvalRoutes } from "./routes/approvals";
import { authRoutes } from "./routes/auth";
import { capRoutes } from "./routes/caps";
import { categoryRoutes } from "./routes/categories";
import { crewRoutes } from "./routes/crew";
import { deviceRoutes } from "./routes/devices";
import { goalRoutes } from "./routes/goals";
import { incomeRoutes } from "./routes/income";
import { missionRoutes } from "./routes/missions";
import { profileRoutes } from "./routes/profile";
import { summaryRoutes } from "./routes/summary";
import { transactionRoutes } from "./routes/transactions";
import { transferRoutes } from "./routes/transfers";
import { walletRoutes } from "./routes/wallets";

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(jwt, { secret: env.JWT_SECRET });

  app.decorate("authenticate", async (req, reply) => {
    try {
      await req.jwtVerify();
      if (req.user.type !== "access") {
        reply.code(401).send({ error: "Access token required" });
        return;
      }
    } catch {
      reply.code(401).send({ error: "Unauthorized" });
    }
  });

  app.get("/health", async () => ({ ok: true, service: "okes-api" }));

  // Auth & profile
  await app.register(authRoutes);
  await app.register(profileRoutes);
  await app.register(missionRoutes);
  await app.register(deviceRoutes);
  // Money
  await app.register(walletRoutes);
  await app.register(categoryRoutes);
  await app.register(transactionRoutes);
  await app.register(transferRoutes);
  await app.register(capRoutes);
  await app.register(goalRoutes);
  await app.register(incomeRoutes);
  // Social
  await app.register(crewRoutes);
  await app.register(approvalRoutes);
  // Dashboard
  await app.register(summaryRoutes);

  return app;
}
