import { getSessionWithFeatures, requireFeature } from "@/lib/feature-gate";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { BookOpen } from "lucide-react";
import { ApprovalsClient } from "@/app/(dashboard)/admin/approvals/ApprovalsClient";
import { checkPermission } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function ManagerApprovalsPage() {
  const session = await getSessionWithFeatures();
  if (!session || session.role !== "MANAGER") redirect("/login");
  requireFeature(session, "approvals");

  const isAllowed = await checkPermission(session.userId, "approvals", "read");
  if (!isAllowed) redirect("/manager");

  const [summaries, salaryRequests, leaveRequests, employeeExpenses] = await Promise.all([
    prisma.dailySummary.findMany({
      where: { agencyId: session.agencyId! },
      orderBy: { createdAt: "desc" },
      include: {
        submittedBy: { select: { name: true, role: true } },
        approvedByManager: { select: { name: true } },
        approvedByAdmin: { select: { name: true } },
      },
      take: 50,
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
        title="Pending Approvals"
        subtitle="Review daily summaries, salary requests, leave applications & employee expense claims"
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