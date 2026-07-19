import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { BookOpen } from "lucide-react";
import { ApprovalsClient } from "@/app/(dashboard)/admin/approvals/ApprovalsClient";

import { checkPermission } from "@/lib/rbac";

export default async function ManagerApprovalsPage() {
  const session = await getSession();
  if (!session || session.role !== "MANAGER") redirect("/login");

  const isAllowed = await checkPermission(session.userId, "approvals", "read");
  if (!isAllowed) redirect("/manager");

  const [summaries, salaryRequests, leaveRequests] = await Promise.all([
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
    // Manager sees only their own salary payment requests
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
    // Manager sees all agency leave requests (can approve/reject)
    prisma.leaveRequest.findMany({
      where: { agencyId: session.agencyId! },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        employee: { select: { id: true, name: true, role: true } },
        reviewedBy: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Pending Approvals"
        subtitle="Review daily summaries, salary requests and leave applications"
        icon={<BookOpen className="w-5 h-5" />}
      />
      <ApprovalsClient
        initialSummaries={summaries as Parameters<typeof ApprovalsClient>[0]["initialSummaries"]}
        initialSalaryRequests={salaryRequests as Parameters<typeof ApprovalsClient>[0]["initialSalaryRequests"]}
        initialLeaveRequests={leaveRequests as Parameters<typeof ApprovalsClient>[0]["initialLeaveRequests"]}
        role={session.role}
        userId={session.userId}
      />
    </div>
  );
}
