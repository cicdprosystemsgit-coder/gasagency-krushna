import { NextRequest, NextResponse } from "next/server";
import { getSession, verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyLeaveReviewed, notifyUserWithRoleLink } from "@/app/actions/notifications";

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
      include: {
        employee: { select: { id: true, role: true } },
      },
    });

    await notifyLeaveReviewed({
      agencyId: session.agencyId,
      employeeId: updated.employee.id,
      employeeRole: updated.employee.role,
      action: status,
      startDate: updated.startDate,
      totalDays: updated.totalDays,
      reviewNote: note,
      reviewerName: session.name,
    });

    return NextResponse.json({ success: true, updated });
  }

  if (type === "REGULARIZATION") {
    const status = action === "APPROVE" ? "APPROVED" : "REJECTED";
    const reqRecord = await prisma.attendanceRegularization.findUnique({
      where: { id, agencyId: session.agencyId },
      include: { employee: { select: { role: true } } },
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

    await notifyUserWithRoleLink({
      agencyId: session.agencyId,
      userId: reqRecord.employeeId,
      userRole: reqRecord.employee.role,
      type: "ATTENDANCE_REGULARIZATION_STATUS",
      title: `Regularization Request ${status}`,
      body: `Your attendance regularization request for ${reqRecord.date.toISOString().split("T")[0]} has been ${status.toLowerCase()}.${note ? ` Note: ${note}` : ""}`,
      subPath: "/my-attendance",
    });

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
      include: {
        employee: { select: { id: true, role: true } },
      },
    });

    const isApproved = status === "APPROVED";
    await notifyUserWithRoleLink({
      agencyId: session.agencyId,
      userId: updated.employee.id,
      userRole: updated.employee.role,
      type: isApproved ? "SALARY_APPROVED" : "SALARY_REJECTED",
      title: isApproved ? "Salary Request Approved" : "Salary Request Rejected",
      body: `Your ${updated.type.toLowerCase()} request of ₹${updated.amount} was ${status.toLowerCase()}.${note ? ` Note: ${note}` : ""}`,
      subPath: "/my-salary",
    });

    return NextResponse.json({ success: true, updated });
  }

  return NextResponse.json({ error: "Unknown type" }, { status: 400 });
}
