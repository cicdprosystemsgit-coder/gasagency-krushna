import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No session" }, { status: 401 });

  let enabledFeatures: string[] = [];
  if (session.agencyId) {
    const agency = await prisma.agency.findUnique({
      where: { id: session.agencyId },
      select: { enabledFeatures: true },
    });
    enabledFeatures = agency?.enabledFeatures ?? [];
  }

  return NextResponse.json({
    name: session.name,
    role: session.role,
    email: session.email,
    enabledFeatures,
  });
}
