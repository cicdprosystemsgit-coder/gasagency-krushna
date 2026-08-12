import { getSessionWithFeatures, requireFeature } from "@/lib/feature-gate";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { EmployeeLeaveClient } from "./EmployeeLeaveClient";

export default async function StaffLeavePage() {
  const session = await getSessionWithFeatures();
  if (!session || session.role !== "STAFF" || !session.agencyId) redirect("/login");
  requireFeature(session, "leave_management");

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