import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { ArrowLeft, Landmark } from "lucide-react";
import Link from "next/link";
import { AccountStatementClient } from "./AccountStatementClient";

interface PageProps {
  params: Promise<{ accountId: string }>;
}

export default async function AccountDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId) redirect("/login");

  const { accountId } = await params;

  // Fetch the account details
  const account = await prisma.personalAccount.findFirst({
    where: { id: accountId, agencyId: session.agencyId },
  });

  if (!account) redirect("/admin/accounts");

  // Fetch all transactions for this account to calculate running balance accurately
  const transactions = await prisma.personalTransaction.findMany({
    where: { accountId, agencyId: session.agencyId },
    orderBy: { date: "asc" }, // Ascending order is required to compute running balance from opening balance
  });

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/admin/accounts"
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Accounts
        </Link>
      </div>

      <PageHeader
        title={`${account.name} - Ledger Statement`}
        subtitle={`Account Type: ${account.accountType} ${account.bankName ? `| ${account.bankName}` : ""} ${account.accountNo ? `| •••• ${account.accountNo.slice(-4)}` : ""}`}
        icon={<Landmark className="w-5 h-5" />}
      />

      <AccountStatementClient
        account={account}
        initialTransactions={transactions}
      />
    </div>
  );
}
