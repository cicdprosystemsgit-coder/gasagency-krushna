import { getSessionWithFeatures, requireFeature } from "@/lib/feature-gate";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { LeaveAdminClient } from "./LeaveAdminClient";

export default async function AdminLeavePage() {
  const session = await getSessionWithFeatures();
  if (!session || session.role !== "ADMIN" || !session.agencyId) redirect("/login");
  requireFeature(session, "leave_management");
  const agencyId = session.agencyId;

  const [leaves, employees] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: { agencyId },
      include: {
        employee: { select: { id: true, name: true, role: true } },
        reviewedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { agencyId, isActive: true, role: { notIn: ["ADMIN", "SYSTEM_ADMIN"] } },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <LeaveAdminClient
      initialLeaves={leaves as Parameters<typeof LeaveAdminClient>[0]["initialLeaves"]}
      employees={employees}
      role={session.role}
    />
  );
}