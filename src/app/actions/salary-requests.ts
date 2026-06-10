"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// ─── Manager: Create a payment request (awaits admin approval) ────────────────

export async function createSalaryRequest(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "MANAGER" || !session.agencyId)
    return { error: "Only managers can submit payment requests" };

  const type = formData.get("type") as string;
  const employeeId = formData.get("employeeId") as string;
  const amount = Number(formData.get("amount"));

  if (!type) return { error: "Request type required" };
  if (!employeeId) return { error: "Employee required" };
  if (!amount || amount <= 0) return { error: "Valid amount required" };

  // Verify employee belongs to same agency
  const employee = await prisma.user.findFirst({
    where: { id: employeeId, agencyId: session.agencyId },
    select: { id: true, name: true },
  });
  if (!employee) return { error: "Employee not found" };

  // Collect all form fields into requestData JSON
  const requestData: Record<string, unknown> = {};
  formData.forEach((value, key) => {
    if (key !== "type" && key !== "employeeId" && key !== "amount") {
      requestData[key] = value;
    }
  });

  const month = formData.get("month") ? Number(formData.get("month")) : null;
  const year = formData.get("year") ? Number(formData.get("year")) : null;

  const request = await prisma.salaryPaymentRequest.create({
    data: {
      type,
      employeeId,
      amount,
      month,
      year,
      requestData: requestData as Record<string, string>,
      remarks: (formData.get("remarks") as string) || null,
      status: "PENDING",
      requestedById: session.userId,
      agencyId: session.agencyId,
    },
    include: {
      employee: { select: { name: true, role: true } },
      requestedBy: { select: { name: true } },
    },
  });

  return { request };
}

// ─── Admin: Approve a request → creates actual records ────────────────────────

