import { prisma } from "@/lib/prisma";

export async function fetchMySalaryData(userId: string, agencyId: string) {
  const [profile, drawings, advances, bonuses, requests, agency] = await Promise.all([
    prisma.employeeSalaryProfile.findFirst({
      where: { employeeId: userId, agencyId },
    }),
    // Only this employee's own drawing records
    prisma.salaryDrawing.findMany({
      where: { employeeId: userId, agencyId },
      orderBy: { date: "desc" },
      take: 500,
    }),
    // Only this employee's own advances
    prisma.salaryAdvance.findMany({
      where: { employeeId: userId, agencyId },
      orderBy: { advanceDate: "desc" },
    }),
    // Only this employee's own bonuses
    prisma.salaryBonus.findMany({
      where: { employeeId: userId, agencyId },
      orderBy: { bonusDate: "desc" },
    }),
    // Only this employee's own salary payment requests
    prisma.salaryPaymentRequest.findMany({
      where: { employeeId: userId, agencyId },
      orderBy: { createdAt: "desc" },
      include: {
        requestedBy: { select: { name: true } },
        reviewedBy: { select: { name: true } },
        managerReviewedBy: { select: { name: true } },
      },
    }),
    // Agency info for salary slip header
    prisma.agency.findUnique({
      where: { id: agencyId },
      select: { name: true, address: true, city: true, state: true, phone: true, gstin: true },
    }),
  ]);

  return { profile, drawings, advances, bonuses, requests, agency };
}
