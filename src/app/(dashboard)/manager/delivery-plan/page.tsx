import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Truck } from "lucide-react";

export default async function ManagerDeliveryPlanPage() {
  const session = await getSession();
  if (!session || session.role !== "MANAGER") redirect("/login");

  const today = new Date();
  const todayStart = new Date(today.setHours(0, 0, 0, 0));
  const todayEnd = new Date(today.setHours(23, 59, 59, 999));

  const deliveries = await prisma.deliveryRecord.findMany({
    where: { date: { gte: todayStart, lte: todayEnd } },
    include: {
      customer: { select: { name: true, phone: true } },
      product: { select: { name: true } },
      deliveredBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalDelivered = deliveries.reduce((a, d) => a + d.deliveredQty, 0);
  const totalCash = deliveries.reduce((a, d) => a + d.cashCollected, 0);

  return (
    <div>
      <PageHeader
        title="Delivery Plan"
        subtitle={`Today's delivery overview — ${formatDate(new Date())}`}
        icon={<Truck className="w-5 h-5" />}
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-xs text-slate-500 mb-1">Total Delivered</p>
          <p className="text-2xl font-bold text-blue-700">{totalDelivered} cylinders</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-xs text-slate-500 mb-1">Cash Collected</p>
          <p className="text-2xl font-bold text-green-700">{formatCurrency(totalCash)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-xs text-slate-500 mb-1">Total Customers</p>
          <p className="text-2xl font-bold text-slate-800">{deliveries.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">Today&apos;s Deliveries ({deliveries.length})</h2>
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
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Delivery Boy</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-14 text-center">
                    <Truck className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                    <p className="text-slate-400">No deliveries recorded today</p>
                  </td>
                </tr>
              ) : deliveries.map((d) => (
                <tr key={d.id} className="table-row border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{d.customer.name}</p>
                    <p className="text-xs text-slate-400">{d.customer.phone}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{d.product.name}</td>
                  <td className="px-4 py-3 text-center font-bold text-blue-700">{d.deliveredQty}</td>
                  <td className="px-4 py-3 text-center text-slate-600">{d.returnedQty}</td>
                  <td className="px-4 py-3 text-center text-orange-600 font-medium">{d.pendingQty}</td>
                  <td className="px-4 py-3 text-right font-bold text-green-700">{formatCurrency(d.cashCollected)}</td>
                  <td className="px-4 py-3 text-slate-500">{d.deliveredBy.name}</td>
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
