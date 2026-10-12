import { PrismaClient } from "@generated/prisma";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  createClient();

function createClient() {
  const client = new PrismaClient({
    log: process.env.MEDPLAY_SQL_TIMING === "1"
      ? ["error", "warn", { emit: "event", level: "query" }]
      : ["error", "warn"],
  });
  if (process.env.MEDPLAY_SQL_TIMING === "1") {
    client.$on("query", event => {
      // Never log SQL, parameters, emails, passwords or connection strings.
      console.info(JSON.stringify({ kind: "db-query-timing", at: event.timestamp.toISOString(), durationMs: event.duration }));
    });
  }
  return client;
}

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
