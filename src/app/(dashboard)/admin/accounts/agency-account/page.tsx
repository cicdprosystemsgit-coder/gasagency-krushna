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

  // Fetch the designated agency account
  const agencyAccount = await prisma.personalAccount.findFirst({
    where: { agencyId: session.agencyId, isAgencyAccount: true, isActive: true },
  });

  let transactions: any[] = [];
  let ownerDrawings: any[] = [];

  if (agencyAccount) {
    transactions = await prisma.personalTransaction.findMany({
      where: { accountId: agencyAccount.id, agencyId: session.agencyId },
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
        title="Agency Account Dashboard"
        subtitle="Manage the primary bank account synced with LPG agency operations, salary payouts, and oil company transactions"
        icon={<Building2 className="w-5 h-5" />}
      />

      <AgencyAccountClient
        agencyAccount={agencyAccount}
        initialTransactions={transactions}
        ownerDrawings={JSON.parse(JSON.stringify(ownerDrawings))}
      />
    </div>
  );
}