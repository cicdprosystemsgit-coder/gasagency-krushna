import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDateTime } from "@/lib/utils";
import {
  Truck, Package, ArrowRight, Warehouse, Activity, CheckCircle2,
  Clock, ShieldAlert, Navigation, Layers, History,
  Boxes, BadgeAlert, AlertCircle, RefreshCw
} from "lucide-react";
import Link from "next/link";
import { getAgencyTodayRange } from "@/lib/utils";
import { getTranslations } from "next-intl/server";


import { checkPermission } from "@/lib/rbac";
import { PunchWidget } from "@/components/ui/PunchWidget";

export default async function GodownKeeperDashboard() {
  const session = await getSession();
  if (!session || session.role !== "GODOWN_KEEPER" || !session.agencyId) redirect("/login");
  const agencyId = session.agencyId;
  const t = await getTranslations("godownKeeper");
  const tStatus = await getTranslations("status");

  const { todayStart, todayEnd } = getAgencyTodayRange();

  // Enforce permission checks
  const [hasGodown, hasInventory] = await Promise.all([
    checkPermission(session.userId, "godown", "read"),
    checkPermission(session.userId, "inventory", "read"),
  ]);

  const [
    todayCount,
    recentRecords,
    approvedGodownRecords,
    allTripLogs,
    todayTrips,
    totalVehicles,
    products
  ] = await Promise.all([
    // Arrivals submitted by today
    hasGodown
      ? prisma.godownRecord.count({
          where: { submittedById: session.userId, agencyId, entryDate: { gte: todayStart, lte: todayEnd } }
        })
      : Promise.resolve(0),
    // Recent arrivals
    hasGodown
      ? prisma.godownRecord.findMany({
          where: { agencyId },
          orderBy: { entryDate: "desc" },
          take: 5
        })
      : Promise.resolve([]),
    // Approved arrivals for stock calculation
    hasGodown
      ? prisma.godownRecord.findMany({
          where: { agencyId, status: "APPROVED" }
        })
      : Promise.resolve([]),
    // Trip logs for stock calculation
    hasGodown
      ? prisma.vehicleTripLog.findMany({
          where: { agencyId }
        })
      : Promise.resolve([]),
    // Today's trips
    hasGodown
      ? prisma.vehicleTripLog.findMany({
          where: { agencyId, date: { gte: todayStart, lte: todayEnd } },
          include: {
            vehicle: {
              select: {
                vehicleNo: true,
                vehicleName: true,
                assignedTo: { select: { name: true } }
              }
            }
          },
          orderBy: { createdAt: "desc" }
        })
      : Promise.resolve([]),
    // Active delivery vehicles
    hasGodown
      ? prisma.deliveryVehicle.count({
          where: { agencyId, status: "ACTIVE" }
        })
      : Promise.resolve(0),
    // Cylinder products
    prisma.product.findMany({
      where: { agencyId, isCylinder: true, isActive: true }
    })
  ]);

  const activeTrips = todayTrips.filter((t) => t.tripStatus === "OUT_FOR_DELIVERY" || t.tripStatus === "LOADED");
  const completedTripsCount = todayTrips.filter((t) => t.tripStatus === "RETURNED").length;
  const pendingApprovalsCount = recentRecords.filter((r) => r.status === "PENDING").length;

  // ── Calculate Live Cylinder Stocks ──
  const cylinderStocks = products.map((p) => {
    let filledReceived = 0;
    let emptyReturnedToCompany = 0;
    let loadedOnVehicles = 0;
    let unsoldReturnedFromVehicles = 0;
    let emptyReturnedFromVehicles = 0;

    // 1. Sum company arrivals (GodownRecord)
    approvedGodownRecords.forEach((gr) => {
      if (gr.items && Array.isArray(gr.items)) {
        const item = (gr.items as any[]).find((it) => it.productId === p.id);
        if (item) {
          filledReceived += Number(item.filledReceived) || 0;
          emptyReturnedToCompany += Number(item.emptyReturned) || 0;
        }
      } else {
        // Fallback for legacy records without items array
        filledReceived += gr.filledCylindersReceived;
        emptyReturnedToCompany += gr.emptyCylindersReturned;
      }
    });

    // 2. Sum vehicle trip logs
    allTripLogs.forEach((trip) => {
      const isReturned = trip.tripStatus === "RETURNED" || trip.tripStatus === "PARTIAL_RETURN";
      if (trip.items && Array.isArray(trip.items)) {
        const item = (trip.items as any[]).find((it) => it.productId === p.id);
        if (item) {
          loadedOnVehicles += Number(item.loaded) || 0;
          if (isReturned) {
            unsoldReturnedFromVehicles += Number(item.unsoldReturned) || 0;
            emptyReturnedFromVehicles += Number(item.emptyReturned) || 0;
          }
        }
      } else {
        // Fallback for legacy trips
        loadedOnVehicles += trip.cylindersLoaded;
        if (isReturned) {
          unsoldReturnedFromVehicles += trip.cylindersReturned;
          emptyReturnedFromVehicles += trip.cylindersDelivered; // cylindersDelivered = empty returned in simple logic
        }
      }
    });

    const filledStock = Math.max(0, filledReceived - loadedOnVehicles + unsoldReturnedFromVehicles);
    const emptyStock = Math.max(0, emptyReturnedFromVehicles - emptyReturnedToCompany);

    return {
      id: p.id,
      name: p.name,
      filledStock,
      emptyStock,
      totalStock: filledStock + emptyStock,
    };
  });

  const TRIP_STATUS_STYLES: Record<string, { label: string; bg: string; text: string }> = {
    LOADED: { label: t("LOADED"), bg: "#EFF6FF", text: "#1D4ED8" },
    OUT_FOR_DELIVERY: { label: t("OUT_FOR_DELIVERY"), bg: "#FFFBEB", text: "#B45309" },
    RETURNED: { label: t("RETURNED"), bg: "#ECFDF5", text: "#047857" },
    PARTIAL_RETURN: { label: t("PARTIAL_RETURN"), bg: "#FEF2F2", text: "#B91C1C" },
  };

  return (
    <div className="space-y-6">
      {/* ── Control Centre Banner Header ── */}
      <div className="relative rounded-2xl overflow-hidden p-6 md:p-8 border border-zinc-200 bg-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-50/50 to-transparent rounded-full pointer-events-none" />
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">{t("operationsLive")}</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">{t("title")}</h1>
          <p className="text-[14px] text-zinc-500">
            {t("desc", { name: session.name })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 z-10">
          {hasGodown && (
            <Link
              href="/godown-keeper/godown"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-100 hover:shadow-lg transition-all"
            >
              <Warehouse className="w-4 h-4" /> {t("goToOperations")}
            </Link>
          )}
          {hasInventory && (
            <Link
              href="/godown-keeper/inventory"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-bold transition-colors"
            >
              <Boxes className="w-4 h-4" /> {t("officeStock")}
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-md">
        <PunchWidget />
      </div>

      {/* ── Live Metric Telemetry ── */}
      {hasGodown && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1 */}
          <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Truck className="w-4 h-4" />
            </div>
            <p className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wider">{t("companyArrivals")}</p>
            <p className="text-3xl font-extrabold text-zinc-900 mt-2">{todayCount}</p>
            <p className="text-[12px] text-zinc-500 mt-2 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {t("trucksLoggedToday")}
            </p>
          </div>

          {/* KPI 2 */}
          <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Navigation className="w-4 h-4" />
            </div>
            <p className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wider">{t("outForDelivery")}</p>
            <p className="text-3xl font-extrabold text-zinc-900 mt-2">{activeTrips.length}</p>
            <p className="text-[12px] text-zinc-500 mt-2 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-amber-500" /> {t("activeVehiclesOnRoute")}
            </p>
          </div>

          {/* KPI 3 */}
          <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <p className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wider">{t("tripsCompleted")}</p>
            <p className="text-3xl font-extrabold text-zinc-900 mt-2">{completedTripsCount}</p>
            <p className="text-[12px] text-zinc-500 mt-2 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-emerald-500" /> {t("vehiclesReturnedToGodown")}
            </p>
          </div>

          {/* KPI 4 */}
          <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Layers className="w-4 h-4" />
            </div>
            <p className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wider">{t("pendingApprovals")}</p>
            <p className="text-3xl font-extrabold text-zinc-900 mt-2">{pendingApprovalsCount}</p>
            <p className="text-[12px] text-zinc-500 mt-2 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-purple-500" /> {t("awaitingValidation")}
            </p>
          </div>
        </div>
      )}

      {/* ── Grid: Live Inventory + Actions ── */}
      {hasGodown ? (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Live Cylinder Stock Monitor & Fleet Trip Logs */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cylinder Stock Card */}
            <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                    <Warehouse className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold text-zinc-800">{t("liveInventory")}</h3>
                    <p className="text-[12px] text-zinc-400">{t("liveInventoryDesc")}</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold px-2 py-1 bg-blue-50 text-blue-600 rounded-full flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: "3s" }} /> {t("realtime")}
                </span>
              </div>

              <div className="p-6">
                {cylinderStocks.length === 0 ? (
                  <div className="text-center py-10 text-zinc-400 space-y-2">
                    <AlertCircle className="w-8 h-8 mx-auto text-zinc-300" />
                    <p className="text-xs italic">{t("noCylindersFound")}</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {cylinderStocks.map((stock) => {
                      const filledPercent = stock.totalStock > 0 ? (stock.filledStock / stock.totalStock) * 100 : 0;
                      return (
                        <div key={stock.id} className="p-4 rounded-xl border border-zinc-100 bg-zinc-50/50 space-y-3.5 hover:border-zinc-200 transition-colors">
                          <div className="flex justify-between items-start">
                            <span className="text-[13px] font-bold text-zinc-800 truncate">{stock.name}</span>
                            <span className="text-[11px] font-bold text-zinc-400 bg-white border border-zinc-100 px-2 py-0.5 rounded-md">
                              {t("total")}: {stock.totalStock}
                            </span>
                          </div>

                          {/* Progress display */}
                          <div className="space-y-1.5">
                            <div className="h-2 w-full bg-amber-100 rounded-full overflow-hidden flex">
                              <div className="h-full bg-blue-600 rounded-full" style={{ width: `${filledPercent}%` }} />
                            </div>
                            <div className="flex justify-between text-[11px] font-semibold">
                              <span className="text-blue-600 flex items-center gap-1">
                                {t("filled")}: <strong>{stock.filledStock}</strong>
                              </span>
                              <span className="text-amber-600 flex items-center gap-1">
                                {t("empty")}: <strong>{stock.emptyStock}</strong>
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* fleet trips today */}
            <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                    <Navigation className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold text-zinc-800">{t("todayFleetLogs")}</h3>
                    <p className="text-[12px] text-zinc-400">{t("fleetLogsDesc")}</p>
                  </div>
                </div>
                <Link href="/godown-keeper/godown" className="text-xs font-bold text-blue-600 hover:text-blue-500 flex items-center gap-0.5">
                  {t("recordLogs")} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-100">
                      <th className="px-6 py-3 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">{t("vehicle")}</th>
                      <th className="px-6 py-3 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">{t("deliveryAgent")}</th>
                      <th className="px-6 py-3 text-[11px] font-bold text-zinc-400 uppercase tracking-wider text-center">{t("cylindersLoaded")}</th>
                      <th className="px-6 py-3 text-[11px] font-bold text-zinc-400 uppercase tracking-wider text-center">{t("status")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {todayTrips.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-10 text-center text-xs text-zinc-400 italic">
                          {t("noFleetMovements")}
                        </td>
                      </tr>
                    ) : (
                      todayTrips.map((t) => {
                        const style = TRIP_STATUS_STYLES[t.tripStatus] || { label: t.tripStatus, bg: "#F4F4F5", text: "#71717A" };
                        return (
                          <tr key={t.id} className="hover:bg-zinc-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="min-w-0">
                                <p className="font-mono font-extrabold text-xs text-zinc-800">{t.vehicle.vehicleNo}</p>
                                <p className="text-[10px] text-zinc-400 truncate">{t.vehicle.vehicleName}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs font-semibold text-zinc-700">
                              {t.vehicle.assignedTo?.name ?? "—"}
                            </td>
                            <td className="px-6 py-4 text-center font-extrabold text-xs text-blue-600">
                              {t.cylindersLoaded}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span
                                className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold"
                                style={{ background: style.bg, color: style.text }}
                              >
                                {style.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Col: Recent Company Supply Logs */}
          <div className="space-y-6">
            <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold text-zinc-800">{t("recentArrivals")}</h3>
                    <p className="text-[12px] text-zinc-400">{t("recentArrivalsDesc")}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {recentRecords.length === 0 ? (
                  <p className="text-center py-6 text-xs text-zinc-400 italic">{t("noSupplyLogs")}</p>
                ) : (
                  recentRecords.map((r) => (
                    <div key={r.id} className="flex flex-col gap-2 p-3 rounded-xl border border-zinc-100 hover:border-zinc-200 transition-colors">
                      <div className="flex justify-between items-center">
                        <span className="font-mono font-bold text-xs text-zinc-800">{r.vehicleNo}</span>
                        <StatusBadge status={r.status} />
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-zinc-400 font-semibold">
                        <span>{t("inwardFilled")}: <strong className="text-blue-600">{r.filledCylindersReceived}</strong></span>
                        <span>{t("outwardEmpty")}: <strong className="text-amber-600">{r.emptyCylindersReturned}</strong></span>
                      </div>
                      <div className="text-[10px] text-zinc-400 border-t border-zinc-50 pt-1.5 flex justify-between">
                        <span>{t("loggedByMe")}</span>
                        <span>{formatDateTime(r.entryDate)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Operation Checklist */}
            <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-900 rounded-2xl p-6 text-white space-y-4 shadow-xl">
              <h4 className="text-xs font-extrabold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-400" /> {t("operationalChecklist")}
              </h4>
              <div className="space-y-3 text-xs">
                {[
                  { title: t("chk1Title"), desc: t("chk1Desc") },
                  { title: t("chk2Title"), desc: t("chk2Desc") },
                  { title: t("chk3Title"), desc: t("chk3Desc") },
                  { title: t("chk4Title"), desc: t("chk4Desc") }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-3 items-start">
                    <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-emerald-400">
                      {idx + 1}
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-bold text-zinc-200">{item.title}</p>
                      <p className="text-[11px] text-zinc-400 leading-normal">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-6 flex items-center gap-3.5 bg-zinc-50 border border-zinc-200 rounded-lg">
          <ShieldAlert className="w-5 h-5 text-zinc-400 flex-shrink-0" />
          <div className="text-[13px] text-zinc-500">
            You do not have access to godown keeper features. Please contact your agency administrator to update your role permissions.
          </div>
        </div>
      )}
    </div>
  );
}
