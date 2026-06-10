import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { ClipboardCheck } from "lucide-react";
import { DailyClosingClient } from "./DailyClosingClient";

export default async function DailyClosingPage() {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role)) redirect("/login");

  const closings = await prisma.dailyClosing.findMany({
    orderBy: { date: "desc" },
    take: 30,
  });

  return (
    <div>
      <PageHeader
        title="Daily Closing"
        subtitle="End-of-day closing records and reconciliation"
        icon={<ClipboardCheck className="w-5 h-5" />}
      />
      <DailyClosingClient
        initialClosings={closings}
        role={session.role}
      />
    </div>
  );
}
