import { NextRequest, NextResponse } from "next/server";
import { getSession, verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
 * GET /api/approvals
 * Returns pending approvals for Admin & Manager roles
 */
export async function GET(req: NextRequest) {
  const session = await getAuth(req);
  if (!session || !session.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [pendingLeaves, pendingRegularizations, pendingSalaryRequests] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: { agencyId: session.agencyId, status: "PENDING" },
      include: {
        employee: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.attendanceRegularization.findMany({
      where: { agencyId: session.agencyId, status: "PENDING" },
      include: {
        employee: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.salaryPaymentRequest.findMany({
      where: { agencyId: session.agencyId, status: "PENDING" },
      include: {
        employee: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const totalPending =
    pendingLeaves.length + pendingRegularizations.length + pendingSalaryRequests.length;

  return NextResponse.json({
    totalPending,
    leaves: pendingLeaves,
    regularizations: pendingRegularizations,
    salaryRequests: pendingSalaryRequests,
  });
}

/**
 * POST /api/approvals
 * Body: { type: "LEAVE" | "REGULARIZATION" | "SALARY", id: string, action: "APPROVE" | "REJECT", note?: string }
 */
export async function POST(req: NextRequest) {
  const session = await getAuth(req);
  if (!session || !["ADMIN", "MANAGER", "SYSTEM_ADMIN"].includes(session.role) || !session.agencyId) {
    return NextResponse.json({ error: "Unauthorized — Manager or Admin required" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { type, id, action, note } = body ?? {};

  if (!type || !id || !["APPROVE", "REJECT"].includes(action)) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  if (type === "LEAVE") {
    const status = action === "APPROVE" ? "APPROVED" : "REJECTED";
    const updated = await prisma.leaveRequest.update({
      where: { id, agencyId: session.agencyId },
      data: {
        status,
        reviewNote: note || null,
        reviewedById: session.userId,
        reviewedAt: new Date(),
      },
    });

    await prisma.notification.create({
      data: {
        agencyId: session.agencyId,
        userId: updated.employeeId,
        type: "LEAVE_STATUS",
        title: `Leave ${status}`,
        body: `Your leave request for ${updated.startDate.toISOString().split("T")[0]} was ${status.toLowerCase()}.`,
      },
    });

    return NextResponse.json({ success: true, updated });
  }

  if (type === "REGULARIZATION") {
    const status = action === "APPROVE" ? "APPROVED" : "REJECTED";
    const reqRecord = await prisma.attendanceRegularization.findUnique({
      where: { id, agencyId: session.agencyId },
    });

    if (!reqRecord) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.attendanceRegularization.update({
      where: { id },
      data: {
        status,
        reviewNote: note || null,
        reviewedById: session.userId,
        reviewedAt: new Date(),
      },
    });

    if (action === "APPROVE") {
      await prisma.attendance.upsert({
        where: {
          agencyId_employeeId_date: {
            agencyId: reqRecord.agencyId,
            employeeId: reqRecord.employeeId,
            date: reqRecord.date,
          },
        },
        update: {
          status: "PRESENT",
          punchIn: reqRecord.requestedPunchIn ?? undefined,
          punchOut: reqRecord.requestedPunchOut ?? undefined,
        },
        create: {
          agencyId: reqRecord.agencyId,
          employeeId: reqRecord.employeeId,
          date: reqRecord.date,
          status: "PRESENT",
          punchIn: reqRecord.requestedPunchIn,
          punchOut: reqRecord.requestedPunchOut,
        },
      });
    }

    return NextResponse.json({ success: true, updated });
  }

  if (type === "SALARY") {
    const status = action === "APPROVE" ? "APPROVED" : "REJECTED";
    const updated = await prisma.salaryPaymentRequest.update({
      where: { id, agencyId: session.agencyId },
      data: {
        status,
        reviewNote: note || null,
        reviewedById: session.userId,
      },
    });

    return NextResponse.json({ success: true, updated });
  }

  return NextResponse.json({ error: "Unknown type" }, { status: 400 });
}
