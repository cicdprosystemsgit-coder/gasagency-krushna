import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { ClipboardCheck } from "lucide-react";
import { DeliveryCountClient } from "./DeliveryCountClient";
import { checkPermission } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function DeliveryCountPage() {
  const session = await getSession();
  if (!session || !["DELIVERY_BOY", "ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    redirect("/login");
  }

  // Permission check
  const isAllowed = await checkPermission(session.userId, "deliveries", "read");
  if (!isAllowed && session.role === "DELIVERY_BOY") {
    redirect("/delivery-boy");
  }

  const agencyId = session.agencyId;

  // Fetch active products
  const products = await prisma.product.findMany({
    where: { agencyId, isActive: true },
    select: { id: true, name: true, isCylinder: true },
    orderBy: { name: "asc" },
  });

  // Fetch today's and recent delivery count requests for this delivery boy
  const recentRequests = await prisma.deliveryCountRequest.findMany({
    where: {
      agencyId,
      requestedById: session.userId,
    },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      reviewedBy: { select: { name: true } },
      fulfilledBy: { select: { name: true } },
    },
  });

  // Fetch assigned vehicle info if any
  const assignedVehicle = await prisma.deliveryVehicle.findUnique({
    where: { assignedToId: session.userId },
    select: { id: true, vehicleNo: true, vehicleName: true, vehicleType: true },
  });

  const serializedRequests = recentRequests.map((r) => ({
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
        title="Daily Delivery Count Request"
        subtitle="Submit today's cylinder load request for approval and godown vehicle filling"
        icon={<ClipboardCheck className="w-5 h-5" />}
      />

      <DeliveryCountClient
        products={products}
        initialRequests={serializedRequests}
        userId={session.userId}
        assignedVehicle={assignedVehicle}
      />
    </div>
  );
}
