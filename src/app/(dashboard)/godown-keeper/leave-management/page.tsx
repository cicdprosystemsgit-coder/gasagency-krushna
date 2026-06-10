import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { EmployeeLeaveClient } from "@/app/(dashboard)/staff/leave-management/EmployeeLeaveClient";

export default async function GodownKeeperLeavePage() {
  const session = await getSession();
  if (!session || session.role !== "GODOWN_KEEPER" || !session.agencyId) redirect("/login");

  const leaves = await prisma.leaveRequest.findMany({
    where: { employeeId: session.userId, agencyId: session.agencyId },
    include: { reviewedBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <EmployeeLeaveClient
      initialLeaves={leaves as Parameters<typeof EmployeeLeaveClient>[0]["initialLeaves"]}
      employeeName={session.name}
    />
  );
}
