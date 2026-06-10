import { PrismaClient } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);
}

// Production: singleton to avoid exhausting the connection pool across requests.
// Development: always create a fresh client so `prisma generate` changes take
// effect immediately without a full server restart (globalThis would otherwise
// keep the stale pre-generate instance alive across HMR reloads).
let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  const g = globalThis as unknown as { __prisma?: PrismaClient };
  g.__prisma ??= createPrismaClient();
  prisma = g.__prisma;
} else {
  prisma = createPrismaClient();
}

export { prisma };
