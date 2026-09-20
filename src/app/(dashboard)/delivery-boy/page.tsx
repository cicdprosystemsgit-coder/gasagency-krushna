import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatDate, formatCurrency } from "@/lib/utils";
import { PunchWidget } from "@/components/ui/PunchWidget";
import { Truck, Package, DollarSign, ArrowRight, Users, Clock, AlertCircle, ShieldAlert, ClipboardCheck, BarChart3, CheckCircle2, Fuel } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { checkPermission } from "@/lib/rbac";

export default async function DeliveryBoyDashboard() {
  const session = await getSession();
  if (!session || session.role !== "DELIVERY_BOY" || !session.agencyId) redirect("/login");
  const agencyId = session.agencyId;
  const t = await getTranslations("deliveryBoy");
  const tCommon = await getTranslations("common");
  const tNav = await getTranslations("nav");

  const today = new Date();
  const todayStart = new Date(today.setHours(0, 0, 0, 0));
  const todayEnd = new Date(today.setHours(23, 59, 59, 999));

  // Enforce permission checks
  const [hasDeliveries, hasCustomers] = await Promise.all([
    checkPermission(session.userId, "deliveries", "read"),
    checkPermission(session.userId, "customers", "read"),
  ]);

  const [deliveries, assignedVehicle, todayTrip, todayCountRequest] = await Promise.all([
    hasDeliveries
      ? prisma.deliveryRecord.findMany({
          where: { deliveredById: session.userId, agencyId, date: { gte: todayStart, lte: todayEnd } },
          include: {
            customer: { select: { name: true, phone: true, type: true } },
            product: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    hasDeliveries
      ? prisma.deliveryVehicle.findUnique({
          where: { assignedToId: session.userId },
          select: { id: true, vehicleNo: true, vehicleName: true, vehicleType: true, status: true },
        })
      : Promise.resolve(null),
    hasDeliveries
      ? prisma.vehicleTripLog.findFirst({
          where: { agencyId, date: { gte: todayStart, lte: todayEnd }, vehicle: { assignedToId: session.userId } },
          orderBy: { createdAt: "desc" },
          select: { cylindersLoaded: true, cylindersDelivered: true, cylindersReturned: true, tripStatus: true, departureTime: true, returnTime: true },
        })
      : Promise.resolve(null),
    hasDeliveries
      ? prisma.deliveryCountRequest.findFirst({
          where: { agencyId, requestedById: session.userId, date: { gte: todayStart, lte: todayEnd } },
          orderBy: { createdAt: "desc" },
          include: { reviewedBy: { select: { name: true } }, fulfilledBy: { select: { name: true } } },
        })
      : Promise.resolve(null),
  ]);

  const totalDelivered = deliveries.reduce((a, d) => a + d.deliveredQty, 0);
  const totalCash = deliveries.reduce((a, d) => {
    const isDom = d.customer.type === "DOMESTIC";
    const isPartial = d.paymentMode === "PARTIAL";
    if (isPartial && isDom) {
      return a + d.cashCollected + (d.creditAmount || 0);
    }
    return a + d.cashCollected;
  }, 0);
  const totalPending = deliveries.reduce((a, d) => a + d.pendingQty, 0);

  const TRIP_STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
    LOADED: { label: t("LOADED"), color: "#2563EB", bg: "#EFF6FF" },
    OUT_FOR_DELIVERY: { label: t("OUT_FOR_DELIVERY"), color: "#D97706", bg: "#FFFBEB" },
    RETURNED: { label: t("RETURNED"), color: "#16A34A", bg: "#F0FDF4" },
    PARTIAL_RETURN: { label: t("PARTIAL_RETURN"), color: "#7C3AED", bg: "#F5F3FF" },
  };

  const tripInfo = todayTrip ? TRIP_STATUS_MAP[todayTrip.tripStatus] : null;

  const modules = [
    { label: "Daily Count Request", href: "/delivery-boy/delivery-count", icon: <ClipboardCheck className="w-5 h-5" />, desc: "Submit today's cylinder count for approval & godown vehicle filling", color: "#0284C7", bg: "#F0F9FF", allowed: hasDeliveries },
    { label: "Monthly Report", href: "/delivery-boy/monthly-report", icon: <BarChart3 className="w-5 h-5" />, desc: "Monthly delivery requests, vehicle loading & fuel totals", color: "#4F46E5", bg: "#EEF2FF", allowed: hasDeliveries },
    { label: t("myDeliveries"), href: "/delivery-boy/my-deliveries", icon: <Truck className="w-5 h-5" />, desc: t("myDeliveriesDesc"), color: "#2563EB", bg: "#EFF6FF", allowed: hasDeliveries },
    { label: t("deliveryLedger"), href: "/delivery-boy/delivery-ledger", icon: <Package className="w-5 h-5" />, desc: t("deliveryLedgerDesc"), color: "#7C3AED", bg: "#F5F3FF", allowed: hasDeliveries },
    { label: t("creditLedger"), href: "/delivery-boy/credit-ledger", icon: <DollarSign className="w-5 h-5" />, desc: t("creditLedgerDesc"), color: "#16A34A", bg: "#F0FDF4", allowed: hasCustomers },
  ].filter((m) => m.allowed);

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight" style={{ color: "#18181B" }}>
            {t("myDashboard")}
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: "#71717A" }}>
            {formatDate(new Date())} — {t("hello")}, {session.name} 👋
          </p>
        </div>
        {hasDeliveries && (
          <Link href="/delivery-boy/my-deliveries" className="btn btn-primary">
            <Plus className="w-3.5 h-3.5" /> {t("addDelivery")}
          </Link>
        )}
      </div>

      {/* Punch In/Out */}
      <PunchWidget />

      {/* Main Content Area */}
      {modules.length > 0 ? (
        <>
          {/* Assigned Vehicle Card */}
          {hasDeliveries && (
            <div className="rounded-xl p-5 mb-5" style={{ background: assignedVehicle ? "#18181B" : "#F4F4F5", border: "1px solid " + (assignedVehicle ? "#27272A" : "#E4E4E7") }}>
              {assignedVehicle ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(37,99,235,0.15)" }}>
                      <Truck className="w-6 h-6" style={{ color: "#60A5FA" }} />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide mb-0.5" style={{ color: "#71717A" }}>
                        {t("assignedVehicle")}
                      </p>
                      <p className="text-[18px] font-bold font-mono" style={{ color: "#fff" }}>{assignedVehicle.vehicleNo}</p>
                      <p className="text-[13px]" style={{ color: "#A1A1AA" }}>{assignedVehicle.vehicleName} · {assignedVehicle.vehicleType}</p>
                    </div>
                  </div>
                  {tripInfo && (
                    <div className="text-right">
                      <p className="text-[11px] font-medium uppercase tracking-wide mb-1" style={{ color: "#71717A" }}>
                        {t("todayStatus")}
                      </p>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold" style={{ background: tripInfo.bg + "22", color: tripInfo.color, border: `1px solid ${tripInfo.color}44` }}>
                        {tripInfo.label}
                      </span>
                      {todayTrip?.cylindersLoaded ? (
                        <p className="text-[11px] mt-1" style={{ color: "#71717A" }}>
                          {t("loaded", { qty: todayTrip.cylindersLoaded })}
                        </p>
                      ) : null}
                    </div>
                  )}
                  {!tripInfo && (
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[12px] font-medium" style={{ background: "rgba(255,255,255,0.06)", color: "#A1A1AA" }}>
                        <Clock className="w-3.5 h-3.5" /> {t("noTripToday")}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5" style={{ color: "#A1A1AA" }} />
                  <p className="text-[13px]" style={{ color: "#71717A" }}>
                    {t("noVehicle")}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Today's Delivery Count / Vehicle Load Request Card */}
          {hasDeliveries && (
            <div className="rounded-xl p-4 mb-5 border bg-white border-zinc-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600 shrink-0">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[13px] font-semibold text-zinc-900">Today&apos;s Vehicle Load Request</p>
                    {todayCountRequest ? (
                      todayCountRequest.status === "PENDING" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3" /> Awaiting Admin Approval
                        </span>
                      ) : todayCountRequest.status === "APPROVED" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          <CheckCircle2 className="w-3 h-3" /> Approved • Ready for Godown Loading
                        </span>
                      ) : todayCountRequest.status === "FULFILLED" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Truck className="w-3 h-3" /> Vehicle Loaded ({todayCountRequest.totalLoaded} cyl)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                          Rejected
                        </span>
                      )
                    ) : (
                      <span className="text-[11px] text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
                        Not requested yet
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-zinc-500 mt-0.5">
                    {todayCountRequest
                      ? `Requested: ${todayCountRequest.totalRequested} cylinders. ${
                          todayCountRequest.fulfilledBy ? `Loaded by ${todayCountRequest.fulfilledBy}.` : ""
                        }`
                      : "Submit your daily cylinder count to request vehicle loading and fuel from Godown."}
                  </p>
                </div>
              </div>

              <Link
                href="/delivery-boy/delivery-count"
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition shrink-0"
              >
                {todayCountRequest ? "View Request Status" : "Request Today's Load"}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* KPI Cards */}
          {hasDeliveries && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              {[
                { label: t("deliveredToday"), val: totalDelivered, unit: "cylinders", color: "#2563EB", bg: "#EFF6FF", icon: <Package className="w-4 h-4" /> },
                { label: t("cashCollected"), val: formatCurrency(totalCash), unit: tCommon("today").toLowerCase(), color: "#16A34A", bg: "#F0FDF4", icon: <DollarSign className="w-4 h-4" /> },
                { label: t("pending"), val: totalPending, unit: tNav("approvals").toLowerCase(), color: totalPending > 0 ? "#D97706" : "#16A34A", bg: totalPending > 0 ? "#FFFBEB" : "#F0FDF4", icon: <Clock className="w-4 h-4" /> },
                { label: t("customersVisited"), val: deliveries.length, unit: tCommon("today").toLowerCase(), color: "#7C3AED", bg: "#F5F3FF", icon: <Users className="w-4 h-4" /> },
              ].map((s) => (
                <div key={s.label} className="rounded-lg p-4" style={{ background: "#fff", border: "1px solid #E4E4E7", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "#71717A" }}>{s.label}</p>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
                  </div>
                  <p className="text-[22px] font-bold leading-none mb-1" style={{ color: s.color }}>{s.val}</p>
                  <p className="text-[11px]" style={{ color: "#A1A1AA" }}>{s.unit}</p>
                </div>
              ))}
            </div>
          )}

          {/* Today's deliveries table */}
          {hasDeliveries && deliveries.length > 0 && (
            <div className="rounded-lg overflow-hidden mb-4" style={{ background: "#fff", border: "1px solid #E4E4E7", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
              <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid #E4E4E7" }}>
                <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>{t("todayDeliveries")}</p>
                <Link href="/delivery-boy/my-deliveries" className="flex items-center gap-1 text-[12px] font-medium" style={{ color: "#2563EB" }}>
                  {tCommon("viewAll")} <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <table className="table">
                <thead><tr>
                  <th>{t("customer")}</th><th>{t("product")}</th>
                  <th className="text-center">{t("qty")}</th><th className="text-center">{t("pending")}</th>
                  <th className="text-right">{t("cash")}</th><th className="text-center">{t("status")}</th>
                </tr></thead>
                <tbody>
                  {deliveries.slice(0, 6).map((d) => (
                    <tr key={d.id}>
                      <td>
                        <p className="font-medium text-[13px]" style={{ color: "#18181B" }}>{d.customer.name}</p>
                        <p className="text-[11px]" style={{ color: "#A1A1AA" }}>{d.customer.phone}</p>
                      </td>
                      <td className="muted text-[12px]">{d.product.name}</td>
                      <td className="text-center font-bold" style={{ color: "#2563EB" }}>{d.deliveredQty}</td>
                      <td className="text-center font-medium" style={{ color: d.pendingQty > 0 ? "#D97706" : "#A1A1AA" }}>{d.pendingQty || "—"}</td>
                      <td className="text-right font-semibold" style={{ color: "#16A34A" }}>
                        {formatCurrency(
                          d.cashCollected + (d.paymentMode === "PARTIAL" && d.customer.type === "DOMESTIC" ? (d.creditAmount ?? 0) : 0)
                        )}
                      </td>
                      <td className="text-center">
                        {d.pendingQty > 0
                          ? <span className="badge badge-pending">{t("pending")}</span>
                          : <span className="badge badge-approved">{t("done")}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Module links */}
          <div className="grid sm:grid-cols-3 gap-3">
            {modules.map((m) => (
              <Link key={m.href} href={m.href}
                className="rounded-lg p-4 transition-colors hover:bg-zinc-50 group"
                style={{ background: "#fff", border: "1px solid #E4E4E7", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: m.bg, color: m.color }}>{m.icon}</div>
                <p className="text-[14px] font-semibold mb-1" style={{ color: "#18181B" }}>{m.label}</p>
                <p className="text-[12px] mb-3" style={{ color: "#A1A1AA" }}>{m.desc}</p>
                <div className="flex items-center gap-1 text-[12px] font-medium" style={{ color: m.color }}>
                  {t("open")} <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : (
        <div className="card p-6 flex items-center gap-3.5 bg-zinc-50 border border-zinc-200 rounded-lg">
          <ShieldAlert className="w-5 h-5 text-zinc-400 flex-shrink-0" />
          <div className="text-[13px] text-zinc-500">
            You do not have access to any delivery features. Please contact your agency administrator to update your role permissions.
          </div>
        </div>
      )}
    </div>
  );
}

function Plus({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}
