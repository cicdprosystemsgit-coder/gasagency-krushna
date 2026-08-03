import { PrismaClient } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

function createPrismaClient() {
  // Explicit pg.Pool prevents unlimited DB connections under concurrent load.
  // DB_POOL_MAX: tune per VPS RAM (default 10; each conn ~5-10 MB on Postgres).
  // PgBouncer sits upstream; connection_limit=1 in DATABASE_URL is intentional.
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
    max: parseInt(process.env.DB_POOL_MAX ?? "10"),
    idleTimeoutMillis: 30_000,       // release idle connections after 30 s
    connectionTimeoutMillis: 5_000,  // throw if no connection available in 5 s
    allowExitOnIdle: false,          // keep pool alive across requests
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: [{ emit: "stdout", level: "warn" }, { emit: "stdout", level: "error" }],
  } as ConstructorParameters<typeof PrismaClient>[0]);
}

// Production: singleton — one pool per process.
// Development: fresh client on each HMR reload.
let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  const g = globalThis as unknown as { __prisma?: PrismaClient };
  g.__prisma ??= createPrismaClient();
  prisma = g.__prisma;
} else {
  prisma = createPrismaClient();
}

export { prisma };
