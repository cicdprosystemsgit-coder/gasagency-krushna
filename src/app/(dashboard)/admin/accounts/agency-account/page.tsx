import { getSessionWithFeatures, requireFeature } from "@/lib/feature-gate";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";
import { AgencyAccountClient } from "./AgencyAccountClient";

export default async function AgencyAccountPage() {
  const session = await getSessionWithFeatures();
  if (!session || session.role !== "ADMIN" || !session.agencyId) redirect("/login");
  requireFeature(session, "agency_account");

  // Fetch all designated agency accounts
  const agencyAccounts = await prisma.personalAccount.findMany({
    where: { agencyId: session.agencyId, isAgencyAccount: true, isActive: true },
    orderBy: { createdAt: "asc" },
  });

  const agencyAccountIds = agencyAccounts.map((a) => a.id);

  let transactions: any[] = [];
  let ownerDrawings: any[] = [];

  if (agencyAccountIds.length > 0) {
    transactions = await prisma.personalTransaction.findMany({
      where: { accountId: { in: agencyAccountIds }, agencyId: session.agencyId },
      include: {
        account: {
          select: { id: true, name: true, bankName: true, accountNo: true, color: true },
        },
      },
      orderBy: { date: "desc" },
    });
  }

  // Owner Drawings: all personal transactions across ALL accounts that are 
  // owner drawings/personal withdrawals tagged with AGENCY_WITHDRAWAL or PAID_TO
  // linked to drawings (partyName "Self" or tags includes "drawings")
  ownerDrawings = await prisma.personalTransaction.findMany({
    where: {
      agencyId: session.agencyId,
      OR: [
        { type: "AGENCY_WITHDRAWAL" },
        {
          type: "PAID_TO",
          OR: [
            { partyName: { equals: "Self", mode: "insensitive" } },
            { tags: { has: "drawings" } },
          ],
        },
      ],
    },
    include: {
      account: { select: { name: true, accountType: true } },
    },
    orderBy: { date: "desc" },
    take: 200,
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
        title="Agency Accounts Dashboard"
        subtitle="Manage official bank accounts synced with LPG agency operations, salary payouts, and oil company transactions"
        icon={<Building2 className="w-5 h-5" />}
      />

      <AgencyAccountClient
        agencyAccounts={JSON.parse(JSON.stringify(agencyAccounts))}
        initialTransactions={JSON.parse(JSON.stringify(transactions))}
        ownerDrawings={JSON.parse(JSON.stringify(ownerDrawings))}
      />
    </div>
  );
}