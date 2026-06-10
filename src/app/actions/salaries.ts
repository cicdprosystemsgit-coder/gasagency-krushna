"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// ─── Employee Salary Profile ──────────────────────────────────────────────────

export async function setSalaryProfile(formData: FormData) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId)
    return { error: "Unauthorized" };

  const employeeId = formData.get("employeeId") as string;
  const monthlySalary = Number(formData.get("monthlySalary"));
  const effectiveFrom = formData.get("effectiveFrom") as string;

  if (!employeeId) return { error: "Employee required" };
  if (!monthlySalary || monthlySalary <= 0) return { error: "Valid salary amount required" };
  if (!effectiveFrom) return { error: "Effective from date required" };

  // Verify employee belongs to same agency
  const employee = await prisma.user.findFirst({
    where: { id: employeeId, agencyId: session.agencyId },
    select: { id: true, name: true, role: true },
  });
  if (!employee) return { error: "Employee not found" };

  const profile = await prisma.employeeSalaryProfile.upsert({
    where: { employeeId },
    create: {
      employeeId,
      monthlySalary,
      effectiveFrom: new Date(effectiveFrom),
      notes: (formData.get("notes") as string) || null,
      agencyId: session.agencyId,
    },
    update: {
      monthlySalary,
      effectiveFrom: new Date(effectiveFrom),
      notes: (formData.get("notes") as string) || null,
    },
    include: { employee: { select: { name: true, role: true } } },
  });
  return { profile };
}

export async function getSalaryProfiles() {
  const session = await getSession();
  if (!session || !session.agencyId) return { error: "Unauthorized" };

  const profiles = await prisma.employeeSalaryProfile.findMany({
    where: { agencyId: session.agencyId },
    include: { employee: { select: { id: true, name: true, role: true, isActive: true } } },
    orderBy: { employee: { name: "asc" } },
  });
  return { profiles };
}

// ─── Salary / Drawing Payments ────────────────────────────────────────────────

export async function createSalaryDrawing(formData: FormData) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId)
    return { error: "Unauthorized" };

  const employeeId = formData.get("employeeId") as string;
  const amount = Number(formData.get("amount"));
  const type = (formData.get("type") as string) || "SALARY";
  const advanceRecoveryAmount = Number(formData.get("advanceRecoveryAmount") || 0);

  if (!employeeId) return { error: "Employee required" };
  if (!amount || amount <= 0) return { error: "Valid amount required" };

  const month = Number(formData.get("month"));
  const year = Number(formData.get("year"));

  // If this salary payment includes advance recovery, update advance balances
  if (type === "SALARY" && advanceRecoveryAmount > 0) {
    const pendingAdvances = await prisma.salaryAdvance.findMany({
      where: {
        employeeId,
        agencyId: session.agencyId,
        status: { in: ["PENDING", "PARTIAL"] },
      },
      orderBy: { advanceDate: "asc" },
    });

    let remaining = advanceRecoveryAmount;
    for (const adv of pendingAdvances) {
      if (remaining <= 0) break;
      const canRecover = Math.min(remaining, adv.balanceAmount);
      const newRecovered = adv.recoveredAmount + canRecover;
      const newBalance = adv.balanceAmount - canRecover;
      await prisma.salaryAdvance.update({
        where: { id: adv.id },
        data: {
          recoveredAmount: newRecovered,
          balanceAmount: newBalance,
          status: newBalance <= 0 ? "RECOVERED" : "PARTIAL",
        },
      });
      remaining -= canRecover;
    }
  }

  const drawing = await prisma.salaryDrawing.create({
    data: {
      employeeId,
      type,
      amount,
      month,
      year,
      remarks: (formData.get("remarks") as string) || null,
      date: new Date(),
      agencyId: session.agencyId,
    },
    include: { employee: { select: { name: true, role: true } } },
  });
  return { drawing };
}

