/**
 * feature-gate.ts
 * Server-side feature access enforcement.
 * Call `getSessionWithFeatures()` in every page, then pass the result to
 * `requireFeature(session, "feature_key")` to enforce access.
 */

import { redirect } from "next/navigation";
import { getSession, type SessionPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface SessionWithFeatures extends SessionPayload {
  enabledFeatures: string[];
}

/**
 * Returns the current session augmented with the agency's enabledFeatures array.
 * If there is no valid session, returns null.
 */
export async function getSessionWithFeatures(): Promise<SessionWithFeatures | null> {
  const session = await getSession();
  if (!session) return null;

  if (!session.agencyId) {
    // SYSTEM_ADMIN or unauthenticated — no feature restrictions
    return { ...session, enabledFeatures: [] };
  }

  const agency = await prisma.agency.findUnique({
    where: { id: session.agencyId },
    select: { enabledFeatures: true },
  });

  return {
    ...session,
    enabledFeatures: agency?.enabledFeatures ?? [],
  };
}

/**
 * Checks whether `featureKey` is enabled for the agency.
 * - If enabledFeatures is EMPTY → all features are enabled (backward-compat for old agencies).
 * - If enabledFeatures is non-empty → only listed keys are accessible.
 *
 * Redirects to /feature-disabled if the feature is not granted.
 */
export function requireFeature(
  session: SessionWithFeatures,
  featureKey: string
): void {
  const { enabledFeatures } = session;
  // Empty array = legacy agency with all features unlocked
  if (enabledFeatures.length === 0) return;

  // Stock, Daily Sheet & Monthly Records are core operations:
  // If agency has stock, daily_sheet, monthly_records, inventory or godown enabled, grant access.
  if (featureKey === "stock" || featureKey === "daily_sheet" || featureKey === "monthly_records") {
    if (
      enabledFeatures.includes("stock") ||
      enabledFeatures.includes("daily_sheet") ||
      enabledFeatures.includes("monthly_records") ||
      enabledFeatures.includes("inventory") ||
      enabledFeatures.includes("godown")
    ) {
      return;
    }
  }

  if (!enabledFeatures.includes(featureKey)) {
    redirect("/feature-disabled");
  }
}
