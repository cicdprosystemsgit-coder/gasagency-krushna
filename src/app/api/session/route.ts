import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

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
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0, must-revalidate",
      },
    }
  );
}
