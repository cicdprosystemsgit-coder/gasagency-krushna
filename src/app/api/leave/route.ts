import { NextRequest, NextResponse } from "next/server";
import { getSession, verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LeaveType } from "@/generated/prisma";

export const dynamic = "force-dynamic";

async function getAuth(req: NextRequest) {
  let session = await getSession();
  if (!session) {
    const auth = req.headers.get("Authorization");
    if (auth?.startsWith("Bearer ")) {
      session = await verifySession(auth.slice(7));
    }
  }
  return session;
}

/**
 * GET /api/leave
 * Returns user's leave requests
 */
export async function GET(req: NextRequest) {
  const session = await getAuth(req);
  if (!session || !session.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [leaves, balances] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: {
        agencyId: session.agencyId,
        employeeId: session.userId,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        reviewedBy: { select: { name: true } },
      },
    }),
    prisma.leaveBalance.findMany({
      where: {
        agencyId: session.agencyId,
        employeeId: session.userId,
      },
    }),
  ]);

  return NextResponse.json({ data: leaves, balances });
}

/**
 * POST /api/leave
 * Body: { leaveType: LeaveType, startDate: string, endDate: string, totalDays: number, reason: string }
 */
export async function POST(req: NextRequest) {
  const session = await getAuth(req);
  if (!session || !session.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { leaveType, startDate, endDate, totalDays, reason } = body ?? {};

  if (!leaveType || !startDate || !endDate || !reason?.trim()) {
    return NextResponse.json(
      { error: "Leave type, dates, and reason are required" },
      { status: 400 }
    );
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  const days = Number(totalDays) > 0 ? Number(totalDays) : 1;

  // Check overlap
  const overlap = await prisma.leaveRequest.findFirst({
    where: {
      agencyId: session.agencyId,
      employeeId: session.userId,
      status: { in: ["PENDING", "APPROVED"] },
      OR: [{ startDate: { lte: end }, endDate: { gte: start } }],
    },
  });

  if (overlap) {
    return NextResponse.json(
      { error: "You already have a leave request overlapping these dates" },
      { status: 400 }
    );
  }

  const leave = await prisma.leaveRequest.create({
    data: {
      agencyId: session.agencyId,
      employeeId: session.userId,
      leaveType: leaveType as LeaveType,
      startDate: start,
      endDate: end,
      totalDays: days,
      reason: reason.trim(),
    },
  });

  return NextResponse.json({ success: true, data: leave });
}

/**
 * DELETE /api/leave?id=<id>
 * Cancel a pending leave request
 */
export async function DELETE(req: NextRequest) {
  const session = await getAuth(req);
  if (!session || !session.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Leave ID is required" }, { status: 400 });
  }

  const leave = await prisma.leaveRequest.findFirst({
    where: {
      id,
      agencyId: session.agencyId,
      employeeId: session.userId,
      status: "PENDING",
    },
  });

  if (!leave) {
    return NextResponse.json(
      { error: "Pending leave request not found" },
      { status: 404 }
    );
  }

  await prisma.leaveRequest.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
