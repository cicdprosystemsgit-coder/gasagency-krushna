import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatDate, formatCurrency } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Package } from "lucide-react";

export default async function DeliveryLedgerPage() {
  const session = await getSession();
  if (!session || session.role !== "DELIVERY_BOY") redirect("/login");

  const deliveries = await prisma.deliveryRecord.findMany({
    where: { deliveredById: session.userId },
    include: {
      customer: { select: { name: true, phone: true } },
      product: { select: { name: true } },
    },
    orderBy: { date: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader title="Delivery Ledger" subtitle="Complete delivery history" icon={<Package className="w-5 h-5" />} />
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Date</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Customer</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Product</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-600">Qty</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Cash</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
            </tr></thead>
            <tbody>
              {deliveries.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-14 text-center text-slate-400">No delivery history yet</td></tr>
              ) : deliveries.map((d) => (
                <tr key={d.id} className="table-row border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3 text-slate-500">{formatDate(d.date)}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{d.customer.name}</td>
                  <td className="px-4 py-3 text-slate-600">{d.product.name}</td>
                  <td className="px-4 py-3 text-center font-bold text-blue-700">{d.deliveredQty}</td>
                  <td className="px-4 py-3 text-right font-bold text-green-700">{formatCurrency(d.cashCollected)}</td>
                  <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
