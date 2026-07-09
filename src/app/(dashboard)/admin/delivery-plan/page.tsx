import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import { Truck, Users } from "lucide-react";
import { DeliveryPlanHeader } from "./DeliveryPlanHeader";

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function DeliveryPlanPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role)) redirect("/login");

  const { date } = await searchParams;
  const selectedDate = date || new Date().toISOString().split("T")[0];

  const targetDate = new Date(selectedDate);
  const dateStart = new Date(targetDate.setHours(0, 0, 0, 0));
  const dateEnd = new Date(targetDate.setHours(23, 59, 59, 999));

  const deliveries = await prisma.deliveryRecord.findMany({
    where: { date: { gte: dateStart, lte: dateEnd } },
    include: {
      customer: { select: { name: true, phone: true, address: true, type: true } },
      product: { select: { name: true } },
      deliveredBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const deliveryBoys = await prisma.user.findMany({
    where: { role: "DELIVERY_BOY", isActive: true },
    select: { id: true, name: true },
  });

  const customers = await prisma.customer.findMany({
    where: { isActive: true },
    select: { id: true, name: true, phone: true, address: true, type: true },
  });

  const products = await prisma.product.findMany({ where: { isActive: true }, select: { id: true, name: true } });

  const totalDelivered = deliveries.reduce((a, d) => a + d.deliveredQty, 0);
  const pending = deliveries.filter((d) => d.pendingQty > 0);

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
      <DeliveryPlanHeader selectedDate={selectedDate} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-xs text-slate-500 mb-1">Total Deliveries</p>
          <p className="text-2xl font-bold text-blue-700">{totalDelivered} cylinders</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-xs text-slate-500 mb-1">Collected (Cash + Online)</p>
          <p className="text-2xl font-bold text-green-700">{formatCurrency(totals.cash + totals.online)}</p>
          <p className="text-[10px] text-slate-400 mt-1">Cash: {formatCurrency(totals.cash)} | Online: {formatCurrency(totals.online)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-xs text-slate-500 mb-1">Credit / Udhari</p>
          <p className="text-2xl font-bold text-amber-700">{formatCurrency(totals.udhari)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-xs text-slate-500 mb-1">Pending Deliveries</p>
          <p className="text-2xl font-bold text-orange-600">{pending.length} customers</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            Today&apos;s Deliveries ({deliveries.length} customers)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Customer</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Product</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Delivered</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Returned</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Pending</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Cash</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Online</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Udhari</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Delivery Boy</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.length === 0 ? (
                <tr><td colSpan={10} className="px-5 py-14 text-center text-slate-400">
                  <Truck className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No deliveries recorded today</p>
                </td></tr>
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
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{d.customer.name}</p>
                      <p className="text-xs text-slate-400">{d.customer.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{d.product.name}</td>
                    <td className="px-4 py-3 text-center font-bold text-blue-700">{d.deliveredQty}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{d.returnedQty}</td>
                    <td className="px-4 py-3 text-center text-orange-600 font-medium">{d.pendingQty}</td>
                    <td className="px-4 py-3 text-right font-bold text-green-700">{cashVal > 0 ? formatCurrency(cashVal) : "—"}</td>
                    <td className="px-4 py-3 text-right font-bold text-purple-700">{onlineVal > 0 ? formatCurrency(onlineVal) : "—"}</td>
                    <td className="px-4 py-3 text-right font-bold text-amber-700">{creditVal > 0 ? formatCurrency(creditVal) : "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{d.deliveredBy.name}</td>
                    <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                  </tr>
                );
              })}
            </tbody>
            {deliveries.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-100 font-semibold text-slate-700">
                  <td colSpan={2} className="px-4 py-3 text-slate-600">Total</td>
                  <td className="px-4 py-3 text-center text-blue-700">{totalDelivered}</td>
                  <td className="px-4 py-3 text-center text-slate-600">{deliveries.reduce((a, d) => a + d.returnedQty, 0)}</td>
                  <td className="px-4 py-3 text-center text-orange-600">{deliveries.reduce((a, d) => a + d.pendingQty, 0)}</td>
                  <td className="px-4 py-3 text-right text-green-700">{totals.cash > 0 ? formatCurrency(totals.cash) : "—"}</td>
                  <td className="px-4 py-3 text-right text-purple-700">{totals.online > 0 ? formatCurrency(totals.online) : "—"}</td>
                  <td className="px-4 py-3 text-right text-amber-700">{totals.udhari > 0 ? formatCurrency(totals.udhari) : "—"}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
