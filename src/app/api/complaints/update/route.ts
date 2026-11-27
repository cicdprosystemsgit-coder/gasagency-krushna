import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyRolesWithLink } from "@/app/actions/notifications";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, status } = await req.json();
  if (!id || !status) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const validStatuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
  if (!validStatuses.includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const existing = await prisma.customerComplaint.findFirst({
    where: { id, agencyId: session.agencyId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Complaint not found or unauthorized" }, { status: 404 });
  }

  const complaint = await prisma.customerComplaint.update({
    where: { id },
    data: {
      status,
      resolvedAt: status === "RESOLVED" ? new Date() : null,
      resolvedById: status === "RESOLVED" ? session.userId : null,
    },
    include: {
      customer: { select: { name: true } },
    },
  });

  await notifyRolesWithLink({
    agencyId: session.agencyId,
    roles: ["ADMIN", "MANAGER"],
    type: status === "RESOLVED" ? "COMPLAINT_RESOLVED" : "COMPLAINT_RAISED",
    title: `Complaint ${status.replace(/_/g, " ")}`,
    body: `Complaint from ${complaint.customer?.name || "Customer"} was marked ${status.replace(/_/g, " ").toLowerCase()} by ${session.name || session.role}.`,
    subPath: "/complaints",
    excludeUserId: session.userId,
  });

  return NextResponse.json({ complaint });
}
