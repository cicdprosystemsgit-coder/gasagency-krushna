import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma";

// Default application-wide static permission matrix fallback
export const DEFAULT_PERMISSIONS: Record<Role, Record<string, string[]>> = {
  SYSTEM_ADMIN: {
    agency: ["create", "read", "update", "delete"],
    user: ["create", "read", "update", "delete"],
    subscription: ["create", "read", "update", "delete"],
  },
  ADMIN: {
    customers: ["create", "read", "update", "delete"],
    products: ["create", "read", "update", "delete"],
    inventory: ["create", "read", "update", "delete"],
    godown: ["create", "read", "update", "delete"],
    vehicles: ["create", "read", "update", "delete"],
    deliveries: ["create", "read", "update", "delete"],
    transactions: ["create", "read", "update", "delete"],
    salaries: ["create", "read", "update", "delete"],
    expenses: ["create", "read", "update", "delete"],
    leaves: ["create", "read", "update", "delete"],
    gstInvoices: ["create", "read", "update", "delete"],
    dailyClosings: ["create", "read", "update", "delete"],
    branches: ["create", "read", "update", "delete"],
    staff: ["create", "read", "update", "delete"],
    approvals: ["create", "read", "update", "delete"],
    paymentReceipts: ["create", "read", "update", "delete"],
    documents: ["create", "read", "update", "delete"],
    complaints: ["create", "read", "update", "delete"],
    apiKeys: ["create", "read", "update", "delete"],
    security: ["create", "read", "update", "delete"],
    analytics: ["create", "read", "update", "delete"],
  },
  MANAGER: {
    customers: ["create", "read", "update"],
    products: ["read"],
    inventory: ["create", "read", "update"],
    godown: ["create", "read", "update"],
    vehicles: ["create", "read", "update"],
    deliveries: ["create", "read", "update"],
    transactions: ["create", "read", "update"],
    salaries: ["read"],
    expenses: ["create", "read"],
    leaves: ["create", "read", "update"],
    gstInvoices: ["create", "read", "update"],
    dailyClosings: ["create", "read", "update"],
    branches: ["read"],
    staff: ["read"],
    approvals: ["create", "read", "update"],
    paymentReceipts: ["create", "read"],
    documents: ["create", "read"],
    complaints: ["create", "read", "update"],
    analytics: ["read"],
  },
  GODOWN_KEEPER: {
    inventory: ["read", "update"],
    godown: ["create", "read", "update"],
    leaves: ["create", "read"],
    salaries: ["read"],
  },
  STAFF: {
    customers: ["create", "read", "update"],
    transactions: ["create", "read"],
    gstInvoices: ["create", "read"],
    inventory: ["read"],
    leaves: ["create", "read"],
    salaries: ["read"],
    paymentReceipts: ["create", "read"],
  },
  DELIVERY_BOY: {
    deliveries: ["read", "update"],
    leaves: ["create", "read"],
    salaries: ["read"],
  },
};

/**
 * Checks if a user has permission to perform an action on a resource.
 * Checks SYSTEM_ADMIN -> DB custom override -> Static fallback.
 */
export async function checkPermission(
  userId: string,
  resource: string,
  action: string
): Promise<boolean> {
  try {
    // Fetch user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, agencyId: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return false;
    }

    // SYSTEM_ADMIN bypasses all local checks
    if (user.role === Role.SYSTEM_ADMIN) {
      return true;
    }

    if (!user.agencyId) {
      return false;
    }

    // 1. Check database for specific override
    const override = await prisma.rolePermission.findFirst({
      where: {
        agencyId: user.agencyId,
        role: user.role,
        resource: resource,
        action: action,
      },
    });

    if (override !== null) {
      return override.isAllowed;
    }

    // 2. Fall back to the default static permission matrix
    const roleDefaultRules = DEFAULT_PERMISSIONS[user.role];
    if (!roleDefaultRules) {
      return false;
    }

    const allowedActions = roleDefaultRules[resource];
    if (!allowedActions) {
      return false;
    }

    return allowedActions.includes(action);
  } catch (error) {
    console.error(`[checkPermission] Error for user ${userId} on ${resource}:${action}:`, error);
    return false;
  }
}

/**
 * Seed default role permissions in DB for an agency if they don't exist,
 * or reset them to default.
 */
export async function seedDefaultPermissions(agencyId: string, role: Role) {
  const roleDefaultRules = DEFAULT_PERMISSIONS[role];
  if (!roleDefaultRules) return;

  const dataToInsert = [];
  for (const [resource, actions] of Object.entries(roleDefaultRules)) {
    for (const action of actions) {
      dataToInsert.push({
        agencyId,
        role,
        resource,
        action,
        isAllowed: true,
      });
    }
  }

  // Create permissions inside a transaction to prevent duplicates
  await prisma.$transaction(
    dataToInsert.map((item) =>
      prisma.rolePermission.upsert({
        where: {
          agencyId_role_resource_action: {
            agencyId: item.agencyId,
            role: item.role,
            resource: item.resource,
            action: item.action,
          },
        },
        create: item,
        update: { isAllowed: true },
      })
    )
  );
}
