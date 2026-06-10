import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatCurrency } from "@/lib/utils";
import { ClipboardCheck } from "lucide-react";

export default async function ManagerDailyClosingPage() {
  const session = await getSession();
  if (!session || session.role !== "MANAGER") redirect("/login");

  const closings = await prisma.dailyClosing.findMany({
    orderBy: { date: "desc" },
    take: 30,
  });

  return (
    <div>
      <PageHeader
        title="Daily Closing"
        subtitle="Review end-of-day closing records"
        icon={<ClipboardCheck className="w-5 h-5" />}
      />
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-5 py-3 text-left font-semibold text-slate-600">Date</th>
                <th className="px-5 py-3 text-center font-semibold text-slate-600">Deliveries</th>
                <th className="px-5 py-3 text-right font-semibold text-slate-600">Collection</th>
                <th className="px-5 py-3 text-center font-semibold text-slate-600">Pending</th>
                <th className="px-5 py-3 text-center font-semibold text-slate-600">Returned</th>
                <th className="px-5 py-3 text-right font-semibold text-slate-600">Cash on Hand</th>
                <th className="px-5 py-3 text-left font-semibold text-slate-600">Status</th>
                <th className="px-5 py-3 text-left font-semibold text-slate-600">Notes</th>
              </tr>
            </thead>
            <tbody>
              {closings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-14 text-center text-slate-400">No daily closing records yet</td>
                </tr>
              ) : closings.map((c) => (
                <tr key={c.id} className="table-row border-b border-slate-50 last:border-0">
                  <td className="px-5 py-3 font-medium text-slate-800">{formatDate(c.date)}</td>
                  <td className="px-5 py-3 text-center font-bold text-blue-700">{c.totalDeliveries}</td>
                  <td className="px-5 py-3 text-right font-bold text-green-700">{formatCurrency(c.totalCollection)}</td>
                  <td className="px-5 py-3 text-center text-orange-600">{c.pendingDeliveries}</td>
                  <td className="px-5 py-3 text-center text-slate-600">{c.returnedCylinders}</td>
                  <td className="px-5 py-3 text-right font-bold text-slate-800">{formatCurrency(c.cashOnHand)}</td>
                  <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-5 py-3 text-slate-500 text-xs">{c.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
