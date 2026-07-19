"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// ─── Create a payment request ────────────────

export async function createSalaryRequest(formData: FormData) {
  const session = await getSession();
  if (!session || !session.agencyId)
    return { error: "Unauthorized" };

  const type = formData.get("type") as string;
  const employeeId = formData.get("employeeId") as string;
  const amount = Number(formData.get("amount"));

  if (!type) return { error: "Request type required" };
  if (!employeeId) return { error: "Employee required" };
  if (!amount || amount <= 0) return { error: "Valid amount required" };

  // RBAC checks
  const isManagerOrAdmin = ["MANAGER", "ADMIN"].includes(session.role);
  if (!isManagerOrAdmin) {
    // Regular employees can only request for themselves
    if (employeeId !== session.userId) {
      return { error: "You can only submit requests for yourself" };
    }
    // Regular employees can only request ADVANCE or BONUS
    if (type !== "ADVANCE" && type !== "BONUS") {
      return { error: "You can only request Advance or Bonus" };
    }
  }

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

  // Create notifications for managers / admin
  try {
    if (!isManagerOrAdmin) {
      // Notify managers
      const managers = await prisma.user.findMany({
        where: { agencyId: session.agencyId, role: "MANAGER", isActive: true },
        select: { id: true },
      });
      for (const mgr of managers) {
        await prisma.notification.create({
          data: {
            agencyId: session.agencyId,
            userId: mgr.id,
            type: "SALARY_REQUEST",
            title: "New Salary Request",
            body: `${employee.name} requested a ${type.toLowerCase()} of ₹${amount}`,
            link: "/manager/approvals",
          },
        });
      }
    } else {
      // Manager/Admin requested for someone, notify admin
      const admins = await prisma.user.findMany({
        where: { agencyId: session.agencyId, role: "ADMIN", isActive: true },
        select: { id: true },
      });
      for (const adm of admins) {
        await prisma.notification.create({
          data: {
            agencyId: session.agencyId,
            userId: adm.id,
            type: "SALARY_REQUEST",
            title: "New Salary Request",
            body: `${session.name} requested a ${type.toLowerCase()} of ₹${amount} for ${employee.name}`,
            link: "/admin/approvals",
          },
        });
      }
    }
  } catch (err) {
    console.error("Failed to create notification:", err);
  }

  return { request };
}

// ─── Manager: Approve a request (moves to MANAGER_APPROVED) ──────────────────

export async function managerApproveSalaryRequest(requestId: string, reviewNote?: string) {
  const session = await getSession();
  if (!session || session.role !== "MANAGER" || !session.agencyId)
    return { error: "Only managers can approve requests" };

  const req = await prisma.salaryPaymentRequest.findFirst({
    where: { id: requestId, agencyId: session.agencyId, status: "PENDING" },
    include: { employee: true },
  });
  if (!req) return { error: "Request not found or already processed" };

  const updated = await prisma.salaryPaymentRequest.update({
    where: { id: requestId },
    data: {
      status: "MANAGER_APPROVED",
      managerReviewedById: session.userId,
      managerReviewNote: reviewNote || null,
      managerReviewedAt: new Date(),
    },
    include: {
      employee: { select: { name: true, role: true } },
      requestedBy: { select: { name: true } },
      reviewedBy: { select: { name: true } },
      managerReviewedBy: { select: { name: true } },
    },
  });

  // Notify admins
  try {
    const admins = await prisma.user.findMany({
      where: { agencyId: session.agencyId, role: "ADMIN", isActive: true },
      select: { id: true },
    });
    for (const adm of admins) {
      await prisma.notification.create({
        data: {
          agencyId: session.agencyId,
          userId: adm.id,
          type: "SALARY_REQUEST",
          title: "Request Approved by Manager",
          body: `Manager ${session.name} approved ${updated.employee.name}'s request for ${updated.type.toLowerCase()} of ₹${updated.amount}`,
          link: "/admin/approvals",
        },
      });
    }
    // Notify employee
    await prisma.notification.create({
      data: {
        agencyId: session.agencyId,
        userId: req.employeeId,
        type: "SALARY_REQUEST",
        title: "Salary Request Update",
        body: `Your request for ${updated.type.toLowerCase()} of ₹${updated.amount} was approved by Manager and sent to Admin.`,
        link: "/my-salary",
      },
    });
  } catch (err) {
    console.error("Failed to notify:", err);
  }

  return { request: updated };
}

// ─── Manager: Reject a request ────────────────────────────────────────────────

