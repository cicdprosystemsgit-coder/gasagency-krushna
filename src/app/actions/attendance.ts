"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ── Punch In ─────────────────────────────────────────────────────────────────
export async function punchIn() {
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
        data: { punchIn: now, status: "PRESENT" },
      })
    : await prisma.attendance.create({
        data: {
          agencyId: session.agencyId,
          employeeId: session.userId,
          date: today,
          punchIn: now,
          status: "PRESENT",
        },
      });

  revalidatePath("/", "layout");
  return { attendance };
}

// ── Punch Out ────────────────────────────────────────────────────────────────
export async function punchOut() {
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
    data: { punchOut: new Date() },
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

  revalidatePath("/admin/attendance");
  revalidatePath("/manager/attendance");
  return { attendance };
}

// ── Get all employees' attendance for today (admin view) ─────────────────────
export async function getTodayAttendanceSummary() {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    return { error: "Unauthorized", data: [] };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const employees = await prisma.user.findMany({
    where: { agencyId: session.agencyId, isActive: true, role: { not: "SYSTEM_ADMIN" } },
    select: { id: true, name: true, role: true },
  });

  const records = await prisma.attendance.findMany({
    where: { agencyId: session.agencyId, date: today },
    select: { employeeId: true, status: true, punchIn: true, punchOut: true },
  });

  const recordMap = new Map(records.map((r) => [r.employeeId, r]));

  const data = employees.map((emp) => {
    const record = recordMap.get(emp.id);
    return {
      ...emp,
      status: record?.status ?? "ABSENT",
      punchIn: record?.punchIn ?? null,
      punchOut: record?.punchOut ?? null,
    };
  });

  return { data };
}
