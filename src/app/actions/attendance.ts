"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ── Punch In ─────────────────────────────────────────────────────────────────
export async function punchIn(lat?: number, lng?: number) {
  const session = await getSession();
  if (!session || !session.agencyId) return { error: "Unauthorized" };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Upsert attendance record for today
  const existing = await prisma.attendance.findFirst({
    where: {
      agencyId: session.agencyId,
      employeeId: session.userId,
      date: today,
    },
  });

  if (existing?.punchIn) {
    return { error: "You have already punched in today" };
  }

  const now = new Date();
  const attendance = existing
    ? await prisma.attendance.update({
        where: { id: existing.id },
        data: { punchIn: now, status: "PRESENT", punchInLat: lat, punchInLng: lng },
      })
    : await prisma.attendance.create({
        data: {
          agencyId: session.agencyId,
          employeeId: session.userId,
          date: today,
          punchIn: now,
          status: "PRESENT",
          punchInLat: lat,
          punchInLng: lng,
        },
      });

  revalidatePath("/", "layout");
  return { attendance };
}

// ── Punch Out ────────────────────────────────────────────────────────────────
export async function punchOut(lat?: number, lng?: number) {
  const session = await getSession();
  if (!session || !session.agencyId) return { error: "Unauthorized" };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await prisma.attendance.findFirst({
    where: {
      agencyId: session.agencyId,
      employeeId: session.userId,
      date: today,
    },
  });

  if (!existing?.punchIn) return { error: "You have not punched in today" };
  if (existing.punchOut) return { error: "You have already punched out today" };

  const attendance = await prisma.attendance.update({
    where: { id: existing.id },
    data: { punchOut: new Date(), punchOutLat: lat, punchOutLng: lng },
  });

  revalidatePath("/", "layout");
  return { attendance };
}

// ── Get today's attendance for current user ──────────────────────────────────
export async function getMyTodayAttendance() {
  const session = await getSession();
  if (!session || !session.agencyId) return { attendance: null };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const attendance = await prisma.attendance.findFirst({
    where: {
      agencyId: session.agencyId,
      employeeId: session.userId,
      date: today,
    },
  });

  return { attendance };
}

// ── Get monthly history for current user ─────────────────────────────────────
export async function getMyAttendanceHistory(month: number, year: number) {
  const session = await getSession();
  if (!session || !session.agencyId) return { error: "Unauthorized", data: [] };

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  const records = await prisma.attendance.findMany({
    where: {
      agencyId: session.agencyId,
      employeeId: session.userId,
      date: { gte: start, lte: end },
    },
    orderBy: { date: "asc" },
  });

  return { data: records };
}

// ── Admin: Get attendance summary for a month ────────────────────────────────
export async function getAttendanceSummary(month: number, year: number) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    return { error: "Unauthorized", data: [] };
  }

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  const records = await prisma.attendance.findMany({
    where: { agencyId: session.agencyId, date: { gte: start, lte: end } },
    include: { employee: { select: { name: true, role: true } } },
    orderBy: [{ date: "asc" }, { employee: { name: "asc" } }],
  });

  return { data: records };
}

// ── Admin: Mark attendance manually ─────────────────────────────────────────
export async function markAttendance(data: {
  employeeId: string;
  date: string;
  status: string;
  notes?: string;
}) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    return { error: "Unauthorized" };
  }

  const date = new Date(data.date);
  date.setHours(0, 0, 0, 0);

  const attendance = await prisma.attendance.upsert({
    where: {
      agencyId_employeeId_date: {
        agencyId: session.agencyId,
        employeeId: data.employeeId,
        date,
      },
    },
    update: { status: data.status, notes: data.notes ?? null },
    create: {
      agencyId: session.agencyId,
      employeeId: data.employeeId,
      date,
      status: data.status,
      notes: data.notes ?? null,
    },
  });

  // Log in AuditLog
  await prisma.auditLog.create({
    data: {
      agencyId: session.agencyId,
      userId: session.userId,
      action: "MARK_ATTENDANCE",
      entityType: "Attendance",
      entityId: attendance.id,
      details: { employeeId: data.employeeId, date: data.date, status: data.status },
    },
  });

  revalidatePath("/admin/attendance");
  revalidatePath("/manager/attendance");
  return { attendance };
}

