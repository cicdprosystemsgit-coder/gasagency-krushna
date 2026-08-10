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
import { getTranslations } from "next-intl/server";


import { getAdminDashboardAttendanceSnapshot } from "@/app/actions/attendance";
import { AdminAttendanceDashboardWidget } from "@/components/attendance/AdminAttendanceDashboardWidget";

export default async function AdminDashboard() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId) redirect("/login");
  const agencyId = session.agencyId;
  const t = await getTranslations();


  const today = new Date();
  const todayStart = new Date(today.setHours(0, 0, 0, 0));
  const todayEnd = new Date(today.setHours(23, 59, 59, 999));

  const [totalStaff, pendingApprovals, todayDeliveries, assets, recentSummaries, products, attendanceSnapshot] =
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
      getAdminDashboardAttendanceSnapshot(),
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
            {t("dashboard.title")}
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: "#71717A" }}>
            {formatDate(new Date())} — {t("dashboard.welcome")}, {session.name}
          </p>
        </div>
        {pendingApprovals > 0 && (
          <Link
            href="/admin/approvals"
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-medium transition-colors"
            style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", color: "#1D4ED8" }}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            {pendingApprovals} {t("status.PENDING").toLowerCase()} approval{pendingApprovals > 1 ? "s" : ""}
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
          title={t("dashboard.cylindersDelivered")}
          value={totalDelivered}
          subtitle={t("common.today")}
          icon={<Package className="w-4 h-4" />}
          color="blue"
        />
        <StatsCard
          title={t("dashboard.cashCollected")}
          value={formatCurrency(totalCash)}
          subtitle={t("common.today")}
          icon={<DollarSign className="w-4 h-4" />}
          color="green"
        />
        <StatsCard
          title={t("dashboard.pendingDeliveries")}
          value={pendingQty}
          subtitle={t("dashboard.needFollowUp")}
          icon={<Truck className="w-4 h-4" />}
          color={pendingQty > 0 ? "orange" : "green"}
        />
        <StatsCard
          title={t("dashboard.activeStaff")}
          value={totalStaff}
          subtitle={t("dashboard.allRoles")}
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
              {t("dashboard.recentSubmissions")}
            </p>
            <Link
              href="/admin/approvals"
              className="flex items-center gap-1 text-[12px] font-medium transition-colors"
              style={{ color: "#2563EB" }}
            >
              {t("common.viewAll")} <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {/* MOBILE CARDS VIEW (<768px) */}
          <div className="block md:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
            {recentSummaries.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-400">
                {t("common.noData")}
              </div>
            ) : recentSummaries.map((s) => (
              <div key={`mob-sum-${s.id}`} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                      style={{ background: "#2563EB" }}
                    >
                      {s.submittedBy.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{s.submittedBy.name}</p>
                      <p className="text-[10px] text-zinc-400">
                        {t.has(`roles.${s.submittedBy.role}`)
                          ? t(`roles.${s.submittedBy.role}`)
                          : s.submittedBy.role.replace(/_/g, " ")} • {formatDate(s.date)}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
                <div className="flex justify-end pt-1">
                  <Link
                    href={`/admin/approvals?id=${s.id}`}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {t("common.review")} →
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* DESKTOP TABLE VIEW (>=768px) */}
          <div className="hidden md:block">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("dashboard.employee")}</th>
                  <th>{t("dashboard.role")}</th>
                  <th>{t("dashboard.date")}</th>
                  <th>{t("dashboard.status")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recentSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-[13px]" style={{ color: "#A1A1AA" }}>
                      {t("common.noData")}
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
                    <td className="muted text-[12px]">
                      {t.has(`roles.${s.submittedBy.role}`)
                        ? t(`roles.${s.submittedBy.role}`)
                        : s.submittedBy.role.replace(/_/g, " ")}
                    </td>
                    <td className="muted text-[12px]">{formatDate(s.date)}</td>
                    <td><StatusBadge status={s.status} /></td>
                    <td>
                      <Link
                        href={`/admin/approvals?id=${s.id}`}
                        className="text-[12px] font-medium transition-colors"
                        style={{ color: "#2563EB" }}
                      >
                        {t("common.review")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">

          <AdminAttendanceDashboardWidget snapshot={attendanceSnapshot} />

          {/* Quick actions */}
          <div
            className="rounded-lg overflow-hidden"
            style={{ background: "#FFFFFF", border: "1px solid #E4E4E7", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.04)" }}
          >
            <div className="px-5 py-3.5" style={{ borderBottom: "1px solid #E4E4E7" }}>
              <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>
                {t("dashboard.quickActions")}
              </p>
            </div>
            <div className="p-3 space-y-1">
              {[
                { label: t("dashboard.reviewApprovals"), href: "/admin/approvals", badge: pendingApprovals },
                { label: t("dashboard.addProduct"), href: "/admin/inventory" },
                { label: t("dashboard.recordGodownEntry"), href: "/admin/godown" },
                { label: t("dashboard.newCommercialSale"), href: "/admin/commercial-sales" },
                { label: t("dashboard.logExpense"), href: "/admin/expenses" },
                { label: t("dashboard.staffManagement"), href: "/admin/staff-management" },
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
              <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>
                {t("dashboard.products")}
              </p>
              <Link href="/admin/inventory" className="text-[12px] font-medium" style={{ color: "#2563EB" }}>
                {t("common.manage")} →
              </Link>
            </div>
            <div className="divide-y" style={{ borderColor: "#F4F4F5" }}>
              {products.length === 0 ? (
                <div className="py-8 text-center">
                  <Boxes className="w-6 h-6 mx-auto mb-2 text-zinc-200" />
                  <p className="text-[12px]" style={{ color: "#A1A1AA" }}>
                    {t("dashboard.noProducts")}
                  </p>
                  <Link href="/admin/inventory" className="text-[12px] font-medium mt-1 block" style={{ color: "#2563EB" }}>
                    {t("dashboard.addProduct")} →
                  </Link>
                </div>
              ) : products.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-5 py-2.5">
                  <p className="text-[13px] font-medium truncate" style={{ color: "#18181B", maxWidth: 130 }}>{p.name}</p>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[13px] font-semibold" style={{ color: "#16A34A" }}>
                      {formatCurrency(p.saleRate)}
                    </p>
                    <p className="text-[11px]" style={{ color: "#A1A1AA" }}>{t("dashboard.saleRate")}</p>
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