export async function getSalaryDrawings(filters?: { employeeId?: string; month?: number; year?: number }) {
  const session = await getSession();
  if (!session || !session.agencyId) return { error: "Unauthorized" };

  const where: Record<string, unknown> = { agencyId: session.agencyId };
  if (filters?.employeeId) where.employeeId = filters.employeeId;
  if (filters?.month) where.month = filters.month;
  if (filters?.year) where.year = filters.year;

  const drawings = await prisma.salaryDrawing.findMany({
    where,
    orderBy: { date: "desc" },
    include: { employee: { select: { name: true, role: true } } },
  });
  return { drawings };
}

export async function deleteSalaryDrawing(id: string) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId)
    return { success: false };
  await prisma.salaryDrawing.delete({ where: { id, agencyId: session.agencyId } });
  return { success: true };
}

// ─── Advance / Udhari Management ─────────────────────────────────────────────

export async function createAdvance(formData: FormData) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId)
    return { error: "Unauthorized" };

  const employeeId = formData.get("employeeId") as string;
  const amount = Number(formData.get("amount"));
  const advanceDate = formData.get("advanceDate") as string;

  if (!employeeId) return { error: "Employee required" };
  if (!amount || amount <= 0) return { error: "Valid advance amount required" };
  if (!advanceDate) return { error: "Advance date required" };

  const advance = await prisma.salaryAdvance.create({
    data: {
      employeeId,
      amount,
      recoveredAmount: 0,
      balanceAmount: amount,
      advanceDate: new Date(advanceDate),
      reason: (formData.get("reason") as string) || null,
      notes: (formData.get("notes") as string) || null,
      status: "PENDING",
      agencyId: session.agencyId,
    },
    include: { employee: { select: { name: true, role: true } } },
  });

  // Also record this as a salary drawing entry of type ADVANCE
  await prisma.salaryDrawing.create({
    data: {
      employeeId,
      type: "ADVANCE",
      amount,
      month: new Date(advanceDate).getMonth() + 1,
      year: new Date(advanceDate).getFullYear(),
      remarks: `Advance: ${(formData.get("reason") as string) || ""}`,
      date: new Date(advanceDate),
      agencyId: session.agencyId,
    },
  });

  return { advance };
}

export async function getAdvances(employeeId?: string) {
  const session = await getSession();
  if (!session || !session.agencyId) return { error: "Unauthorized" };

  const where: Record<string, unknown> = { agencyId: session.agencyId };
  if (employeeId) where.employeeId = employeeId;

  const advances = await prisma.salaryAdvance.findMany({
    where,
    orderBy: { advanceDate: "desc" },
    include: { employee: { select: { name: true, role: true } } },
  });
  return { advances };
}

export async function recoverAdvance(formData: FormData) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId)
    return { error: "Unauthorized" };

  const advanceId = formData.get("advanceId") as string;
  const recoveryAmount = Number(formData.get("recoveryAmount"));

  if (!advanceId) return { error: "Advance ID required" };
  if (!recoveryAmount || recoveryAmount <= 0) return { error: "Valid recovery amount required" };

  const advance = await prisma.salaryAdvance.findFirst({
    where: { id: advanceId, agencyId: session.agencyId },
  });
  if (!advance) return { error: "Advance not found" };
  if (advance.status === "RECOVERED") return { error: "Advance already fully recovered" };
  if (recoveryAmount > advance.balanceAmount)
    return { error: `Recovery cannot exceed balance of ₹${advance.balanceAmount.toFixed(2)}` };

  const newRecovered = advance.recoveredAmount + recoveryAmount;
  const newBalance = advance.balanceAmount - recoveryAmount;
  const newStatus = newBalance <= 0 ? "RECOVERED" : "PARTIAL";

  const updated = await prisma.salaryAdvance.update({
    where: { id: advanceId },
    data: { recoveredAmount: newRecovered, balanceAmount: newBalance, status: newStatus },
    include: { employee: { select: { name: true, role: true } } },
  });

  // Record recovery as a salary drawing entry
  await prisma.salaryDrawing.create({
    data: {
      employeeId: advance.employeeId,
      type: "ADVANCE_RECOVERY",
      amount: recoveryAmount,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      remarks: `Advance recovery (Advance ID: ${advanceId.slice(-6)})`,
      date: new Date(),
      agencyId: session.agencyId,
    },
  });

  return { advance: updated };
}

