"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Role } from "@/generated/prisma";
import { revalidatePath } from "next/cache";

export async function getRolePermissions() {
  try {
    const session = await getSession();
    if (!session || !session.agencyId || session.role !== "ADMIN") {
      return { error: "Unauthorized" };
    }

    const [overrides, customRoles] = await Promise.all([
      prisma.rolePermission.findMany({
        where: { agencyId: session.agencyId },
      }),
      prisma.customRole.findMany({
        where: { agencyId: session.agencyId },
        select: { id: true, name: true, baseRole: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    return { overrides, customRoles };
  } catch (error) {
    console.error("[getRolePermissions] Error:", error);
    return { error: "Failed to fetch permissions" };
  }
}

export async function savePermissionsBatch(
  updates: { role: string; resource: string; action: string; isAllowed: boolean }[]
) {
  try {
    const session = await getSession();
    if (!session || !session.agencyId || session.role !== "ADMIN") {
      return { error: "Unauthorized" };
    }

    // Save in transaction
    await prisma.$transaction(
      updates.map((up) =>
        prisma.rolePermission.upsert({
          where: {
            agencyId_role_resource_action: {
              agencyId: session.agencyId!,
              role: up.role,
              resource: up.resource,
              action: up.action,
            },
          },
          update: {
            isAllowed: up.isAllowed,
          },
          create: {
            agencyId: session.agencyId!,
            role: up.role,
            resource: up.resource,
            action: up.action,
            isAllowed: up.isAllowed,
          },
        })
      )
    );

    revalidatePath("/admin/security");
    return { success: true };
  } catch (error) {
    console.error("[savePermissionsBatch] Error:", error);
    return { error: "Failed to save permissions" };
  }
}
