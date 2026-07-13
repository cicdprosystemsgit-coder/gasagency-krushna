import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Package } from "lucide-react";

function PaymentBadge({ mode }: { mode: string }) {
  const cfg: Record<string, { label: string; bg: string; color: string }> = {
    CASH:    { label: "Cash",    bg: "#F0FDF4", color: "#16A34A" },
    CREDIT:  { label: "Udhari", bg: "#FEF3C7", color: "#B45309" },
    PARTIAL: { label: "Partial", bg: "#EFF6FF", color: "#1D4ED8" },
    PhonePe: { label: "PhonePe", bg: "#F5F3FF", color: "#7C3AED" },
    GPay:    { label: "GPay",   bg: "#F0FDF4", color: "#059669" },
    Paytm:   { label: "Paytm",  bg: "#EFF6FF", color: "#2563EB" },
  };
  const c = cfg[mode] ?? { label: mode, bg: "#F4F4F5", color: "#52525B" };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: c.bg, color: c.color }}
    >
      {c.label}
    </span>
  );
}

import { checkPermission } from "@/lib/rbac";

export default async function DeliveryLedgerPage() {
  const session = await getSession();
  if (!session || session.role !== "DELIVERY_BOY") redirect("/login");

  const isAllowed = await checkPermission(session.userId, "deliveries", "read");
  if (!isAllowed) redirect("/delivery-boy");

  const deliveries = await prisma.deliveryRecord.findMany({
    where: { deliveredById: session.userId },
    include: {
      customer: { select: { name: true, phone: true, type: true } },
      product: { select: { name: true } },
    },
    orderBy: { date: "desc" },
    take: 100,
  });

  const totals = deliveries.reduce(
    (acc, d) => {
      const isDom = d.customer.type === "DOMESTIC";
      const isPartial = d.paymentMode === "PARTIAL";
      const isCredit = d.paymentMode === "CREDIT";
      const isCash = d.paymentMode === "CASH";

      let cashVal = 0;
      let onlineVal = 0;
      let creditVal = 0;

      if (isCash) {
        cashVal = d.cashCollected;
      } else if (isCredit) {
        creditVal = d.creditAmount || 0;
      } else if (isPartial) {
        cashVal = d.cashCollected;
        if (isDom) {
          onlineVal = d.creditAmount || 0;
        } else {
          creditVal = d.creditAmount || 0;
        }
      } else {
        onlineVal = d.cashCollected;
      }

      acc.cash += cashVal;
      acc.online += onlineVal;
      acc.udhari += creditVal;
      return acc;
    },
    { cash: 0, online: 0, udhari: 0 }
  );

  return (
    <div>
      <PageHeader title="Delivery Ledger" subtitle="Complete delivery history" icon={<Package className="w-5 h-5" />} />

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Total Deliveries</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{deliveries.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Collected (Cash + Online)</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(totals.cash + totals.online)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Credit / Udhari</p>
          <p className="text-2xl font-bold mt-1" style={{ color: totals.udhari > 0 ? "#B45309" : "#94A3B8" }}>
            {formatCurrency(totals.udhari)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Customer</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Product</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Qty</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Cash</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Online</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Udhari</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Mode</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-14 text-center text-slate-400">No delivery history yet</td></tr>
              ) : deliveries.map((d) => {
                const isDom = d.customer.type === "DOMESTIC";
                const isPartial = d.paymentMode === "PARTIAL";
                const isCredit = d.paymentMode === "CREDIT";
                const isCash = d.paymentMode === "CASH";

                let cashVal = 0;
                let onlineVal = 0;
                let creditVal = 0;

                if (isCash) {
                  cashVal = d.cashCollected;
                } else if (isCredit) {
                  creditVal = d.creditAmount || 0;
                } else if (isPartial) {
                  cashVal = d.cashCollected;
                  if (isDom) {
                    onlineVal = d.creditAmount || 0;
                  } else {
                    creditVal = d.creditAmount || 0;
                  }
                } else {
                  onlineVal = d.cashCollected;
                }

                return (
                  <tr key={d.id} className="table-row border-b border-slate-50 last:border-0">
                    <td className="px-4 py-3 text-slate-500">{formatDate(d.date)}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{d.customer.name}</td>
                    <td className="px-4 py-3 text-slate-600">{d.product.name}</td>
                    <td className="px-4 py-3 text-center font-bold text-blue-700">{d.deliveredQty}</td>
                    <td className="px-4 py-3 text-right font-bold" style={{ color: cashVal > 0 ? "#15803d" : "#94a3b8" }}>
                      {cashVal > 0 ? formatCurrency(cashVal) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold" style={{ color: onlineVal > 0 ? "#7C3AED" : "#94a3b8" }}>
                      {onlineVal > 0 ? formatCurrency(onlineVal) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold" style={{ color: creditVal > 0 ? "#B45309" : "#94a3b8" }}>
                      {creditVal > 0 ? formatCurrency(creditVal) : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <PaymentBadge mode={d.paymentMode || "CASH"} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {deliveries.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-100 font-semibold">
                  <td colSpan={4} className="px-4 py-3 text-slate-600 text-sm">
                    Total ({deliveries.length} records)
                  </td>
                  <td className="px-4 py-3 text-right text-green-700 text-sm">
                    {totals.cash > 0 ? formatCurrency(totals.cash) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-purple-700 text-sm" style={{ color: "#7C3AED" }}>
                    {totals.online > 0 ? formatCurrency(totals.online) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-sm" style={{ color: totals.udhari > 0 ? "#B45309" : "#94A3B8" }}>
                    {totals.udhari > 0 ? formatCurrency(totals.udhari) : "—"}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
