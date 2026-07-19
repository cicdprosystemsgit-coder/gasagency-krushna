import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { ClipboardCheck } from "lucide-react";
import { DeliveryBoyClosingClient } from "./DeliveryBoyClosingClient";

export default async function DeliveryBoyClosingPage() {
  const session = await getSession();
  if (!session || session.role !== "DELIVERY_BOY") redirect("/login");

  const closings = await prisma.dailyClosingEmployee.findMany({
    where: {
      deliveryBoyId: session.userId,
      agencyId: session.agencyId!,
    },
    include: {
      dailyClosing: {
        select: {
          date: true,
          status: true,
          cashVerified: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 30,
  });

  const serialized = closings.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    editedAt: c.editedAt?.toISOString() || null,
    date: c.dailyClosing.date.toISOString(),
    status: c.dailyClosing.status,
    cashVerified: c.dailyClosing.cashVerified,
    cylinderBreakdown: c.cylinderBreakdown as any,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Daily Closing Summary"
        subtitle="View history and details of your daily cash submissions and reconciliations"
        icon={<ClipboardCheck className="w-5 h-5" />}
      />
      <DeliveryBoyClosingClient initialClosings={serialized as any} />
    </div>
  );
}