// ── Admin: Bulk Mark Attendance ──────────────────────────────────────────────
export async function bulkMarkAttendance(employeeIds: string[], dateStr: string, status: string) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    return { error: "Unauthorized" };
  }

  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);

  const agencyId = session.agencyId;

  const results = await prisma.$transaction(
    employeeIds.map((employeeId) =>
      prisma.attendance.upsert({
        where: {
          agencyId_employeeId_date: {
            agencyId,
            employeeId,
            date,
          },
        },
        update: { status },
        create: {
          agencyId,
          employeeId,
          date,
          status,
        },
      })
    )
  );

  // Add audit logs
  for (const employeeId of employeeIds) {
    await prisma.auditLog.create({
      data: {
        agencyId: session.agencyId,
        userId: session.userId,
        action: "BULK_MARK_ATTENDANCE",
        entityType: "Attendance",
        details: { employeeId, date: dateStr, status },
      },
    });
  }

  revalidatePath("/admin/attendance");
  return { success: true, count: results.length };
}

// ── Get all employees' attendance for today (admin view) ─────────────────────
export async function getTodayAttendanceSummary(dateStr?: string) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    return { error: "Unauthorized", data: [] };
  }

  const today = dateStr ? new Date(dateStr) : new Date();
  today.setHours(0, 0, 0, 0);

  const employees = await prisma.user.findMany({
    where: { agencyId: session.agencyId, isActive: true, role: { not: "SYSTEM_ADMIN" } },
    select: { id: true, name: true, role: true },
  });

  const records = await prisma.attendance.findMany({
    where: { agencyId: session.agencyId, date: today },
    select: {
      employeeId: true,
      status: true,
      punchIn: true,
      punchOut: true,
      punchInLat: true,
      punchInLng: true,
      punchOutLat: true,
      punchOutLng: true,
    },
  });

  const recordMap = new Map(records.map((r) => [r.employeeId, r]));

  const data = employees.map((emp) => {
    const record = recordMap.get(emp.id);
    return {
      ...emp,
      status: record?.status ?? "ABSENT",
      punchIn: record?.punchIn ?? null,
      punchOut: record?.punchOut ?? null,
      punchInLat: record?.punchInLat ?? null,
      punchInLng: record?.punchInLng ?? null,
      punchOutLat: record?.punchOutLat ?? null,
      punchOutLng: record?.punchOutLng ?? null,
    };
  });

  return { data };
}

// ── Regularization Actions ───────────────────────────────────────────────────
export async function submitRegularizationRequest(data: {
  date: string;
  reason: string;
  requestedPunchIn?: string;
  requestedPunchOut?: string;
}) {
  const session = await getSession();
  if (!session || !session.agencyId) return { error: "Unauthorized" };

  const reqDate = new Date(data.date);
  reqDate.setHours(0, 0, 0, 0);

  const request = await prisma.attendanceRegularization.create({
    data: {
      agencyId: session.agencyId,
      employeeId: session.userId,
      date: reqDate,
      reason: data.reason,
      requestedPunchIn: data.requestedPunchIn ? new Date(data.requestedPunchIn) : null,
      requestedPunchOut: data.requestedPunchOut ? new Date(data.requestedPunchOut) : null,
      status: "PENDING",
    },
  });

  // Create notifications for admins
  const admins = await prisma.user.findMany({
    where: { agencyId: session.agencyId, role: "ADMIN" },
    select: { id: true },
  });

  for (const admin of admins) {
    await prisma.notification.create({
      data: {
        agencyId: session.agencyId,
        userId: admin.id,
        type: "ATTENDANCE_REGULARIZATION",
        title: "New Regularization Request",
        body: `${session.name || "An employee"} requested regularization for ${data.date}.`,
        link: "/admin/attendance?tab=regularization",
      },
    });
  }

  return { request };
}

export async function getRegularizationRequests() {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    return { error: "Unauthorized", data: [] };
  }

  const requests = await prisma.attendanceRegularization.findMany({
    where: { agencyId: session.agencyId },
    include: {
      employee: { select: { name: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return { data: requests };
}

export async function reviewRegularizationRequest(
  id: string,
  status: "APPROVED" | "REJECTED",
  reviewNote?: string
) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    return { error: "Unauthorized" };
  }

  const request = await prisma.attendanceRegularization.findUnique({
    where: { id, agencyId: session.agencyId },
  });

  if (!request) return { error: "Request not found" };

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.attendanceRegularization.update({
      where: { id },
      data: {
        status,
        reviewNote,
        reviewedById: session.userId,
        reviewedAt: new Date(),
      },
    });

    if (status === "APPROVED") {
      await tx.attendance.upsert({
        where: {
          agencyId_employeeId_date: {
            agencyId: request.agencyId,
            employeeId: request.employeeId,
            date: request.date,
          },
        },
        update: {
          status: "PRESENT",
          punchIn: request.requestedPunchIn ?? undefined,
          punchOut: request.requestedPunchOut ?? undefined,
        },
        create: {
          agencyId: request.agencyId,
          employeeId: request.employeeId,
          date: request.date,
          status: "PRESENT",
          punchIn: request.requestedPunchIn,
          punchOut: request.requestedPunchOut,
        },
      });
    }

    // Notify employee
    await tx.notification.create({
      data: {
        agencyId: request.agencyId,
        userId: request.employeeId,
        type: "ATTENDANCE_REGULARIZATION_STATUS",
        title: `Regularization Request ${status}`,
        body: `Your attendance regularization request for ${request.date.toISOString().split("T")[0]} has been ${status.toLowerCase()}.`,
        link: "/staff/my-attendance",
      },
    });

    // Create Audit Log
    await tx.auditLog.create({
      data: {
        agencyId: request.agencyId,
        userId: session.userId,
        action: "REVIEW_REGULARIZATION",
        entityType: "AttendanceRegularization",
        entityId: id,
        details: { status, date: request.date, employeeId: request.employeeId },
      },
    });

    return updated;
  });

  revalidatePath("/admin/attendance");
  return { request: result };
}

