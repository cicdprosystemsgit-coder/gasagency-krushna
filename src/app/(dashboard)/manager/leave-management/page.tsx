import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ManagerLeaveClient } from "./ManagerLeaveClient";

export default async function ManagerLeavePage() {
  const session = await getSession();
  if (!session || session.role !== "MANAGER" || !session.agencyId) redirect("/login");
  const agencyId = session.agencyId;

  const [myLeaves, teamLeaves, employees] = await Promise.all([
    // Manager's own leave requests
    prisma.leaveRequest.findMany({
      where: { employeeId: session.userId, agencyId },
      include: { reviewedBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    // All team leave requests (everyone except system admin)
    prisma.leaveRequest.findMany({
      where: { agencyId },
      include: {
        employee: { select: { id: true, name: true, role: true } },
        reviewedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    // Employee list for filter
    prisma.user.findMany({
      where: { agencyId, isActive: true, role: { notIn: ["SYSTEM_ADMIN"] } },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const pendingTeam = teamLeaves.filter((l) => l.status === "PENDING").length;

  return (
    <ManagerLeaveClient
      myLeaves={myLeaves as Parameters<typeof ManagerLeaveClient>[0]["myLeaves"]}
      teamLeaves={teamLeaves as Parameters<typeof ManagerLeaveClient>[0]["teamLeaves"]}
      employees={employees}
      managerName={session.name}
      pendingTeam={pendingTeam}
    />
  );
}
