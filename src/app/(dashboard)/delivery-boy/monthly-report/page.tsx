import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { BarChart3 } from "lucide-react";
import { MonthlyReportClient } from "./MonthlyReportClient";
import { checkPermission } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function MonthlyReportPage() {
  const session = await getSession();
  if (!session || !["DELIVERY_BOY", "ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    redirect("/login");
  }

  const isAllowed = await checkPermission(session.userId, "deliveries", "read");
  if (!isAllowed && session.role === "DELIVERY_BOY") {
    redirect("/delivery-boy");
  }

  const agencyId = session.agencyId;

  // Fetch all requests for this delivery boy
  const allRequests = await prisma.deliveryCountRequest.findMany({
    where: {
      agencyId,
      requestedById: session.userId,
    },
    orderBy: { date: "desc" },
    include: {
      reviewedBy: { select: { name: true } },
      fulfilledBy: { select: { name: true } },
    },
  });

  const serialized = allRequests.map((r) => ({
    id: r.id,
    date: r.date.toISOString(),
    items: r.items as Array<{ productId: string; productName: string; requestedQty: number }>,
    totalRequested: r.totalRequested,
    notes: r.notes,
    status: r.status,
    reviewNote: r.reviewNote,
    reviewedBy: r.reviewedBy?.name || null,
    reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
    fulfilledItems: r.fulfilledItems ? (r.fulfilledItems as Array<{ productId: string; productName: string; loadedQty: number }>) : null,
    totalLoaded: r.totalLoaded,
    fuelLitres: r.fuelLitres,
    fuelAmount: r.fuelAmount,
    fuelType: r.fuelType,
    fulfilledBy: r.fulfilledBy?.name || null,
    fulfilledAt: r.fulfilledAt ? r.fulfilledAt.toISOString() : null,
    godownNotes: r.godownNotes,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monthly Delivery Report"
        subtitle="View your daily delivery count requests, monthly aggregates, vehicle loading and fuel totals"
        icon={<BarChart3 className="w-5 h-5" />}
      />

      <MonthlyReportClient initialRequests={serialized} />
    </div>
  );
}
