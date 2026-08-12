import { getSessionWithFeatures, requireFeature } from "@/lib/feature-gate";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { ClipboardCheck } from "lucide-react";
import { DailyClosingClient } from "./DailyClosingClient";

export default async function DailyClosingPage() {
  const session = await getSessionWithFeatures();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role)) redirect("/login");
  requireFeature(session, "daily_closing");

  const closings = await prisma.dailyClosing.findMany({
    where: { agencyId: session.agencyId! },
    orderBy: { date: "desc" },
    include: {
      employeeClosings: {
        include: {
          deliveryBoy: {
            select: { id: true, name: true },
          },
        },
        orderBy: {
          deliveryBoy: { name: "asc" },
        },
      },
    },
    take: 30,
  });

  // Serialize dates to prevent SSR errors
  const serializedClosings = closings.map((c) => ({
    ...c,
    date: c.date.toISOString(),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    managerApprovedAt: c.managerApprovedAt?.toISOString() || null,
    adminApprovedAt: c.adminApprovedAt?.toISOString() || null,
    cashVerifiedAt: c.cashVerifiedAt?.toISOString() || null,
    employeeClosings: c.employeeClosings.map((ec) => ({
      ...ec,
      createdAt: ec.createdAt.toISOString(),
      updatedAt: ec.updatedAt.toISOString(),
      editedAt: ec.editedAt?.toISOString() || null,
      cylinderBreakdown: ec.cylinderBreakdown as any,
    })),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Closing"
        subtitle="End-of-day closing records and reconciliation"
        icon={<ClipboardCheck className="w-5 h-5" />}
      />
      <DailyClosingClient
        initialClosings={serializedClosings as any}
        role={session.role}
      />
    </div>
  );
}