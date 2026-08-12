import { getSessionWithFeatures, requireFeature } from "@/lib/feature-gate";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Wallet } from "lucide-react";
import { AccountsClient } from "./AccountsClient";

export default async function AccountsPage() {
  const session = await getSessionWithFeatures();
  if (!session || session.role !== "ADMIN" || !session.agencyId) redirect("/login");
  requireFeature(session, "personal_accounts");

  const accounts = await prisma.personalAccount.findMany({
    where: { agencyId: session.agencyId, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Personal Finance Command Center"
        subtitle="Manage personal accounts, wallets, cash, track income/expenses and handle fund transfers"
        icon={<Wallet className="w-5 h-5" />}
      />
      <AccountsClient
        initialAccounts={accounts}
        userId={session.userId}
      />
    </div>
  );
}