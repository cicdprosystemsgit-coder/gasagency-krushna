import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { ArrowLeft, ArrowRightLeft } from "lucide-react";
import Link from "next/link";
import { TransferClient } from "./TransferClient";

export default async function TransferPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId) redirect("/login");

  // Fetch active accounts of the agency
  const accounts = await prisma.personalAccount.findMany({
    where: { agencyId: session.agencyId, isActive: true },
    orderBy: { name: "asc" },
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
        title="Fund Transfer Command"
        subtitle="Transfer funds atomically between personal wallets, cash boxes, and official agency accounts"
        icon={<ArrowRightLeft className="w-5 h-5" />}
      />

      <TransferClient accounts={accounts} />
    </div>
  );
}
