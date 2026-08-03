import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { BookOpen } from "lucide-react";
import { ApprovalsClient } from "./ApprovalsClient";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role)) redirect("/login");

  const [summaries, salaryRequests, leaveRequests, employeeExpenses] = await Promise.all([
    prisma.dailySummary.findMany({
      where: { agencyId: session.agencyId! },
      orderBy: { createdAt: "desc" },
      include: {
        submittedBy: { select: { name: true, role: true } },
        approvedByManager: { select: { name: true } },
        approvedByAdmin: { select: { name: true } },
      },
      take: 100,
    }),
    prisma.salaryPaymentRequest.findMany({
      where: { agencyId: session.agencyId! },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        employee: { select: { name: true, role: true } },
        requestedBy: { select: { name: true, role: true } },
        reviewedBy: { select: { name: true } },
        managerReviewedBy: { select: { name: true } },
      },
    }),
    prisma.leaveRequest.findMany({
      where: { agencyId: session.agencyId! },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        employee: { select: { id: true, name: true, role: true } },
        reviewedBy: { select: { name: true } },
      },
    }),
    prisma.employeeExpense.findMany({
      where: { agencyId: session.agencyId! },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        submittedBy: { select: { name: true, email: true, role: true } },
        expenseCategory: { select: { name: true, color: true } },
        manager: { select: { name: true } },
        admin: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approvals Hub"
        subtitle="Review and approve daily summaries, salary requests, leave applications & employee expense claims"
        icon={<BookOpen className="w-5 h-5" />}
      />
      <ApprovalsClient
        initialSummaries={summaries as any}
        initialSalaryRequests={salaryRequests as any}
        initialLeaveRequests={leaveRequests as any}
        initialEmployeeExpenses={employeeExpenses as any}
        role={session.role}
        userId={session.userId}
      />
    </div>
  );
}
