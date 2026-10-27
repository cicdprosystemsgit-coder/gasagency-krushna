import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { ClipboardCheck } from "lucide-react";
import { DeliveryBoyClosingClient } from "./DeliveryBoyClosingClient";
import { getDeliveryBoyClosingForDate } from "@/app/actions/daily-closing";

interface PageProps {
  searchParams?: Promise<{ date?: string }>;
}

export default async function DeliveryBoyClosingPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session || session.role !== "DELIVERY_BOY") redirect("/login");

  const params = (await searchParams) || {};
  const todayStr = new Date().toISOString().slice(0, 10);
  const selectedDate = params.date || todayStr;

  const [todayData, pastClosings] = await Promise.all([
    getDeliveryBoyClosingForDate(selectedDate),
    prisma.dailyClosingEmployee.findMany({
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
            managerApprovedAt: true,
            adminApprovedAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 30,
    }),
  ]);

  const serializedClosings = pastClosings.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    editedAt: c.editedAt?.toISOString() || null,
    date: c.dailyClosing.date.toISOString(),
    status: c.dailyClosing.status,
    cashVerified: c.dailyClosing.cashVerified,
    submittedAt: c.submittedAt ? c.submittedAt.toISOString() : null,
    managerVerifiedAt: c.managerVerifiedAt ? c.managerVerifiedAt.toISOString() : null,
    adminConfirmedAt: c.adminConfirmedAt ? c.adminConfirmedAt.toISOString() : null,
    cylinderBreakdown: c.cylinderBreakdown as any,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Daily Closing & Cash Handover"
        subtitle="Verify your daily cylinder sales, count cash collected, and submit closing to Manager"
        icon={<ClipboardCheck className="w-5 h-5 text-blue-600" />}
      />
      <DeliveryBoyClosingClient
        initialClosings={serializedClosings as any}
        todayData={todayData as any}
        selectedDate={selectedDate}
      />
    </div>
  );
}
