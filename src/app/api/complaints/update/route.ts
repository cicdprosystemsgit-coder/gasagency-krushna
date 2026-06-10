import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, status } = await req.json();
  if (!id || !status) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const validStatuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
  if (!validStatuses.includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const complaint = await prisma.customerComplaint.update({
    where: { id, agencyId: session.agencyId },
    data: {
      status,
      resolvedAt: status === "RESOLVED" ? new Date() : null,
      resolvedById: status === "RESOLVED" ? session.userId : null,
    },
  });

  return NextResponse.json({ complaint });
}
