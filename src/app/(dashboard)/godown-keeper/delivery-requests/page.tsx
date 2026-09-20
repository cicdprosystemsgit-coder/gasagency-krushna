import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Truck } from "lucide-react";
import { DeliveryRequestsClient } from "./DeliveryRequestsClient";
import { checkPermission } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function GodownDeliveryRequestsPage() {
  const session = await getSession();
  if (!session || !["GODOWN_KEEPER", "ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    redirect("/login");
  }

  const isAllowed = await checkPermission(session.userId, "godown", "read");
  if (!isAllowed && session.role === "GODOWN_KEEPER") {
    redirect("/godown-keeper");
  }

  const agencyId = session.agencyId;

  // Fetch products for reference
  const products = await prisma.product.findMany({
    where: { agencyId, isActive: true },
    select: { id: true, name: true, isCylinder: true },
    orderBy: { name: "asc" },
  });

  // Fetch all delivery count requests (focusing on APPROVED and FULFILLED)
  const requests = await prisma.deliveryCountRequest.findMany({
    where: {
      agencyId,
      status: { in: ["APPROVED", "FULFILLED", "PENDING"] },
    },
    orderBy: { date: "desc" },
    take: 100,
    include: {
      requestedBy: {
        select: {
          id: true,
          name: true,
          phone: true,
          assignedVehicle: {
            select: { id: true, vehicleNo: true, vehicleName: true, vehicleType: true },
          },
        },
      },
      reviewedBy: { select: { name: true } },
      fulfilledBy: { select: { name: true } },
    },
  });

  const serializedRequests = requests.map((r) => ({
    id: r.id,
    date: r.date.toISOString(),
    items: r.items as Array<{ productId: string; productName: string; requestedQty: number }>,
    totalRequested: r.totalRequested,
    notes: r.notes,
    status: r.status,
    reviewNote: r.reviewNote,
    reviewedBy: r.reviewedBy?.name || null,
    reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
    fulfilledItems: r.fulfilledItems
      ? (r.fulfilledItems as Array<{ productId: string; productName: string; loadedQty: number }>)
      : null,
    totalLoaded: r.totalLoaded,
    fuelLitres: r.fuelLitres,
    fuelAmount: r.fuelAmount,
    fuelType: r.fuelType,
    fulfilledBy: r.fulfilledBy?.name || null,
    fulfilledAt: r.fulfilledAt ? r.fulfilledAt.toISOString() : null,
    godownNotes: r.godownNotes,
    createdAt: r.createdAt.toISOString(),
    deliveryBoy: {
      id: r.requestedBy.id,
      name: r.requestedBy.name,
      phone: r.requestedBy.phone,
      vehicle: r.requestedBy.assignedVehicle || null,
    },
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicle Loading & Delivery Requests"
        subtitle="View approved delivery boy cylinder count requests, load vehicles, and record fuel filling"
        icon={<Truck className="w-5 h-5" />}
      />

      <DeliveryRequestsClient
        initialRequests={serializedRequests}
        products={products}
        userId={session.userId}
        userRole={session.role}
      />
    </div>
  );
}
