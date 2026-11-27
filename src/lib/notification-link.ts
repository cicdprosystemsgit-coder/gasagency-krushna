import { checkPermission } from "@/lib/rbac";

const ROLE_DASHBOARD: Record<string, string> = {
  SYSTEM_ADMIN: "/system-admin",
  ADMIN: "/admin",
  MANAGER: "/manager",
  GODOWN_KEEPER: "/godown-keeper",
  STAFF: "/staff",
  CASHIER: "/staff",
  DELIVERY_BOY: "/delivery-boy",
};

export function getRoleDashboardPrefix(role: string): string | null {
  return ROLE_DASHBOARD[role] ?? null;
}

const ROUTE_TO_RESOURCE: Record<string, string> = {
  "/approvals": "approvals",
  "/attendance": "attendance",
  "/my-attendance": "myAttendance",
  "/salaries": "salaries",
  "/my-salary": "mySalary",
  "/inventory": "inventory",
  "/documents": "documents",
  "/leave-management": "leaves",
  "/complaints": "complaints",
  "/delivery-plan": "deliveryPlan",
  "/delivery-requests": "deliveryRequests",
  "/godown": "godown",
  "/vehicle-management": "vehicles",
  "/customer-management": "customers",
  "/office-transactions": "transactions",
  "/expenses": "expenses",
};

/**
 * Returns the link only if the user's role prefix and RBAC permissions allow
 * visiting that page; otherwise returns null so the UI displays the message
 * without navigating to /unauthorized.
 */
export async function sanitizeNotificationLink(
  link: string | null | undefined,
  userId: string,
  role: string
): Promise<string | null> {
  if (!link) return null;

  const allowedPrefix = ROLE_DASHBOARD[role];
  if (!allowedPrefix) return null;

  const pathOnly = link.split("?")[0];
  const matchesPrefix =
    pathOnly === allowedPrefix || pathOnly.startsWith(`${allowedPrefix}/`);

  if (!matchesPrefix) {
    return null;
  }

  const subPath = pathOnly.slice(allowedPrefix.length) || "/";
  const resource = Object.entries(ROUTE_TO_RESOURCE).find(
    ([route]) => subPath === route || subPath.startsWith(`${route}/`)
  )?.[1];

  if (resource) {
    const allowed = await checkPermission(userId, resource, "read");
    if (!allowed) return null;
  }

  return link;
}

