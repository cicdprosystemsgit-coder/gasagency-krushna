import { type Role } from "@/generated/prisma";
import { prisma as baseClient } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Models with no agencyId field, or platform-wide models that must never be filtered.
// Everything else in the schema has agencyId and will be auto-scoped.
const GLOBAL_MODELS = new Set([
  "Agency",          // tenant root — querying the tenant itself must not be self-filtered
  "DemoRequest",     // public lead form — no agencyId column
  "TokenBlacklist",  // platform auth — no agencyId column
  "AuditLog",        // immutable platform log — agencyId is optional and must not gate reads
  "JobLog",          // background job log — optional agencyId, system-wide
  "RefreshToken",    // userId-scoped, no agencyId column
  "RenewalReminder", // linked via assetId only, no agencyId column
]);

const READ_OPS  = ["findFirst", "findMany", "count", "aggregate", "groupBy"];
const WRITE_OPS = ["update", "updateMany", "delete", "deleteMany"];

/**
 * Returns a Prisma client that automatically injects `agencyId` into every
 * read, write, and delete operation for all tenant-scoped models.
 *
 * SYSTEM_ADMIN bypasses all filtering and can query across all tenants.
 *
 * NOTE: `findUnique` / `findUniqueOrThrow` are NOT injected — Prisma's unique
 * lookup only accepts fields that are part of a @unique constraint, so adding
 * `agencyId` would break the query. Cross-tenant leakage via raw ID lookup is
 * prevented by the middleware subdomain check + JWT agencySlug validation.
 */
export function createTenantPrisma(agencyId: string | null, role: Role) {
  return baseClient.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: {
          model: string;
          operation: string;
          args: Record<string, any>;
          query: (args: Record<string, any>) => Promise<unknown>;
        }) {
          // SYSTEM_ADMIN sees all tenants — no filtering applied
          if (role === "SYSTEM_ADMIN") return query(args);

          // Platform-level models are never filtered by agencyId
          if (GLOBAL_MODELS.has(model)) return query(args);

          // All remaining models require agencyId — fail fast if missing
          if (!agencyId) {
            throw new Error(
              `[TenantPrisma] agencyId is required for ${model}.${operation} ` +
              `but the session has no agencyId. Ensure the user belongs to an agency.`
            );
          }

          // ── Read operations ─────────────────────────────────────────────────
          if (READ_OPS.includes(operation)) {
            return query({ ...args, where: { ...args.where, agencyId } });
          }

          // ── Single create ────────────────────────────────────────────────────
          if (operation === "create") {
            return query({ ...args, data: { ...args.data, agencyId } });
          }

          // ── Bulk create ──────────────────────────────────────────────────────
          if (operation === "createMany") {
            const data = Array.isArray(args.data)
              ? args.data.map((item: Record<string, unknown>) => ({ ...item, agencyId }))
              : { ...args.data, agencyId };
            return query({ ...args, data });
          }

          // ── Upsert: scope both the lookup and the create branch ──────────────
          if (operation === "upsert") {
            return query({
              ...args,
              where:  { ...args.where, agencyId },
              create: { ...args.create, agencyId },
              // update branch intentionally left unscoped — where already guards it
            });
          }

          // ── Mutations that filter by where ───────────────────────────────────
          if (WRITE_OPS.includes(operation)) {
            return query({ ...args, where: { ...args.where, agencyId } });
          }

          // findUnique / findUniqueOrThrow — pass through unmodified (see JSDoc above)
          return query(args);
        },
      },
    },
  });
}

/**
 * Convenience wrapper: reads the current request session via cookies and
 * returns a tenant-scoped client. Use this in Server Actions and Server
 * Components where Next.js cookie context is available.
 *
 * @throws if there is no active session
 */
export async function getSessionTenantPrisma() {
  const session = await getSession();
  if (!session) {
    throw new Error(
      "[TenantPrisma] No active session — cannot create tenant-scoped client. " +
      "Ensure the user is authenticated before calling this function."
    );
  }
  return createTenantPrisma(session.agencyId ?? null, session.role);
}