// ── Shift Management Actions ─────────────────────────────────────────────────
export async function createShift(data: {
  name: string;
  startTime: string;
  endTime: string;
  gracePeriod?: number;
  isDefault?: boolean;
}) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    return { error: "Unauthorized" };
  }

  if (data.isDefault) {
    await prisma.workShift.updateMany({
      where: { agencyId: session.agencyId, isDefault: true },
      data: { isDefault: false },
    });
  }

  const shift = await prisma.workShift.upsert({
    where: {
      agencyId_name: {
        agencyId: session.agencyId,
        name: data.name,
      },
    },
    update: {
      startTime: data.startTime,
      endTime: data.endTime,
      gracePeriod: data.gracePeriod ?? 15,
      isDefault: data.isDefault ?? false,
    },
    create: {
      agencyId: session.agencyId,
      name: data.name,
      startTime: data.startTime,
      endTime: data.endTime,
      gracePeriod: data.gracePeriod ?? 15,
      isDefault: data.isDefault ?? false,
    },
  });

  revalidatePath("/admin/attendance");
  return { shift };
}

export async function getShifts() {
  const session = await getSession();
  if (!session || !session.agencyId) return { error: "Unauthorized", data: [] };

  const shifts = await prisma.workShift.findMany({
    where: { agencyId: session.agencyId },
    orderBy: { name: "asc" },
  });

  return { data: shifts };
}

export async function deleteShift(id: string) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    return { error: "Unauthorized" };
  }

  await prisma.workShift.delete({
    where: { id, agencyId: session.agencyId },
  });

  revalidatePath("/admin/attendance");
  return { success: true };
}

// ── Admin Dashboard & Stats Snapshots ────────────────────────────────────────
export async function getAdminDashboardAttendanceSnapshot() {
  const session = await getSession();
  if (!session || !session.agencyId) return { error: "Unauthorized" };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const employeesCount = await prisma.user.count({
    where: { agencyId: session.agencyId, isActive: true, role: { not: "SYSTEM_ADMIN" } },
  });

  const records = await prisma.attendance.findMany({
    where: { agencyId: session.agencyId, date: today },
  });

  const present = records.filter((r) => r.status === "PRESENT").length;
  const absent = records.filter((r) => r.status === "ABSENT").length;
  const halfDay = records.filter((r) => r.status === "HALF_DAY").length;
  const onLeave = records.filter((r) => r.status === "ON_LEAVE").length;

  const punchedEmpIds = new Set(records.map((r) => r.employeeId));
  const missingEmployees = await prisma.user.findMany({
    where: {
      agencyId: session.agencyId,
      isActive: true,
      role: { not: "SYSTEM_ADMIN" },
      id: { notIn: Array.from(punchedEmpIds) },
    },
    select: { name: true },
  });

  return {
    total: employeesCount,
    present,
    absent,
    halfDay,
    onLeave,
    missing: missingEmployees.map((e) => e.name),
  };
}

export async function getAttendanceStreaks(month: number, year: number) {
  const session = await getSession();
  if (!session || !session.agencyId) return { error: "Unauthorized", data: [] };

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  // Fetch all employee records for the month
  const records = await prisma.attendance.findMany({
    where: { agencyId: session.agencyId, date: { gte: start, lte: end } },
    orderBy: { date: "asc" },
  });

  // Simple streak calculator per employee
  const streaks: Record<string, { current: number; max: number; perfect: boolean }> = {};

  records.forEach((r) => {
    if (!streaks[r.employeeId]) {
      streaks[r.employeeId] = { current: 0, max: 0, perfect: true };
    }
    if (r.status === "PRESENT") {
      streaks[r.employeeId].current += 1;
      if (streaks[r.employeeId].current > streaks[r.employeeId].max) {
        streaks[r.employeeId].max = streaks[r.employeeId].current;
      }
    } else if (r.status === "ABSENT" || r.status === "HALF_DAY") {
      streaks[r.employeeId].current = 0;
      streaks[r.employeeId].perfect = false;
    }
  });

  return { data: streaks };
}

