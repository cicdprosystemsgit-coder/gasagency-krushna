import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { BarChart3 } from "lucide-react";
import { ExpensesClient } from "./ExpensesClient";

export default async function ExpensesPage() {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role)) redirect("/login");

  const [expenses, assets] = await Promise.all([
    prisma.expense.findMany({
      orderBy: { date: "desc" },
      take: 100,
      include: { addedBy: { select: { name: true } } },
    }),
    prisma.vehicleAgencyAsset.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Expenses & Vehicles"
        subtitle="Track daily expenses and manage vehicle/agency asset renewals"
        icon={<BarChart3 className="w-5 h-5" />}
      />
      <ExpensesClient
        initialExpenses={expenses as Parameters<typeof ExpensesClient>[0]["initialExpenses"]}
        initialAssets={assets}
        canEdit={session.role === "ADMIN"}
        userId={session.userId}
      />
    </div>
  );
}