export async function managerRejectSalaryRequest(requestId: string, reviewNote: string) {
  const session = await getSession();
  if (!session || session.role !== "MANAGER" || !session.agencyId)
    return { error: "Only managers can reject requests" };

  const req = await prisma.salaryPaymentRequest.findFirst({
    where: { id: requestId, agencyId: session.agencyId, status: "PENDING" },
  });
  if (!req) return { error: "Request not found or already processed" };

  const updated = await prisma.salaryPaymentRequest.update({
    where: { id: requestId },
    data: {
      status: "REJECTED",
      managerReviewedById: session.userId,
      managerReviewNote: reviewNote,
      managerReviewedAt: new Date(),
    },
    include: {
      employee: { select: { name: true, role: true } },
      requestedBy: { select: { name: true } },
      reviewedBy: { select: { name: true } },
      managerReviewedBy: { select: { name: true } },
    },
  });

  // Notify employee
  try {
    await prisma.notification.create({
      data: {
        agencyId: session.agencyId,
        userId: req.employeeId,
        type: "SALARY_REQUEST",
        title: "Salary Request Rejected",
        body: `Your request for ${updated.type.toLowerCase()} of ₹${updated.amount} was rejected by Manager. Reason: ${reviewNote}`,
        link: "/my-salary",
      },
    });
  } catch (err) {
    console.error("Failed to notify:", err);
  }

  return { request: updated };
}

// ─── Admin: Approve a request → creates actual records ────────────────────────

export async function approveSalaryRequest(requestId: string) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId)
    return { error: "Only admin can approve requests" };

  const req = await prisma.salaryPaymentRequest.findFirst({
    where: {
      id: requestId,
      agencyId: session.agencyId,
      status: { in: ["PENDING", "MANAGER_APPROVED"] },
    },
    include: { requestedBy: { select: { role: true } } },
  });
  if (!req) return { error: "Request not found or already processed" };

  // If request is still PENDING and was requested by a non-manager/non-admin, require manager approval first
  if (req.status === "PENDING" && !["MANAGER", "ADMIN"].includes(req.requestedBy.role)) {
    return { error: "This request must be approved by a Manager first" };
  }

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
      managerReviewedBy: { select: { name: true } },
    },
  });

  // Notify employee & manager
  try {
    await prisma.notification.create({
      data: {
        agencyId: session.agencyId,
        userId: req.employeeId,
        type: "SALARY_REQUEST",
        title: "Salary Request Approved",
        body: `Your request for ${req.type.toLowerCase()} of ₹${req.amount} has been approved and processed.`,
        link: "/my-salary",
      },
    });
    if (req.managerReviewedById) {
      await prisma.notification.create({
        data: {
          agencyId: session.agencyId,
          userId: req.managerReviewedById,
          type: "SALARY_REQUEST",
          title: "Salary Request Approved",
          body: `${updated.employee.name}'s request for ${updated.type.toLowerCase()} of ₹${updated.amount} has been approved and processed.`,
          link: "/manager/approvals",
        },
      });
    }
  } catch (err) {
    console.error("Failed to notify:", err);
  }

  return { request: updated };
}

// ─── Admin: Reject a request ──────────────────────────────────────────────────

export async function rejectSalaryRequest(requestId: string, reviewNote: string) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId)
    return { error: "Only admin can reject requests" };

  const req = await prisma.salaryPaymentRequest.findFirst({
    where: {
      id: requestId,
      agencyId: session.agencyId,
      status: { in: ["PENDING", "MANAGER_APPROVED"] },
    },
  });
  if (!req) return { error: "Request not found or already processed" };

  const updated = await prisma.salaryPaymentRequest.update({
    where: { id: requestId },
    data: { status: "REJECTED", reviewedById: session.userId, reviewNote },
    include: {
      employee: { select: { name: true, role: true } },
      requestedBy: { select: { name: true } },
      reviewedBy: { select: { name: true } },
      managerReviewedBy: { select: { name: true } },
    },
  });

  // Notify employee & manager
  try {
    await prisma.notification.create({
      data: {
        agencyId: session.agencyId,
        userId: req.employeeId,
        type: "SALARY_REQUEST",
        title: "Salary Request Rejected",
        body: `Your request for ${updated.type.toLowerCase()} of ₹${updated.amount} was rejected by Admin. Reason: ${reviewNote}`,
        link: "/my-salary",
      },
    });
    if (req.managerReviewedById) {
      await prisma.notification.create({
        data: {
          agencyId: session.agencyId,
          userId: req.managerReviewedById,
          type: "SALARY_REQUEST",
          title: "Salary Request Rejected",
          body: `${updated.employee.name}'s request for ${updated.type.toLowerCase()} of ₹${updated.amount} was rejected by Admin. Reason: ${reviewNote}`,
          link: "/manager/approvals",
        },
      });
    }
  } catch (err) {
    console.error("Failed to notify:", err);
  }

  return { request: updated };
}

// ─── Get salary requests ──────────────────────────────────────────────────────

export async function getSalaryRequests() {
  const session = await getSession();
  if (!session || !session.agencyId) return { error: "Unauthorized" };

  const where: Record<string, unknown> = { agencyId: session.agencyId };
  // Regular employees see only their own requests
  if (!["ADMIN", "MANAGER"].includes(session.role)) {
    where.employeeId = session.userId;
  }

  const requests = await prisma.salaryPaymentRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      employee: { select: { name: true, role: true } },
      requestedBy: { select: { name: true, role: true } },
      reviewedBy: { select: { name: true } },
      managerReviewedBy: { select: { name: true } },
    },
  });

  return { requests };
}