export async function approveSalaryRequest(requestId: string) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId)
    return { error: "Only admin can approve requests" };

  const req = await prisma.salaryPaymentRequest.findFirst({
    where: { id: requestId, agencyId: session.agencyId, status: "PENDING" },
  });
  if (!req) return { error: "Request not found or already processed" };

  const data = req.requestData as Record<string, unknown>;

  // Create the actual salary records based on request type
  if (req.type === "SALARY" || req.type === "DRAWING") {
    const advanceRecovery = Number(data.advanceRecoveryAmount ?? 0);

    // Apply advance recovery if any
    if (advanceRecovery > 0) {
      const pendingAdvances = await prisma.salaryAdvance.findMany({
        where: {
          employeeId: req.employeeId,
          agencyId: session.agencyId,
          status: { in: ["PENDING", "PARTIAL"] },
        },
        orderBy: { advanceDate: "asc" },
      });
      let remaining = advanceRecovery;
      for (const adv of pendingAdvances) {
        if (remaining <= 0) break;
        const canRecover = Math.min(remaining, adv.balanceAmount);
        await prisma.salaryAdvance.update({
          where: { id: adv.id },
          data: {
            recoveredAmount: adv.recoveredAmount + canRecover,
            balanceAmount: adv.balanceAmount - canRecover,
            status: adv.balanceAmount - canRecover <= 0 ? "RECOVERED" : "PARTIAL",
          },
        });
        remaining -= canRecover;
      }

      // Record advance recovery entry
      if (advanceRecovery > 0) {
        await prisma.salaryDrawing.create({
          data: {
            employeeId: req.employeeId,
            type: "ADVANCE_RECOVERY",
            amount: advanceRecovery,
            month: req.month ?? new Date().getMonth() + 1,
            year: req.year ?? new Date().getFullYear(),
            remarks: "Advance recovery on salary approval",
            date: new Date(),
            agencyId: session.agencyId,
          },
        });
      }
    }

    await prisma.salaryDrawing.create({
      data: {
        employeeId: req.employeeId,
        type: req.type,
        amount: req.amount,
        month: req.month ?? new Date().getMonth() + 1,
        year: req.year ?? new Date().getFullYear(),
        remarks: (data.remarks as string) || null,
        date: new Date(),
        agencyId: session.agencyId,
      },
    });

  } else if (req.type === "ADVANCE") {
    const advanceDate = new Date((data.advanceDate as string) || new Date());
    await prisma.salaryAdvance.create({
      data: {
        employeeId: req.employeeId,
        amount: req.amount,
        recoveredAmount: 0,
        balanceAmount: req.amount,
        advanceDate,
        reason: (data.reason as string) || null,
        notes: (data.notes as string) || null,
        status: "PENDING",
        agencyId: session.agencyId,
      },
    });
    await prisma.salaryDrawing.create({
      data: {
        employeeId: req.employeeId,
        type: "ADVANCE",
        amount: req.amount,
        month: advanceDate.getMonth() + 1,
        year: advanceDate.getFullYear(),
        remarks: `Advance: ${(data.reason as string) ?? ""}`,
        date: advanceDate,
        agencyId: session.agencyId,
      },
    });

  } else if (req.type === "BONUS") {
    const bonusDate = new Date((data.bonusDate as string) || new Date());
    await prisma.salaryBonus.create({
      data: {
        employeeId: req.employeeId,
        amount: req.amount,
        bonusDate,
        month: req.month ?? bonusDate.getMonth() + 1,
        year: req.year ?? bonusDate.getFullYear(),
        reason: (data.reason as string) || null,
        remarks: (data.remarks as string) || null,
        agencyId: session.agencyId,
      },
    });
    await prisma.salaryDrawing.create({
      data: {
        employeeId: req.employeeId,
        type: "BONUS",
        amount: req.amount,
        month: req.month ?? bonusDate.getMonth() + 1,
        year: req.year ?? bonusDate.getFullYear(),
        remarks: `Bonus: ${(data.reason as string) ?? ""}`,
        date: bonusDate,
        agencyId: session.agencyId,
      },
    });

  } else if (req.type === "ADVANCE_RECOVERY") {
    const advanceId = data.advanceId as string;
    const recoveryAmount = req.amount;
    const advance = await prisma.salaryAdvance.findFirst({
      where: { id: advanceId, agencyId: session.agencyId },
    });
    if (advance && recoveryAmount <= advance.balanceAmount) {
      const newBalance = advance.balanceAmount - recoveryAmount;
      await prisma.salaryAdvance.update({
        where: { id: advanceId },
        data: {
          recoveredAmount: advance.recoveredAmount + recoveryAmount,
          balanceAmount: newBalance,
          status: newBalance <= 0 ? "RECOVERED" : "PARTIAL",
        },
      });
      await prisma.salaryDrawing.create({
        data: {
          employeeId: req.employeeId,
          type: "ADVANCE_RECOVERY",
          amount: recoveryAmount,
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
          remarks: `Advance recovery (approved)`,
          date: new Date(),
          agencyId: session.agencyId,
        },
      });
    }
  }

  // Mark request approved
  const updated = await prisma.salaryPaymentRequest.update({
    where: { id: requestId },
    data: { status: "APPROVED", reviewedById: session.userId },
    include: {
      employee: { select: { name: true, role: true } },
      requestedBy: { select: { name: true } },
      reviewedBy: { select: { name: true } },
    },
  });

  return { request: updated };
}

// ─── Admin: Reject a request ──────────────────────────────────────────────────

export async function rejectSalaryRequest(requestId: string, reviewNote: string) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId)
    return { error: "Only admin can reject requests" };

  const req = await prisma.salaryPaymentRequest.findFirst({
    where: { id: requestId, agencyId: session.agencyId, status: "PENDING" },
  });
  if (!req) return { error: "Request not found or already processed" };

  const updated = await prisma.salaryPaymentRequest.update({
    where: { id: requestId },
    data: { status: "REJECTED", reviewedById: session.userId, reviewNote },
    include: {
      employee: { select: { name: true, role: true } },
      requestedBy: { select: { name: true } },
      reviewedBy: { select: { name: true } },
    },
  });

  return { request: updated };
}

// ─── Get salary requests ──────────────────────────────────────────────────────

export async function getSalaryRequests() {
  const session = await getSession();
  if (!session || !session.agencyId) return { error: "Unauthorized" };

  const where: Record<string, unknown> = { agencyId: session.agencyId };
  // Manager sees only their own requests; admin sees all
  if (session.role === "MANAGER") where.requestedById = session.userId;

  const requests = await prisma.salaryPaymentRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      employee: { select: { name: true, role: true } },
      requestedBy: { select: { name: true } },
      reviewedBy: { select: { name: true } },
    },
  });

  return { requests };
}
