import { getSessionWithFeatures, requireFeature } from "@/lib/feature-gate";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SalariesClient } from "@/app/(dashboard)/admin/salaries/SalariesClient";

export const metadata = {
  title: "Salaries & Drawings | GasAgency",
  description: "Submit salary payment requests for admin approval",
};

export default async function ManagerSalariesPage() {
  const session = await getSessionWithFeatures();
  if (!session || session.role !== "MANAGER") redirect("/login");
  requireFeature(session, "salaries");

  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  const [drawings, staff, profiles, advances, bonuses, requests] = await Promise.all([
    prisma.salaryDrawing.findMany({
      where: { agencyId: session.agencyId! },
      orderBy: { date: "desc" },
      take: 200,
      include: { employee: { select: { name: true, role: true } } },
    }),
    prisma.user.findMany({
      where: { agencyId: session.agencyId!, isActive: true },
      select: { id: true, name: true, role: true, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.employeeSalaryProfile.findMany({
      where: { agencyId: session.agencyId! },
      include: { employee: { select: { id: true, name: true, role: true, isActive: true } } },
      orderBy: { employee: { name: "asc" } },
    }),
    prisma.salaryAdvance.findMany({
      where: { agencyId: session.agencyId! },
      orderBy: { advanceDate: "desc" },
      include: { employee: { select: { name: true, role: true } } },
    }),
    prisma.salaryBonus.findMany({
      where: { agencyId: session.agencyId! },
      orderBy: { bonusDate: "desc" },
      include: { employee: { select: { name: true, role: true } } },
    }),
    // Manager sees only their own submitted requests
    prisma.salaryPaymentRequest.findMany({
      where: { agencyId: session.agencyId!, requestedById: session.userId },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        employee: { select: { name: true, role: true } },
        requestedBy: { select: { name: true, role: true } },
        reviewedBy: { select: { name: true } },
        managerReviewedBy: { select: { name: true } },
      },
    }),
  ]);

  return (
    <SalariesClient
      initialDrawings={drawings as Parameters<typeof SalariesClient>[0]["initialDrawings"]}
      initialAdvances={advances as Parameters<typeof SalariesClient>[0]["initialAdvances"]}
      initialBonuses={bonuses as Parameters<typeof SalariesClient>[0]["initialBonuses"]}
      initialProfiles={profiles as Parameters<typeof SalariesClient>[0]["initialProfiles"]}
      initialRequests={requests as Parameters<typeof SalariesClient>[0]["initialRequests"]}
      staff={staff}
      currentMonth={currentMonth}
      currentYear={currentYear}
      userRole={session.role}
      userId={session.userId}
    />
  );
}