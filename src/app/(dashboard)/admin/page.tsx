import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatCurrency, formatDate, getDaysUntilRenewal, getRenewalStatus } from "@/lib/utils";
import { StatsCard } from "@/components/ui/StatsCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Package, Truck, DollarSign, Users, AlertTriangle,
  ArrowRight, ClipboardCheck, Boxes, ChevronRight
} from "lucide-react";
import Link from "next/link";

export default async function AdminDashboard() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId) redirect("/login");
  const agencyId = session.agencyId;

  const today = new Date();
  const todayStart = new Date(today.setHours(0, 0, 0, 0));
  const todayEnd = new Date(today.setHours(23, 59, 59, 999));

  const [totalStaff, pendingApprovals, todayDeliveries, assets, recentSummaries, products] =
    await Promise.all([
      prisma.user.count({ where: { isActive: true, agencyId, role: { not: "SYSTEM_ADMIN" } } }),
      prisma.dailySummary.count({ where: { status: "PENDING", agencyId } }),
      prisma.deliveryRecord.findMany({
        where: { date: { gte: todayStart, lte: todayEnd }, agencyId },
        include: { customer: { select: { type: true } } },
      }),
      prisma.vehicleAgencyAsset.findMany({ where: { isActive: true, agencyId } }),
      prisma.dailySummary.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        where: { agencyId },
        include: { submittedBy: { select: { name: true, role: true } } },
      }),
      prisma.product.findMany({ where: { isActive: true, agencyId }, take: 5 }),
    ]);

  const totalDelivered = todayDeliveries.reduce((s, d) => s + d.deliveredQty, 0);
  const totalCash = todayDeliveries.reduce((s, d) => {
    const isDom = d.customer.type === "DOMESTIC";
    const isPartial = d.paymentMode === "PARTIAL";
    if (isPartial && isDom) {
      return s + d.cashCollected + (d.creditAmount || 0);
    }
    return s + d.cashCollected;
  }, 0);
  const pendingQty = todayDeliveries.reduce((s, d) => s + d.pendingQty, 0);

  const renewalAlerts = assets.filter((a) => {
    if (!a.nextRenewalDate) return false;
    return getDaysUntilRenewal(a.nextRenewalDate) <= 30;
  });

  return (
    <div>

      {/* ── Page header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight" style={{ color: "#18181B" }}>
            Dashboard
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: "#71717A" }}>
            {formatDate(new Date())} — Welcome back, {session.name}
          </p>
        </div>
        {pendingApprovals > 0 && (
          <Link
            href="/admin/approvals"
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-medium transition-colors"
            style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", color: "#1D4ED8" }}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            {pendingApprovals} pending approval{pendingApprovals > 1 ? "s" : ""}
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* ── Renewal alert banner ─────────────────────────────────── */}
      {renewalAlerts.length > 0 && (
        <div
          className="flex items-start gap-3 px-4 py-3 rounded-lg mb-6"
          style={{ background: "#FEF2F2", border: "1px solid #FCA5A5" }}
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#DC2626" }} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold" style={{ color: "#B91C1C" }}>
              {renewalAlerts.length} renewal alert{renewalAlerts.length > 1 ? "s" : ""} require attention
            </p>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {renewalAlerts.map((a) => {
                const days = getDaysUntilRenewal(a.nextRenewalDate!);
                const s = getRenewalStatus(days);
                return (
                  <span
                    key={a.id}
                    className="text-[11px] font-medium px-2 py-0.5 rounded"
                    style={{
                      background: s === "expired" ? "#FEE2E2" : s === "urgent" ? "#FED7AA" : "#FEF9C3",
                      color: s === "expired" ? "#991B1B" : s === "urgent" ? "#9A3412" : "#854D0E",
                    }}
                  >
                    {a.name}: {days < 0 ? `expired ${Math.abs(days)}d ago` : `${days}d left`}
                  </span>
                );
              })}
            </div>
          </div>
          <Link href="/admin/expenses" className="text-[12px] font-medium flex-shrink-0" style={{ color: "#DC2626" }}>
            View →
          </Link>
        </div>
      )}

      {/* ── KPI grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatsCard
          title="Cylinders Delivered"
          value={totalDelivered}
          subtitle="Today"
          icon={<Package className="w-4 h-4" />}
          color="blue"
        />
        <StatsCard
          title="Cash Collected"
          value={formatCurrency(totalCash)}
          subtitle="Today"
          icon={<DollarSign className="w-4 h-4" />}
          color="green"
        />
        <StatsCard
          title="Pending Deliveries"
          value={pendingQty}
          subtitle="Need follow-up"
          icon={<Truck className="w-4 h-4" />}
          color={pendingQty > 0 ? "orange" : "green"}
        />
        <StatsCard
          title="Active Staff"
          value={totalStaff}
          subtitle="All roles"
          icon={<Users className="w-4 h-4" />}
          color="purple"
        />
      </div>

      {/* ── Main grid ────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-4">

        {/* Approval queue */}
        <div
          className="lg:col-span-2 rounded-lg overflow-hidden"
          style={{ background: "#FFFFFF", border: "1px solid #E4E4E7", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.04)" }}
        >
          <div
            className="flex items-center justify-between px-5 py-3.5"
            style={{ borderBottom: "1px solid #E4E4E7" }}
          >
            <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>
              Recent Submissions
            </p>
            <Link
              href="/admin/approvals"
              className="flex items-center gap-1 text-[12px] font-medium transition-colors"
              style={{ color: "#2563EB" }}
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Role</th>
                <th>Date</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recentSummaries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[13px]" style={{ color: "#A1A1AA" }}>
                    No submissions yet
                  </td>
                </tr>
              ) : recentSummaries.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                        style={{ background: "#2563EB" }}
                      >
                        {s.submittedBy.name.charAt(0)}
                      </div>
                      <span className="text-[13px] font-medium" style={{ color: "#18181B" }}>
                        {s.submittedBy.name}
                      </span>
                    </div>
                  </td>
                  <td className="muted text-[12px]">{s.submittedBy.role.replace(/_/g, " ")}</td>
                  <td className="muted text-[12px]">{formatDate(s.date)}</td>
                  <td><StatusBadge status={s.status} /></td>
                  <td>
                    <Link
                      href={`/admin/approvals?id=${s.id}`}
                      className="text-[12px] font-medium transition-colors"
                      style={{ color: "#2563EB" }}
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">

          {/* Quick actions */}
          <div
            className="rounded-lg overflow-hidden"
            style={{ background: "#FFFFFF", border: "1px solid #E4E4E7", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.04)" }}
          >
            <div className="px-5 py-3.5" style={{ borderBottom: "1px solid #E4E4E7" }}>
              <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>Quick actions</p>
            </div>
            <div className="p-3 space-y-1">
              {[
                { label: "Review approvals", href: "/admin/approvals", badge: pendingApprovals },
                { label: "Add product", href: "/admin/inventory" },
                { label: "Record godown entry", href: "/admin/godown" },
                { label: "New commercial sale", href: "/admin/commercial-sales" },
                { label: "Log expense", href: "/admin/expenses" },
                { label: "Staff management", href: "/admin/staff-management" },
              ].map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="flex items-center justify-between px-3 py-2 rounded-md text-[13px] transition-colors hover:bg-zinc-50 group"
                  style={{ color: "#52525B" }}
                >
                  {a.label}
                  <div className="flex items-center gap-1.5">
                    {a.badge !== undefined && a.badge > 0 && (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                        style={{ background: "#DC2626" }}
                      >
                        {a.badge}
                      </span>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#A1A1AA" }} />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Product list */}
          <div
            className="rounded-lg overflow-hidden"
            style={{ background: "#FFFFFF", border: "1px solid #E4E4E7", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.04)" }}
          >
            <div
              className="flex items-center justify-between px-5 py-3.5"
              style={{ borderBottom: "1px solid #E4E4E7" }}
            >
              <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>Products</p>
              <Link href="/admin/inventory" className="text-[12px] font-medium" style={{ color: "#2563EB" }}>
                Manage →
              </Link>
            </div>
            <div className="divide-y" style={{ borderColor: "#F4F4F5" }}>
              {products.length === 0 ? (
                <div className="py-8 text-center">
                  <Boxes className="w-6 h-6 mx-auto mb-2 text-zinc-200" />
                  <p className="text-[12px]" style={{ color: "#A1A1AA" }}>No products added</p>
                  <Link href="/admin/inventory" className="text-[12px] font-medium mt-1 block" style={{ color: "#2563EB" }}>
                    Add product →
                  </Link>
                </div>
              ) : products.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-5 py-2.5">
                  <p className="text-[13px] font-medium truncate" style={{ color: "#18181B", maxWidth: 130 }}>{p.name}</p>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[13px] font-semibold" style={{ color: "#16A34A" }}>
                      {formatCurrency(p.saleRate)}
                    </p>
                    <p className="text-[11px]" style={{ color: "#A1A1AA" }}>sale rate</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
