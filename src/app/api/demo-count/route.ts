import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "SYSTEM_ADMIN") {
    return NextResponse.json({ count: 0 });
  }
  const count = await prisma.demoRequest.count({ where: { status: "NEW" } });
  return NextResponse.json({ count });
}