export async function deleteAdvance(id: string) {
  const session = await getSession();
  if (!session || !["ADMIN"].includes(session.role) || !session.agencyId)
    return { success: false, error: "Only admin can delete advances" };

  const advance = await prisma.salaryAdvance.findFirst({
    where: { id, agencyId: session.agencyId },
  });
  if (!advance) return { success: false, error: "Not found" };
  if (advance.recoveredAmount > 0)
    return { success: false, error: "Cannot delete a partially or fully recovered advance" };

  await prisma.salaryAdvance.delete({ where: { id } });
  // Also remove the corresponding salary drawing entry
  await prisma.salaryDrawing.deleteMany({
    where: {
      employeeId: advance.employeeId,
      type: "ADVANCE",
      agencyId: session.agencyId,
      remarks: { contains: "Advance:" },
    },
  });
  return { success: true };
}

// ─── Bonus Management ─────────────────────────────────────────────────────────

export async function createBonus(formData: FormData) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId)
    return { error: "Unauthorized" };

  const employeeId = formData.get("employeeId") as string;
  const amount = Number(formData.get("amount"));
  const bonusDate = formData.get("bonusDate") as string;
  const month = Number(formData.get("month"));
  const year = Number(formData.get("year"));

  if (!employeeId) return { error: "Employee required" };
  if (!amount || amount <= 0) return { error: "Valid bonus amount required" };
  if (!bonusDate) return { error: "Bonus date required" };

  const bonus = await prisma.salaryBonus.create({
    data: {
      employeeId,
      amount,
      bonusDate: new Date(bonusDate),
      month,
      year,
      reason: (formData.get("reason") as string) || null,
      remarks: (formData.get("remarks") as string) || null,
      agencyId: session.agencyId,
    },
    include: { employee: { select: { name: true, role: true } } },
  });

  // Also record in salary drawing ledger
  await prisma.salaryDrawing.create({
    data: {
      employeeId,
      type: "BONUS",
      amount,
      month,
      year,
      remarks: `Bonus: ${(formData.get("reason") as string) || ""}`,
      date: new Date(bonusDate),
      agencyId: session.agencyId,
    },
  });

  return { bonus };
}

export async function getBonuses(employeeId?: string) {
  const session = await getSession();
  if (!session || !session.agencyId) return { error: "Unauthorized" };

  const where: Record<string, unknown> = { agencyId: session.agencyId };
  if (employeeId) where.employeeId = employeeId;

  const bonuses = await prisma.salaryBonus.findMany({
    where,
    orderBy: { bonusDate: "desc" },
    include: { employee: { select: { name: true, role: true } } },
  });
  return { bonuses };
}

export async function deleteBonus(id: string) {
  const session = await getSession();
  if (!session || !["ADMIN"].includes(session.role) || !session.agencyId)
    return { success: false };
  await prisma.salaryBonus.delete({ where: { id, agencyId: session.agencyId } });
  return { success: true };
}

// ─── Payroll Summary ──────────────────────────────────────────────────────────

export async function getPayrollSummary(month: number, year: number) {
  const session = await getSession();
  if (!session || !session.agencyId) return { error: "Unauthorized" };

  const [drawings, profiles, advances, bonuses, staff] = await Promise.all([
    prisma.salaryDrawing.findMany({
      where: { agencyId: session.agencyId, month, year },
      include: { employee: { select: { id: true, name: true, role: true } } },
    }),
    prisma.employeeSalaryProfile.findMany({
      where: { agencyId: session.agencyId },
      include: { employee: { select: { id: true, name: true, role: true, isActive: true } } },
    }),
    prisma.salaryAdvance.findMany({
      where: { agencyId: session.agencyId, status: { in: ["PENDING", "PARTIAL"] } },
      include: { employee: { select: { id: true, name: true } } },
    }),
    prisma.salaryBonus.findMany({
      where: { agencyId: session.agencyId, month, year },
      include: { employee: { select: { id: true, name: true, role: true } } },
    }),
    prisma.user.findMany({
      where: { agencyId: session.agencyId, isActive: true, role: { not: "ADMIN" } },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return { drawings, profiles, advances, bonuses, staff };
}
