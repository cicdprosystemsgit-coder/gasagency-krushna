import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { DEFAULT_PERMISSIONS } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "No session" },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store, max-age=0, must-revalidate",
        },
      }
    );
  }

  let enabledFeatures: string[] = [];
  let themeColor = "#2563eb";
  let logoBase64: string | null = null;
  let agencyName: string | null = null;
  let customRolePermissions: { resource: string; action: string; isAllowed: boolean }[] = [];

  if (session.agencyId) {
    const agency = await prisma.agency.findUnique({
      where: { id: session.agencyId },
      select: {
        enabledFeatures: true,
        themeColor: true,
        logoBase64: true,
        name: true,
      },
    });
    if (agency) {
      enabledFeatures = agency.enabledFeatures;
      themeColor = agency.themeColor;
      logoBase64 = agency.logoBase64;
      agencyName = agency.name;
    }

    if (session.customRoleId) {
      // 1. Fetch DB overrides for this custom role
      const overrides = await prisma.rolePermission.findMany({
        where: {
          agencyId: session.agencyId,
          role: session.customRoleId,
        },
        select: {
          resource: true,
          action: true,
          isAllowed: true,
        },
      });

      if (overrides.length > 0) {
        customRolePermissions = overrides;
      } else {
        // 2. Fetch the custom role base role template defaults
        const customRoleObj = await prisma.customRole.findUnique({
          where: { id: session.customRoleId },
          select: { baseRole: true },
        });

        if (customRoleObj) {
          const basePermissions = DEFAULT_PERMISSIONS[customRoleObj.baseRole];
          if (basePermissions) {
            for (const [resource, actions] of Object.entries(basePermissions)) {
              for (const action of actions) {
                customRolePermissions.push({
                  resource,
                  action,
                  isAllowed: true,
                });
              }
            }
          }
        }
      }
    }
  }

  return NextResponse.json(
    {
      name: session.name,
      role: session.role,
      email: session.email,
      enabledFeatures,
      themeColor,
      logoBase64,
      agencyName,
      customRole: session.customRole || null,
      customRoleId: session.customRoleId || null,
      customRolePermissions,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0, must-revalidate",
      },
    }
  );
}
