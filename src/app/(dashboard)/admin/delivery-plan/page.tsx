import { getSessionWithFeatures, requireFeature } from "@/lib/feature-gate";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Truck } from "lucide-react";
import { DeliveryPlanHeader } from "./DeliveryPlanHeader";
import { DeliveryPlanClient } from "./DeliveryPlanClient";

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function DeliveryPlanPage({ searchParams }: PageProps) {
  const session = await getSessionWithFeatures();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role)) redirect("/login");
  requireFeature(session, "delivery_plan");

  const { date } = await searchParams;
  const selectedDate = date || new Date().toISOString().split("T")[0];

  const targetDate = new Date(selectedDate);
  const dateStart = new Date(targetDate.setHours(0, 0, 0, 0));
  const dateEnd = new Date(targetDate.setHours(23, 59, 59, 999));

  const deliveries = await prisma.deliveryRecord.findMany({
    where: {
      agencyId: session.agencyId!,
      date: { gte: dateStart, lte: dateEnd },
    },
    include: {
      customer: { select: { name: true, phone: true, address: true, type: true } },
      product: { select: { name: true } },
      deliveredBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <DeliveryPlanHeader selectedDate={selectedDate} />
      <DeliveryPlanClient deliveries={deliveries as any} selectedDate={selectedDate} />
    </div>
  );
}