// ── Late Arrival & Early Departure Report Action ─────────────────────────────
export async function getLateEarlyReport(startDateStr: string, endDateStr: string, employeeIds?: string[]) {
  const session = await getSession();
  if (!session || !session.agencyId) return { error: "Unauthorized", data: [] };

  const start = new Date(startDateStr);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDateStr);
  end.setHours(23, 59, 59, 999);

  const defaultShift =
    (await prisma.workShift.findFirst({
      where: { agencyId: session.agencyId, isDefault: true },
    })) ||
    (await prisma.workShift.findFirst({
      where: { agencyId: session.agencyId },
    }));

  const records = await prisma.attendance.findMany({
    where: {
      agencyId: session.agencyId,
      date: { gte: start, lte: end },
      ...(employeeIds && employeeIds.length > 0 ? { employeeId: { in: employeeIds } } : {}),
      status: { in: ["PRESENT", "HALF_DAY"] },
    },
    include: {
      employee: { select: { name: true } },
    },
    orderBy: { date: "asc" },
  });

  if (!defaultShift) {
    return { data: [] }; // No shifts configured yet
  }

  const reportData = [];

  for (const record of records) {
    if (!record.punchIn) continue;

    const [startH, startM] = defaultShift.startTime.split(":").map(Number);
    const [endH, endM] = defaultShift.endTime.split(":").map(Number);

    const pin = new Date(record.punchIn);
    const pinMinutes = pin.getHours() * 60 + pin.getMinutes();
    const shiftStartMinutes = startH * 60 + startM;
    const grace = defaultShift.gracePeriod;

    let lateMinutes = 0;
    if (pinMinutes > shiftStartMinutes + grace) {
      lateMinutes = pinMinutes - shiftStartMinutes;
    }

    let earlyMinutes = 0;
    if (record.punchOut) {
      const pout = new Date(record.punchOut);
      const poutMinutes = pout.getHours() * 60 + pout.getMinutes();
      const shiftEndMinutes = endH * 60 + endM;
      if (poutMinutes < shiftEndMinutes) {
        earlyMinutes = shiftEndMinutes - poutMinutes;
      }
    }

    if (lateMinutes > 0 || earlyMinutes > 0) {
      reportData.push({
        id: record.id,
        employeeName: record.employee.name,
        date: record.date.toISOString().split("T")[0],
        shiftStart: defaultShift.startTime,
        shiftEnd: defaultShift.endTime,
        punchIn: pin.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        punchOut: record.punchOut
          ? new Date(record.punchOut).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
          : "—",
        lateMinutes,
        earlyMinutes,
      });
    }
  }

  return { data: reportData };
}

// ── Overtime Report Action ───────────────────────────────────────────────────
export async function getOvertimeReport(month: number, year: number) {
  const session = await getSession();
  if (!session || !session.agencyId) return { error: "Unauthorized", data: [] };

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  const defaultShift =
    (await prisma.workShift.findFirst({
      where: { agencyId: session.agencyId, isDefault: true },
    })) ||
    (await prisma.workShift.findFirst({
      where: { agencyId: session.agencyId },
    }));

  if (!defaultShift) return { data: [] };

  const records = await prisma.attendance.findMany({
    where: {
      agencyId: session.agencyId,
      date: { gte: start, lte: end },
      status: "PRESENT",
      punchIn: { not: null },
      punchOut: { not: null },
    },
    include: {
      employee: { select: { name: true } },
    },
    orderBy: { date: "asc" },
  });

  const [endH, endM] = defaultShift.endTime.split(":").map(Number);
  const shiftEndMinutes = endH * 60 + endM;

  const reportData = [];

  for (const record of records) {
    if (!record.punchIn || !record.punchOut) continue;

    const pin = new Date(record.punchIn);
    const pout = new Date(record.punchOut);

    const workedHours = (pout.getTime() - pin.getTime()) / (1000 * 60 * 60);

    const poutMinutes = pout.getHours() * 60 + pout.getMinutes();
    let overtimeMinutes = 0;

    if (poutMinutes > shiftEndMinutes + 30) {
      overtimeMinutes = poutMinutes - shiftEndMinutes;
    }

    if (overtimeMinutes > 0) {
      reportData.push({
        id: record.id,
        employeeName: record.employee.name,
        date: record.date.toISOString().split("T")[0],
        regularHours: Math.min(workedHours, 8).toFixed(2),
        overtimeMinutes,
        overtimeHours: (overtimeMinutes / 60).toFixed(2),
        totalHours: workedHours.toFixed(2),
      });
    }
  }

  return { data: reportData };
}
