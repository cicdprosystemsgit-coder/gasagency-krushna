import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SalariesClient } from "./SalariesClient";

export const metadata = {
  title: "Salaries & Drawings | GasAgency",
  description: "Manage employee salaries, advances (udhari), bonuses and payroll",
};

export default async function SalariesPage() {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role)) redirect("/login");

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
    // Admin sees all; manager sees only their own
    prisma.salaryPaymentRequest.findMany({
      where: session.role === "ADMIN"
        ? { agencyId: session.agencyId! }
        : { agencyId: session.agencyId!, requestedById: session.userId },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        employee: { select: { name: true, role: true } },
        requestedBy: { select: { name: true } },
        reviewedBy: { select: { name: true } },
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
