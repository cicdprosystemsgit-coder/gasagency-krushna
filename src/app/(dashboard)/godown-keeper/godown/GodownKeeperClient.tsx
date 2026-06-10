"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { formatDateTime } from "@/lib/utils";
import {
  Truck, ArrowDownToLine, ArrowUpFromLine, CheckCircle2, Package,
  LayoutDashboard, History, ChevronRight, Plus,
  AlertTriangle, Calendar, Boxes,
} from "lucide-react";
import { createGodownRecord } from "@/app/actions/godown";
import { createVehicleTripLog, updateTripStatus } from "@/app/actions/delivery-vehicles";
import { GodownInventoryTab } from "./GodownInventoryTab";

// ── Types ─────────────────────────────────────────────────────────────────────
interface GodownRecord {
  id: string; vehicleNo: string; entryDate: Date | string;
  filledCylindersReceived: number; emptyCylindersReturned: number;
  notes: string | null; status: string;
  items?: any;
}
interface TripLog {
  id: string; cylindersLoaded: number; cylindersReturned: number;
  cylindersDelivered: number; departureTime: Date | string | null;
  returnTime: Date | string | null; tripStatus: string; notes: string | null;
  date: Date | string;
  items?: any;
  vehicle: { vehicleNo: string; vehicleName: string; assignedTo: { name: string } | null };
}
interface InventoryMovement {
  id: string; date: Date | string; moveType: "RECEIVED" | "DISPATCHED";
  qty: number; batchNo: string | null; notes: string | null;
  product: { id: string; name: string };
  recordedBy: { name: string };
}
interface SimpleProduct { id: string; name: string; }
interface DeliveryVehicle {
  id: string; vehicleNo: string; vehicleName: string; vehicleType: string;
  status: string; assignedTo: { id: string; name: string } | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const TRIP_STYLE: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  LOADED:           { label: "Loaded",          bg: "#EFF6FF", color: "#1D4ED8", dot: "#2563EB" },
  OUT_FOR_DELIVERY: { label: "Out for Delivery", bg: "#FFFBEB", color: "#B45309", dot: "#D97706" },
  RETURNED:         { label: "Returned",         bg: "#F0FDF4", color: "#15803D", dot: "#16A34A" },
  PARTIAL_RETURN:   { label: "Partial Return",   bg: "#FAF5FF", color: "#6D28D9", dot: "#7C3AED" },
};

type Tab = "overview" | "stock-inward" | "fleet-dispatch" | "trip-history" | "inventory";

// Month names for display
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function fmtMonth(ym: string) {
  const [y, m] = ym.split("-");
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

// Group array by a string key
function groupBy<T>(arr: T[], key: (item: T) => string): { label: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  arr.forEach(item => {
    const k = key(item);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(item);
  });
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

const SERVICES: { id: Tab; icon: React.ElementType; label: string; sub: string }[] = [
  { id: "overview",       icon: LayoutDashboard, label: "Overview",       sub: "Monthly summary"        },
  { id: "stock-inward",   icon: ArrowDownToLine, label: "Stock Inward",   sub: "Cylinder arrivals"     },
  { id: "fleet-dispatch", icon: Truck,           label: "Fleet Dispatch", sub: "Today — send & return"  },
  { id: "trip-history",   icon: History,         label: "Trip History",   sub: "Monthly trips"         },
  { id: "inventory",      icon: Boxes,           label: "Inventory",      sub: "Products in & out"     },
];

// ── Shared helpers ─────────────────────────────────────────────────────────────
function TripBadge({ status }: { status: string }) {
  const s = TRIP_STYLE[status] ?? { label: status, bg: "#F4F4F5", color: "#52525B", dot: "#A1A1AA" };
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: s.bg, color: s.color }}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${status === "OUT_FOR_DELIVERY" ? "animate-pulse" : ""}`}
        style={{ background: s.dot }}
      />
      {s.label}
    </span>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div
      className="text-[13px] px-3 py-2.5 rounded-md"
      style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#B91C1C" }}
    >
      {msg}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>
      {children}
    </label>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function GodownKeeperClient({
  initialGodownRecords, initialTripLogs, initialTodayTrips,
  initialInventoryMovements, products, vehicles, userId,
}: {
  initialGodownRecords: GodownRecord[];
  initialTripLogs: TripLog[];
  initialTodayTrips: TripLog[];
  initialInventoryMovements: InventoryMovement[];
  products: SimpleProduct[];
  vehicles: DeliveryVehicle[];
  userId: string;
}) {
  const searchParams = useSearchParams();
  const validTabs: Tab[] = ["overview", "stock-inward", "fleet-dispatch", "trip-history", "inventory"];
  const urlTab = searchParams.get("tab") as Tab | null;
  const [tab, setTab] = useState<Tab>(urlTab && validTabs.includes(urlTab) ? urlTab : "overview");
  const [records, setRecords] = useState(initialGodownRecords);
  const [trips, setTrips] = useState(initialTripLogs);
  // Live today trips — used only by fleet dispatch panel
  const [todayTrips, setTodayTrips] = useState(initialTodayTrips);
  const [companyModal, setCompanyModal] = useState(false);
  const [dispatchModal, setDispatchModal] = useState(false);
  const [returnModal, setReturnModal] = useState<TripLog | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  // Month picker — default = current month (YYYY-MM)
  const currentMonth = new Date().toLocaleDateString("en-CA").slice(0, 7); // YYYY-MM
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const cylinderProducts = products.filter((p: any) => p.isCylinder);
  const [selectedCompanyProduct, setSelectedCompanyProduct] = useState("");
  const [selectedDispatchProduct, setSelectedDispatchProduct] = useState("");

  const [cForm, setCForm] = useState({
    vehicleNo: "", entryDate: new Date().toISOString().slice(0, 16), notes: "",
  });
  const [cItems, setCItems] = useState<Record<string, { filledReceived: string, emptyReturned: string }>>({});

  const [dForm, setDForm] = useState({
    vehicleId: "", departureTime: new Date().toISOString().slice(0, 16), notes: "",
  });
  const [dItems, setDItems] = useState<Record<string, string>>({});

  const [rForm, setRForm] = useState({
    returnTime: new Date().toISOString().slice(0, 16),
  });
  const [rItems, setRItems] = useState<Record<string, { unsoldReturned: string, emptyReturned: string }>>({});

  // Helper open functions
  const openCompanyArrival = () => {
    setError("");
    setCItems({});
    setSelectedCompanyProduct("");
    setCForm({
      vehicleNo: "", entryDate: new Date().toISOString().slice(0, 16), notes: ""
    });
    setCompanyModal(true);
  };

  const openDispatchModal = () => {
    setError("");
    setDItems({});
    setSelectedDispatchProduct("");
    setDForm({
      vehicleId: "", departureTime: new Date().toISOString().slice(0, 16), notes: ""
    });
    setDispatchModal(true);
  };

  // ── Month-based filtering ─────────────────────────────────────────────────
  // filteredRecords / filteredTrips = selected month, for history/stock inward tabs
  const filteredRecords = records.filter(r => {
    const d = new Date(r.entryDate).toLocaleDateString("en-CA");
    return d.slice(0, 7) === selectedMonth;
  });
  const filteredTrips = trips.filter(t => {
    const d = new Date(t.date).toLocaleDateString("en-CA");
    return d.slice(0, 7) === selectedMonth;
  });

  // Fleet dispatch panel always shows today's live state
  const activeTrips    = todayTrips.filter(t => t.tripStatus === "LOADED" || t.tripStatus === "OUT_FOR_DELIVERY");
  const completedTripsToday = todayTrips.filter(t => t.tripStatus === "RETURNED" || t.tripStatus === "PARTIAL_RETURN");

  // Monthly aggregates for KPIs & overview
  const completedTripsMonth = filteredTrips.filter(t => t.tripStatus === "RETURNED" || t.tripStatus === "PARTIAL_RETURN");
  const availableVehicles = vehicles.filter(v => v.status === "ACTIVE");

  const monthFilled = filteredRecords.reduce((a, r) => a + r.filledCylindersReceived, 0);
  const monthEmpty  = filteredRecords.reduce((a, r) => a + r.emptyCylindersReturned, 0);

  // ── Full cylinder stock (monthly) ────────────────────────────────────────
  const totalLoadedAll      = filteredTrips.reduce((a, t) => a + t.cylindersLoaded, 0);
  const totalUnsoldReturned = completedTripsMonth.reduce((a, t) => a + t.cylindersReturned, 0);
  const totalFullCylinders  = Math.max(0, monthFilled - totalLoadedAll + totalUnsoldReturned);

  // ── Empty cylinder stock (monthly) ───────────────────────────────────────
  const emptiesFromDeliveryBoys = completedTripsMonth.reduce((a, t) => a + t.cylindersDelivered, 0);
  const totalEmptyCylinders     = Math.max(0, emptiesFromDeliveryBoys - monthEmpty);

  const pendingCount = filteredRecords.filter(r => r.status === "PENDING").length;

  // ── Form handlers ─────────────────────────────────────────────────────────
  function submitCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!cForm.vehicleNo.trim()) { setError("Vehicle number required"); return; }
    
    const itemsList = Object.entries(cItems)
      .map(([productId, val]) => {
        const prod = products.find(p => p.id === productId);
        return {
          productId,
          productName: prod ? prod.name : "Cylinder",
          filledReceived: Number(val.filledReceived) || 0,
          emptyReturned: Number(val.emptyReturned) || 0,
        };
      })
      .filter(item => item.filledReceived > 0 || item.emptyReturned > 0);

    if (itemsList.length === 0) {
      setError("Please specify arrived or returned cylinders for at least one product type");
      return;
    }

    const fd = new FormData();
    fd.append("vehicleNo", cForm.vehicleNo);
    fd.append("entryDate", cForm.entryDate);
    fd.append("notes", cForm.notes);
    fd.append("items", JSON.stringify(itemsList));
    fd.append("submittedById", userId);

    startTransition(async () => {
      const res = await createGodownRecord(fd);
      if (res.error) { setError(res.error); return; }
      if (res.record) {
        setRecords(p => [res.record! as GodownRecord, ...p]);
        setCompanyModal(false);
        setError("");
      }
    });
  }

  function submitDispatch(e: React.FormEvent) {
    e.preventDefault();
    if (!dForm.vehicleId) { setError("Select a vehicle"); return; }

    const itemsList = Object.entries(dItems)
      .map(([productId, val]) => {
        const prod = products.find(p => p.id === productId);
        return {
          productId,
          productName: prod ? prod.name : "Cylinder",
          loaded: Number(val) || 0,
          unsoldReturned: 0,
          emptyReturned: 0,
        };
      })
      .filter(item => item.loaded > 0);

    if (itemsList.length === 0) {
      setError("Please load at least one cylinder type");
      return;
    }

    const fd = new FormData();
    fd.append("vehicleId", dForm.vehicleId);
    fd.append("departureTime", dForm.departureTime);
    fd.append("date", dForm.departureTime.slice(0, 10));
    fd.append("notes", dForm.notes);
    fd.append("items", JSON.stringify(itemsList));

    startTransition(async () => {
      const res = await createVehicleTripLog(fd);
      if (res.error) { setError(res.error); return; }
      if (res.tripLog) {
        const log = res.tripLog! as TripLog;
        setTrips(p => [log, ...p]);       // add to month history
        setTodayTrips(p => [log, ...p]); // add to live fleet panel
        setDispatchModal(false);
        setError("");
      }
    });
  }

  function submitReturn(e: React.FormEvent) {
    e.preventDefault();
    if (!returnModal) return;

    const itemsList = Object.entries(rItems)
      .map(([productId, val]) => {
        const prod = products.find(p => p.id === productId);
        const originalLoadedItem = Array.isArray(returnModal.items)
          ? returnModal.items.find((it: any) => it.productId === productId)
          : null;
        return {
          productId,
          productName: prod ? prod.name : "Cylinder",
          loaded: originalLoadedItem ? Number(originalLoadedItem.loaded) : (returnModal.cylindersLoaded || 0),
          unsoldReturned: Number(val.unsoldReturned) || 0,
          emptyReturned: Number(val.emptyReturned) || 0,
        };
      });

    const fd = new FormData();
    fd.append("tripStatus", "RETURNED");
    fd.append("returnTime", rForm.returnTime);
    fd.append("items", JSON.stringify(itemsList));

    startTransition(async () => {
      const res = await updateTripStatus(returnModal.id, fd);
      if (res.error) { setError(res.error); return; }
      if (res.tripLog) {
        const log = res.tripLog! as TripLog;
        setTrips(p => p.map(t => t.id === log.id ? log : t));           // update month history
        setTodayTrips(p => p.map(t => t.id === log.id ? log : t));      // update live fleet
        setReturnModal(null);
        setError("");
      }
    });
  }

  function openReturn(t: TripLog) {
    setReturnModal(t);
    const initialRItems: Record<string, { unsoldReturned: string, emptyReturned: string }> = {};
    if (t.items && Array.isArray(t.items)) {
      t.items.forEach((it: any) => {
        initialRItems[it.productId] = { unsoldReturned: "0", emptyReturned: "0" };
      });
    } else {
      // Legacy support: default all products
      products.forEach(p => {
        initialRItems[p.id] = { unsoldReturned: "0", emptyReturned: "0" };
      });
    }
    setRItems(initialRItems);
    setRForm({ returnTime: new Date().toISOString().slice(0, 16) });
    setError("");
  }


  return (
    <div className="space-y-4">

      {/* ── MONTH / YEAR PICKER ───────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "#fff", border: "1px solid #E4E4E7", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: "#2563EB" }} />
        <div className="flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#71717A" }}>Viewing Period</p>
          <p className="text-[14px] font-bold" style={{ color: "#18181B" }}>{fmtMonth(selectedMonth)}</p>
        </div>
        <input
          type="month"
          value={selectedMonth}
          max={currentMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="input"
          style={{ width: "auto", minWidth: 0, flex: "none" }}
        />
        {selectedMonth !== currentMonth && (
          <button
            onClick={() => setSelectedMonth(currentMonth)}
            className="text-[12px] font-medium px-2.5 py-1 rounded-lg flex-shrink-0"
            style={{ background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE" }}
          >
            This Month
          </button>
        )}
      </div>

      {/* ── TAB NAVIGATION ───────────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-1 p-1 rounded-xl" style={{ background: "#fff", border: "1px solid #E4E4E7" }}>
        {SERVICES.map(({ id, icon: Icon, label, sub }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-lg transition-all"
            style={tab === id
              ? { background: "#EFF6FF", color: "#1D4ED8" }
              : { background: "transparent", color: "#71717A" }
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="text-[11px] font-semibold leading-none">{label}</span>
            <span className="text-[10px] leading-none hidden lg:block" style={{ color: tab === id ? "#3B82F6" : "#A1A1AA" }}>{sub}</span>
          </button>
        ))}
      </div>

      {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
      <div>
        {tab === "overview" && (
          <OverviewTab
            records={filteredRecords}
            activeTrips={activeTrips}
            completedTripsToday={completedTripsToday}
            monthFilled={monthFilled}
            monthEmpty={monthEmpty}
            totalFullCylinders={totalFullCylinders}
            totalEmptyCylinders={totalEmptyCylinders}
            pendingCount={pendingCount}
            selectedMonth={selectedMonth}
            onGoStockInward={openCompanyArrival}
            onGoDispatch={openDispatchModal}
            onReturn={openReturn}
            onNavStockInward={() => setTab("stock-inward")}
            onNavFleet={() => setTab("fleet-dispatch")}
          />
        )}
        {tab === "stock-inward" && (
          <StockInwardTab
            records={filteredRecords}
            selectedMonth={selectedMonth}
            onAdd={openCompanyArrival}
          />
        )}
        {tab === "fleet-dispatch" && (
          <FleetDispatchTab
            activeTrips={activeTrips}
            completedTrips={completedTripsToday}
            onDispatch={openDispatchModal}
            onReturn={openReturn}
          />
        )}
        {tab === "trip-history" && (
          <TripHistoryTab trips={filteredTrips} selectedMonth={selectedMonth} />
        )}
        {tab === "inventory" && (
          <GodownInventoryTab
            initialMovements={initialInventoryMovements}
            products={products.filter((p: any) => !p.isCylinder)}
            userId={userId}
            selectedMonth={selectedMonth}
          />
        )}
      </div>

      {/* ── MODAL: Company Truck Arrival ─────────────────────────────── */}
      <Modal open={companyModal} onClose={() => setCompanyModal(false)} title="Record Company Truck Arrival">
        <form onSubmit={submitCompany} className="space-y-4">
          {error && <ErrorBanner msg={error} />}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Vehicle Number *</FieldLabel>
              <input
                value={cForm.vehicleNo}
                onChange={e => setCForm({ ...cForm, vehicleNo: e.target.value.toUpperCase() })}
                placeholder="MH12AB1234"
                className="input font-mono"
              />
            </div>
            <div>
              <FieldLabel>Date & Time *</FieldLabel>
              <input type="datetime-local" value={cForm.entryDate} onChange={e => setCForm({ ...cForm, entryDate: e.target.value })} className="input" />
            </div>
          </div>

          <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
            <FieldLabel>Cylinder Quantities (Arrived vs Returned) *</FieldLabel>
            {Object.keys(cItems).length === 0 ? (
              <p className="text-[12px] text-zinc-500 italic py-4 text-center">No products selected yet. Select a product below to add.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(cItems).map(([prodId, item]) => {
                  const p = cylinderProducts.find(x => x.id === prodId);
                  if (!p) return null;
                  return (
                    <div key={prodId} className="flex items-center justify-between p-2 rounded-lg border border-[#E4E4E7] bg-[#FAFAFA]">
                      <span className="text-[12px] font-semibold flex-1 text-[#18181B] truncate">{p.name}</span>
                      <div className="flex gap-2 items-center">
                        <div className="w-[85px]">
                          <input
                            type="number" min="0" placeholder="Filled In"
                            value={item.filledReceived}
                            onChange={e => setCItems({
                              ...cItems,
                              [prodId]: { ...item, filledReceived: e.target.value }
                            })}
                            className="input text-center text-xs font-semibold"
                            style={{ color: "#2563EB" }}
                          />
                        </div>
                        <div className="w-[85px]">
                          <input
                            type="number" min="0" placeholder="Empty Out"
                            value={item.emptyReturned}
                            onChange={e => setCItems({
                              ...cItems,
                              [prodId]: { ...item, emptyReturned: e.target.value }
                            })}
                            className="input text-center text-xs font-semibold"
                            style={{ color: "#D97706" }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const copy = { ...cItems };
                            delete copy[prodId];
                            setCItems(copy);
                          }}
                          title="Remove item"
                          className="w-7 h-7 rounded-lg flex items-center justify-center border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 font-bold text-sm"
                        >
                          &times;
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add Product Selector */}
          <div className="flex gap-2 items-center pt-2.5 border-t border-[#F4F4F5]">
            <select
              value={selectedCompanyProduct}
              onChange={e => setSelectedCompanyProduct(e.target.value)}
              className="input text-xs flex-1"
            >
              <option value="">Select a Cylinder to add…</option>
              {cylinderProducts
                .filter(p => !cItems[p.id])
                .map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
            </select>
            <button
              type="button"
              onClick={() => {
                if (!selectedCompanyProduct) return;
                setCItems({
                  ...cItems,
                  [selectedCompanyProduct]: { filledReceived: "", emptyReturned: "" }
                });
                setSelectedCompanyProduct("");
              }}
              disabled={!selectedCompanyProduct}
              className="px-3 py-2 text-xs font-bold rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50"
            >
              + Add Cylinder
            </button>
          </div>

          <div>
            <FieldLabel>Notes (optional)</FieldLabel>
            <textarea value={cForm.notes} onChange={e => setCForm({ ...cForm, notes: e.target.value })} rows={2} placeholder="Any remarks…" className="input resize-none" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setCompanyModal(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={isPending} className="btn btn-primary">{isPending ? "Saving…" : "Save Entry"}</button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: Dispatch Vehicle ───────────────────────────────────── */}
      <Modal open={dispatchModal} onClose={() => setDispatchModal(false)} title="Dispatch Delivery Vehicle">
        <form onSubmit={submitDispatch} className="space-y-4">
          {error && <ErrorBanner msg={error} />}
          <div>
            <FieldLabel>Select Vehicle *</FieldLabel>
            <select value={dForm.vehicleId} onChange={e => setDForm({ ...dForm, vehicleId: e.target.value })} className="input">
              <option value="">Choose vehicle…</option>
              {availableVehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.vehicleNo} — {v.vehicleName}{v.assignedTo ? ` (${v.assignedTo.name})` : " (Unassigned)"}
                </option>
              ))}
            </select>
            {availableVehicles.length === 0 && (
              <p className="text-[12px] mt-1.5" style={{ color: "#D97706" }}>⚠ No active vehicles found. Ask admin to add vehicles.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Departure Time</FieldLabel>
              <input type="datetime-local" value={dForm.departureTime} onChange={e => setDForm({ ...dForm, departureTime: e.target.value })} className="input" />
            </div>
          </div>

          <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
            <FieldLabel>Cylinders to Load *</FieldLabel>
            {Object.keys(dItems).length === 0 ? (
              <p className="text-[12px] text-zinc-500 italic py-4 text-center">No cylinders selected yet. Select a cylinder below to add.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(dItems).map(([prodId, qty]) => {
                  const p = cylinderProducts.find(x => x.id === prodId);
                  if (!p) return null;
                  return (
                    <div key={prodId} className="flex items-center justify-between p-2 rounded-lg border border-[#E4E4E7] bg-[#FAFAFA]">
                      <span className="text-[12px] font-semibold flex-1 text-[#18181B] truncate">{p.name}</span>
                      <div className="flex gap-2 items-center">
                        <div className="w-[100px]">
                          <input
                            type="number" min="0" placeholder="Qty loaded"
                            value={qty}
                            onChange={e => setDItems({
                              ...dItems,
                              [prodId]: e.target.value
                            })}
                            className="input text-center text-xs font-bold"
                            style={{ color: "#16A34A" }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const copy = { ...dItems };
                            delete copy[prodId];
                            setDItems(copy);
                          }}
                          title="Remove item"
                          className="w-7 h-7 rounded-lg flex items-center justify-center border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 font-bold text-sm"
                        >
                          &times;
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add Product Selector */}
          <div className="flex gap-2 items-center pt-2.5 border-t border-[#F4F4F5]">
            <select
              value={selectedDispatchProduct}
              onChange={e => setSelectedDispatchProduct(e.target.value)}
              className="input text-xs flex-1"
            >
              <option value="">Select a Cylinder to add…</option>
              {cylinderProducts
                .filter(p => !dItems[p.id])
                .map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
            </select>
            <button
              type="button"
              onClick={() => {
                if (!selectedDispatchProduct) return;
                setDItems({
                  ...dItems,
                  [selectedDispatchProduct]: ""
                });
                setSelectedDispatchProduct("");
              }}
              disabled={!selectedDispatchProduct}
              className="px-3 py-2 text-xs font-bold rounded-lg bg-green-50 text-green-600 hover:bg-green-100 disabled:opacity-50"
            >
              + Add Cylinder
            </button>
          </div>

          <div>
            <FieldLabel>Notes (optional)</FieldLabel>
            <textarea value={dForm.notes} onChange={e => setDForm({ ...dForm, notes: e.target.value })} rows={2} placeholder="Any remarks…" className="input resize-none" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDispatchModal(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={isPending} className="btn btn-primary">{isPending ? "Dispatching…" : "Dispatch Vehicle"}</button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: Mark Vehicle Return ────────────────────────────────── */}
      <Modal open={!!returnModal} onClose={() => setReturnModal(null)} title="Record Vehicle Return">
        <form onSubmit={submitReturn} className="space-y-4">
          {error && <ErrorBanner msg={error} />}
          {returnModal && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg" style={{ background: "#F0FDF4", border: "1px solid #86EFAC" }}>
              <Truck className="w-5 h-5 flex-shrink-0" style={{ color: "#16A34A" }} />
              <div>
                <p className="text-[13px] font-bold" style={{ color: "#15803D" }}>
                  {returnModal.vehicle.vehicleNo} · {returnModal.vehicle.vehicleName}
                </p>
                <p className="text-[12px]" style={{ color: "#22C55E" }}>
                  {returnModal.vehicle.assignedTo?.name ?? "Unassigned"}
                </p>
              </div>
            </div>
          )}
          <div>
            <FieldLabel>Return Time</FieldLabel>
            <input type="datetime-local" value={rForm.returnTime} onChange={e => setRForm({ ...rForm, returnTime: e.target.value })} className="input" />
          </div>

          <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
            <FieldLabel>Record Returns per Product *</FieldLabel>
            <div className="grid grid-cols-1 gap-2">
              {cylinderProducts.map(p => {
                // Find what was loaded in this trip log
                const loadedItem = Array.isArray(returnModal?.items)
                  ? returnModal.items.find((it: any) => it.productId === p.id)
                  : null;
                const loadedQty = loadedItem ? Number(loadedItem.loaded) : 0;
                
                // If it's a legacy trip log (items is empty) but total cylindersLoaded is set,
                // we show all products. If it is NOT a legacy trip log, we only show products that were loaded.
                if (Array.isArray(returnModal?.items) && !loadedItem) {
                  return null; // This product wasn't loaded on this trip
                }

                const item = rItems[p.id] || { unsoldReturned: "", emptyReturned: "" };
                return (
                  <div key={p.id} className="p-2.5 rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-[#18181B]">{p.name}</span>
                      <span className="text-[11px] font-medium text-[#71717A]">
                        Loaded: <strong style={{ color: "#2563EB" }}>{loadedQty || returnModal?.cylindersLoaded || 0}</strong>
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-[#A1A1AA] block mb-0.5">Unsold Full</span>
                        <input
                          type="number" min="0" placeholder="0"
                          value={item.unsoldReturned}
                          onChange={e => setRItems({
                            ...rItems,
                            [p.id]: { ...item, unsoldReturned: e.target.value }
                          })}
                          className="input text-center text-xs font-semibold"
                          style={{ color: "#D97706" }}
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-[#A1A1AA] block mb-0.5">Empty Returned</span>
                        <input
                          type="number" min="0" placeholder="0"
                          value={item.emptyReturned}
                          onChange={e => setRItems({
                            ...rItems,
                            [p.id]: { ...item, emptyReturned: e.target.value }
                          })}
                          className="input text-center text-xs font-semibold"
                          style={{ color: "#16A34A" }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setReturnModal(null)} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={isPending} className="btn btn-primary">{isPending ? "Saving…" : "Confirm Return"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ── Overview Tab ───────────────────────────────────────────────────────────────
function OverviewTab({
  records, activeTrips, completedTripsToday,
  monthFilled, monthEmpty, totalFullCylinders, totalEmptyCylinders, pendingCount,
  selectedMonth,
  onGoStockInward, onGoDispatch, onReturn, onNavStockInward, onNavFleet,
}: {
  records: GodownRecord[];
  activeTrips: TripLog[];
  completedTripsToday: TripLog[];
  monthFilled: number;
  monthEmpty: number;
  totalFullCylinders: number;
  totalEmptyCylinders: number;
  pendingCount: number;
  selectedMonth: string;
  onGoStockInward: () => void;
  onGoDispatch: () => void;
  onReturn: (t: TripLog) => void;
  onNavStockInward: () => void;
  onNavFleet: () => void;
}) {
  const kpis = [
    { label: "Filled Received",  value: monthFilled,                     sub: "cylinders from company",         color: "#2563EB", bg: "#EFF6FF", icon: Package },
    { label: "Sent to Company",  value: monthEmpty,                      sub: "empty cylinders returned out",   color: "#D97706", bg: "#FFFBEB", icon: ArrowUpFromLine },
    { label: "Full in Godown",   value: Math.max(0, totalFullCylinders), sub: "full cylinders in stock",       color: "#16A34A", bg: "#F0FDF4", icon: CheckCircle2 },
    { label: "Empty in Godown",  value: totalEmptyCylinders,            sub: "net empty stock",                color: "#7C3AED", bg: "#FAF5FF", icon: ArrowUpFromLine },
    { label: "Vehicles Out Now", value: activeTrips.length,             sub: "live — today",                   color: activeTrips.length > 0 ? "#D97706" : "#16A34A", bg: activeTrips.length > 0 ? "#FFFBEB" : "#F0FDF4", icon: Truck },
    { label: "Returned Today",   value: completedTripsToday.length,     sub: "completed trips today",          color: "#16A34A", bg: "#F0FDF4", icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-5">
      {/* Month badge */}
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4" style={{ color: "#2563EB" }} />
        <span className="text-[13px] font-semibold" style={{ color: "#18181B" }}>{fmtMonth(selectedMonth)}</span>
        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: "#EFF6FF", color: "#2563EB" }}>Monthly Summary</span>
      </div>
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {kpis.map(({ label, value, sub, color, bg, icon: Icon }) => (
          <div key={label} className="rounded-xl p-4" style={{ background: "#fff", border: "1px solid #E4E4E7", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "#71717A" }}>{label}</p>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: bg }}>
                <Icon className="w-3.5 h-3.5" style={{ color }} />
              </div>
            </div>
            <p className="text-[26px] font-bold leading-none mb-1" style={{ color }}>{value}</p>
            <p className="text-[11px]" style={{ color: "#A1A1AA" }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Action required banner */}
      {(pendingCount > 0 || activeTrips.length > 0) && (
        <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl" style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#D97706" }} />
          <div>
            <p className="text-[13px] font-semibold mb-1" style={{ color: "#92400E" }}>Action Required</p>
            {pendingCount > 0 && (
              <p className="text-[12px]" style={{ color: "#B45309" }}>
                {pendingCount} godown record{pendingCount > 1 ? "s" : ""} awaiting manager approval
              </p>
            )}
            {activeTrips.length > 0 && (
              <p className="text-[12px]" style={{ color: "#B45309" }}>
                {activeTrips.length} vehicle{activeTrips.length > 1 ? "s" : ""} still out — mark return when they arrive
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Quick actions */}
        <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #E4E4E7" }}>
          <div className="px-4 py-3.5" style={{ borderBottom: "1px solid #F4F4F5" }}>
            <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>Quick Actions</p>
            <p className="text-[11px] mt-0.5" style={{ color: "#A1A1AA" }}>Common operations for today</p>
          </div>
          <div className="p-4 space-y-2.5">
            <button
              onClick={onGoStockInward}
              className="w-full flex items-center gap-3 p-3 rounded-lg text-left transition-opacity hover:opacity-90"
              style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#2563EB" }}>
                <ArrowDownToLine className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold" style={{ color: "#1D4ED8" }}>Company Truck Arrived</p>
                <p className="text-[11px]" style={{ color: "#3B82F6" }}>Record cylinders received from company</p>
              </div>
              <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "#93C5FD" }} />
            </button>
            <button
              onClick={onGoDispatch}
              className="w-full flex items-center gap-3 p-3 rounded-lg text-left transition-opacity hover:opacity-90"
              style={{ background: "#F0FDF4", border: "1px solid #86EFAC" }}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#16A34A" }}>
                <ArrowUpFromLine className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold" style={{ color: "#15803D" }}>Send Delivery Vehicle</p>
                <p className="text-[11px]" style={{ color: "#22C55E" }}>Dispatch vehicle with loaded cylinders</p>
              </div>
              <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "#86EFAC" }} />
            </button>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={onNavStockInward}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors"
                style={{ background: "#F4F4F5", color: "#52525B" }}
              >
                <Package className="w-3.5 h-3.5" /> View all records
              </button>
              <button
                onClick={onNavFleet}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors"
                style={{ background: "#F4F4F5", color: "#52525B" }}
              >
                <Truck className="w-3.5 h-3.5" /> Manage fleet
              </button>
            </div>
          </div>
        </div>

        {/* Vehicles awaiting return */}
        <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #E4E4E7" }}>
          <div className="flex items-center gap-2 px-4 py-3.5" style={{ borderBottom: "1px solid #F4F4F5" }}>
            <div
              className={`w-2 h-2 rounded-full flex-shrink-0 ${activeTrips.length > 0 ? "animate-pulse" : ""}`}
              style={{ background: activeTrips.length > 0 ? "#D97706" : "#16A34A" }}
            />
            <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>
              Active Vehicles ({activeTrips.length})
            </p>
          </div>
          {activeTrips.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2" style={{ color: "#D1FAE5" }} />
              <p className="text-[13px] font-medium" style={{ color: "#71717A" }}>All vehicles are back</p>
              <p className="text-[11px] mt-1" style={{ color: "#A1A1AA" }}>No vehicles currently out for delivery</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F4F4F5]">
              {activeTrips.map(t => (
                <div key={t.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono font-bold text-[13px]" style={{ color: "#18181B" }}>{t.vehicle.vehicleNo}</span>
                      <TripBadge status={t.tripStatus} />
                    </div>
                    <p className="text-[11px]" style={{ color: "#A1A1AA" }}>
                      {t.vehicle.assignedTo?.name ?? "Unassigned"} · {t.cylindersLoaded} cyl. loaded
                    </p>
                  </div>
                  <button
                    onClick={() => onReturn(t)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors flex-shrink-0"
                    style={{ background: "#F0FDF4", border: "1px solid #86EFAC", color: "#15803D" }}
                  >
                    <CheckCircle2 className="w-3 h-3" /> Return
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent arrivals preview */}
      {records.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #E4E4E7" }}>
          <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: "1px solid #F4F4F5" }}>
            <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>Recent Stock Arrivals</p>
            <button onClick={onNavStockInward} className="text-[12px] font-medium" style={{ color: "#2563EB" }}>
              View all →
            </button>
          </div>
          <div className="divide-y divide-[#F4F4F5]">
            {records.slice(0, 4).map(r => (
              <div key={r.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="font-mono font-bold text-[13px]" style={{ color: "#18181B" }}>{r.vehicleNo}</span>
                  <p className="text-[11px]" style={{ color: "#A1A1AA" }}>{formatDateTime(r.entryDate)}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[14px] font-bold" style={{ color: "#2563EB" }}>{r.filledCylindersReceived}</p>
                    <p className="text-[10px]" style={{ color: "#A1A1AA" }}>filled in</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[14px] font-bold" style={{ color: "#D97706" }}>{r.emptyCylindersReturned}</p>
                    <p className="text-[10px]" style={{ color: "#A1A1AA" }}>empty out</p>
                  </div>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: r.status === "APPROVED" ? "#F0FDF4" : "#FFFBEB",
                      color: r.status === "APPROVED" ? "#15803D" : "#B45309",
                    }}
                  >
                    {r.status === "APPROVED" ? "✓ Approved" : "⏳ Pending"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Stock Inward Tab ───────────────────────────────────────────────────────────
function StockInwardTab({ records, selectedMonth, onAdd }: { records: GodownRecord[]; selectedMonth: string; onAdd: () => void }) {
  const totalFilled  = records.reduce((a, r) => a + r.filledCylindersReceived, 0);
  const totalEmpty   = records.reduce((a, r) => a + r.emptyCylindersReturned, 0);
  const pendingCount = records.filter(r => r.status === "PENDING").length;
  // Group by day within the selected month
  const byDay = groupBy(records, r => new Date(r.entryDate).toLocaleDateString("en-CA"));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-semibold" style={{ color: "#18181B" }}>Stock Inward — {fmtMonth(selectedMonth)}</h2>
          <p className="text-[12px] mt-0.5" style={{ color: "#71717A" }}>Company truck arrivals grouped by day</p>
        </div>
        <button onClick={onAdd} className="btn btn-primary">
          <Plus className="w-3.5 h-3.5" /> Record Arrival
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl p-3.5" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
          <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#1D4ED8" }}>Total Filled In</p>
          <p className="text-[22px] font-bold leading-none mb-0.5" style={{ color: "#2563EB" }}>{totalFilled}</p>
          <p className="text-[10px]" style={{ color: "#3B82F6" }}>cylinders received</p>
        </div>
        <div className="rounded-xl p-3.5" style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
          <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#B45309" }}>Total Empty Out</p>
          <p className="text-[22px] font-bold leading-none mb-0.5" style={{ color: "#D97706" }}>{totalEmpty}</p>
          <p className="text-[10px]" style={{ color: "#F59E0B" }}>cylinders returned</p>
        </div>
        <div
          className="rounded-xl p-3.5"
          style={{
            background: pendingCount > 0 ? "#FEF2F2" : "#F0FDF4",
            border: `1px solid ${pendingCount > 0 ? "#FECACA" : "#86EFAC"}`,
          }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: pendingCount > 0 ? "#B91C1C" : "#15803D" }}>
            Pending Approval
          </p>
          <p className="text-[22px] font-bold leading-none mb-0.5" style={{ color: pendingCount > 0 ? "#DC2626" : "#16A34A" }}>
            {pendingCount}
          </p>
          <p className="text-[10px]" style={{ color: pendingCount > 0 ? "#EF4444" : "#22C55E" }}>
            {pendingCount > 0 ? "awaiting review" : "all approved"}
          </p>
        </div>
      </div>

      {/* Day-grouped records */}
      {records.length === 0 ? (
        <div className="rounded-xl py-16 text-center" style={{ background: "#fff", border: "1px solid #E4E4E7" }}>
          <Package className="w-8 h-8 mx-auto mb-2" style={{ color: "#E4E4E7" }} />
          <p className="text-[13px] font-medium" style={{ color: "#71717A" }}>No arrivals for this month</p>
          <p className="text-[12px] mt-1" style={{ color: "#A1A1AA" }}>Click "Record Arrival" when a company truck comes in</p>
        </div>
      ) : (
        <div className="space-y-3">
          {byDay.map(({ label: day, items }) => {
            const dayFilled = items.reduce((a, r) => a + r.filledCylindersReceived, 0);
            const dayEmpty  = items.reduce((a, r) => a + r.emptyCylindersReturned, 0);
            const dayDate   = new Date(day + "T00:00:00");
            const dayLabel  = dayDate.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
            return (
              <div key={day} className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #E4E4E7" }}>
                {/* Day header */}
                <div className="flex items-center justify-between px-4 py-2.5" style={{ background: "#FAFAFA", borderBottom: "1px solid #F4F4F5" }}>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" style={{ color: "#2563EB" }} />
                    <span className="text-[12px] font-bold" style={{ color: "#18181B" }}>{dayLabel}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "#EFF6FF", color: "#2563EB" }}>{items.length} arrival{items.length > 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span style={{ color: "#2563EB" }}>↓ {dayFilled} filled</span>
                    <span style={{ color: "#D97706" }}>↑ {dayEmpty} empty</span>
                  </div>
                </div>
                {/* Rows */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: "1px solid #F4F4F5" }}>
                        {["Vehicle No.", "Time", "Filled In", "Empty Out", "Notes", "Status"].map(h => (
                          <th key={h} className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#A1A1AA" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((r, i) => (
                        <tr key={r.id} style={{ borderBottom: i < items.length - 1 ? "1px solid #F4F4F5" : "none" }}>
                          <td className="px-4 py-2.5"><span className="font-mono font-bold text-[13px]" style={{ color: "#18181B" }}>{r.vehicleNo}</span></td>
                          <td className="px-4 py-2.5 text-[12px]" style={{ color: "#71717A" }}>
                            {new Date(r.entryDate).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="font-bold text-[15px]" style={{ color: "#2563EB" }}>{r.filledCylindersReceived}</span>
                            {r.items && Array.isArray(r.items) && (
                              <div className="text-[10px] mt-0.5 space-y-0.5 font-medium" style={{ color: "#2563EB" }}>
                                {r.items.map((it: any) => it.filledReceived > 0 ? (
                                  <p key={it.productId} className="leading-tight">{it.productName || 'Cylinder'}: <strong>{it.filledReceived}</strong></p>
                                ) : null)}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="font-bold text-[15px]" style={{ color: "#D97706" }}>{r.emptyCylindersReturned}</span>
                            {r.items && Array.isArray(r.items) && (
                              <div className="text-[10px] mt-0.5 space-y-0.5 font-medium" style={{ color: "#D97706" }}>
                                {r.items.map((it: any) => it.emptyReturned > 0 ? (
                                  <p key={it.productId} className="leading-tight">{it.productName || 'Cylinder'}: <strong>{it.emptyReturned}</strong></p>
                                ) : null)}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-[12px]" style={{ color: "#71717A" }}>{r.notes ?? "—"}</td>
                          <td className="px-4 py-2.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                              style={{ background: r.status === "APPROVED" ? "#F0FDF4" : "#FFFBEB", color: r.status === "APPROVED" ? "#15803D" : "#B45309" }}>
                              {r.status === "APPROVED" ? "✓ Approved" : "⏳ Pending"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Fleet Dispatch Tab ─────────────────────────────────────────────────────────
function FleetDispatchTab({
  activeTrips, completedTrips, onDispatch, onReturn,
}: {
  activeTrips: TripLog[];
  completedTrips: TripLog[];
  onDispatch: () => void;
  onReturn: (t: TripLog) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-semibold" style={{ color: "#18181B" }}>Fleet Dispatch</h2>
          <p className="text-[12px] mt-0.5" style={{ color: "#71717A" }}>Dispatch delivery vehicles and record their returns</p>
        </div>
        <button onClick={onDispatch} className="btn btn-primary">
          <ArrowUpFromLine className="w-3.5 h-3.5" /> Dispatch Vehicle
        </button>
      </div>

      {/* Vehicles out — need return */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #E4E4E7" }}>
        <div className="flex items-center gap-2 px-4 py-3.5" style={{ borderBottom: "1px solid #F4F4F5" }}>
          <div
            className={`w-2 h-2 rounded-full flex-shrink-0 ${activeTrips.length > 0 ? "animate-pulse" : ""}`}
            style={{ background: activeTrips.length > 0 ? "#D97706" : "#A1A1AA" }}
          />
          <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>
            Vehicles Out — Awaiting Return ({activeTrips.length})
          </p>
        </div>
        {activeTrips.length === 0 ? (
          <div className="py-12 text-center">
            <Truck className="w-8 h-8 mx-auto mb-2" style={{ color: "#E4E4E7" }} />
            <p className="text-[13px] font-medium" style={{ color: "#71717A" }}>All vehicles are back</p>
            <p className="text-[11px] mt-1" style={{ color: "#A1A1AA" }}>Dispatch a vehicle to see it here</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F4F4F5]">
            {activeTrips.map(t => (
              <div key={t.id} className="flex items-center justify-between px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#FFFBEB" }}>
                    <Truck className="w-5 h-5" style={{ color: "#D97706" }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono font-bold text-[14px]" style={{ color: "#18181B" }}>{t.vehicle.vehicleNo}</span>
                      <TripBadge status={t.tripStatus} />
                    </div>
                    <p className="text-[12px]" style={{ color: "#71717A" }}>
                      {t.vehicle.vehicleName} · {t.vehicle.assignedTo?.name ?? "Unassigned"}
                    </p>
                    <p className="text-[11px]" style={{ color: "#A1A1AA" }}>
                      Loaded: <strong style={{ color: "#2563EB" }}>{t.cylindersLoaded}</strong>
                      {t.departureTime && <> · Departed: {formatDateTime(t.departureTime)}</>}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onReturn(t)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold flex-shrink-0 transition-colors"
                  style={{ background: "#F0FDF4", border: "1px solid #86EFAC", color: "#15803D" }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Mark Return
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed trips today */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #E4E4E7" }}>
        <div className="flex items-center gap-2 px-4 py-3.5" style={{ borderBottom: "1px solid #F4F4F5" }}>
          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#16A34A" }} />
          <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>
            Returned Today ({completedTrips.length})
          </p>
        </div>
        {completedTrips.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-[12px]" style={{ color: "#A1A1AA" }}>No vehicles returned yet today</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F4F4F5]">
            {completedTrips.map(t => (
              <div key={t.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono font-bold text-[13px]" style={{ color: "#18181B" }}>{t.vehicle.vehicleNo}</span>
                    <TripBadge status={t.tripStatus} />
                  </div>
                  <p className="text-[11px]" style={{ color: "#A1A1AA" }}>
                    {t.vehicle.assignedTo?.name ?? "—"} · Loaded: {t.cylindersLoaded} · Delivered: {t.cylindersDelivered} · Back: {t.cylindersReturned}
                  </p>
                </div>
                {t.returnTime && (
                  <p className="text-[11px] flex-shrink-0" style={{ color: "#71717A" }}>{formatDateTime(t.returnTime)}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Trip History Tab ───────────────────────────────────────────────────────────
function TripHistoryTab({ trips, selectedMonth }: { trips: TripLog[]; selectedMonth: string }) {
  const completedTrips        = trips.filter(t => t.tripStatus === "RETURNED" || t.tripStatus === "PARTIAL_RETURN");
  const totalLoaded           = trips.reduce((a, t) => a + t.cylindersLoaded, 0);
  const totalEmptiesCollected = completedTrips.reduce((a, t) => a + t.cylindersDelivered, 0);
  const totalUnsoldBack       = completedTrips.reduce((a, t) => a + t.cylindersReturned, 0);
  // Group trips by day
  const byDay = groupBy(trips, t => new Date(t.date).toLocaleDateString("en-CA"));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[16px] font-semibold" style={{ color: "#18181B" }}>Trip History — {fmtMonth(selectedMonth)}</h2>
        <p className="text-[12px] mt-0.5" style={{ color: "#71717A" }}>All vehicle trips grouped by day</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-xl p-3.5" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
          <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#1D4ED8" }}>Total Trips</p>
          <p className="text-[22px] font-bold leading-none" style={{ color: "#2563EB" }}>{trips.length}</p>
        </div>
        <div className="rounded-xl p-3.5" style={{ background: "#F0FDF4", border: "1px solid #86EFAC" }}>
          <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#15803D" }}>Total Loaded</p>
          <p className="text-[22px] font-bold leading-none" style={{ color: "#16A34A" }}>{totalLoaded}</p>
        </div>
        <div className="rounded-xl p-3.5" style={{ background: "#FAF5FF", border: "1px solid #DDD6FE" }}>
          <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#6D28D9" }}>Empties Collected</p>
          <p className="text-[22px] font-bold leading-none" style={{ color: "#7C3AED" }}>{totalEmptiesCollected}</p>
          <p className="text-[10px] mt-0.5" style={{ color: "#A78BFA" }}>from customers</p>
        </div>
        <div className="rounded-xl p-3.5" style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
          <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#B45309" }}>Unsold Returned</p>
          <p className="text-[22px] font-bold leading-none" style={{ color: "#D97706" }}>{totalUnsoldBack}</p>
          <p className="text-[10px] mt-0.5" style={{ color: "#F59E0B" }}>full cyls. back</p>
        </div>
      </div>

      {/* Day-grouped trips */}
      {trips.length === 0 ? (
        <div className="rounded-xl py-16 text-center" style={{ background: "#fff", border: "1px solid #E4E4E7" }}>
          <History className="w-8 h-8 mx-auto mb-2" style={{ color: "#E4E4E7" }} />
          <p className="text-[13px] font-medium" style={{ color: "#71717A" }}>No trips recorded for this month</p>
        </div>
      ) : (
        <div className="space-y-3">
          {byDay.map(({ label: day, items }) => {
            const dayLoaded   = items.reduce((a, t) => a + t.cylindersLoaded, 0);
            const dayEmpties  = items.filter(t => t.tripStatus === "RETURNED" || t.tripStatus === "PARTIAL_RETURN").reduce((a, t) => a + t.cylindersDelivered, 0);
            const dayDate     = new Date(day + "T00:00:00");
            const dayLabel    = dayDate.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
            return (
              <div key={day} className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #E4E4E7" }}>
                <div className="flex items-center justify-between px-4 py-2.5" style={{ background: "#FAFAFA", borderBottom: "1px solid #F4F4F5" }}>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" style={{ color: "#7C3AED" }} />
                    <span className="text-[12px] font-bold" style={{ color: "#18181B" }}>{dayLabel}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "#FAF5FF", color: "#7C3AED" }}>{items.length} trip{items.length > 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span style={{ color: "#2563EB" }}>Loaded: {dayLoaded}</span>
                    <span style={{ color: "#7C3AED" }}>Empties: {dayEmpties}</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: "1px solid #F4F4F5" }}>
                        {["Vehicle", "Driver", "Loaded", "Empties", "Unsold", "Departure", "Return", "Status"].map(h => (
                          <th key={h} className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#A1A1AA" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((t, i) => (
                        <tr key={t.id} style={{ borderBottom: i < items.length - 1 ? "1px solid #F4F4F5" : "none" }}>
                          <td className="px-4 py-2.5">
                            <p className="font-mono font-bold text-[12px]" style={{ color: "#18181B" }}>{t.vehicle.vehicleNo}</p>
                            <p className="text-[10px]" style={{ color: "#A1A1AA" }}>{t.vehicle.vehicleName}</p>
                          </td>
                          <td className="px-4 py-2.5 text-[12px]" style={{ color: "#52525B" }}>{t.vehicle.assignedTo?.name ?? "—"}</td>
                          <td className="px-4 py-2.5">
                            <p className="font-bold text-[14px]" style={{ color: "#2563EB" }}>{t.cylindersLoaded}</p>
                            {t.items && Array.isArray(t.items) && (
                              <div className="text-[9px] mt-0.5 space-y-0.5 font-medium" style={{ color: "#2563EB" }}>
                                {t.items.map((it: any) => it.loaded > 0 ? (
                                  <p key={it.productId} className="leading-tight">{it.productName || 'Cyl'}: <strong>{it.loaded}</strong></p>
                                ) : null)}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <p className="font-bold text-[14px]" style={{ color: "#7C3AED" }}>{t.cylindersDelivered || <span style={{ color: "#A1A1AA" }}>—</span>}</p>
                            {t.items && Array.isArray(t.items) && t.cylindersDelivered > 0 && (
                              <div className="text-[9px] mt-0.5 space-y-0.5 font-medium" style={{ color: "#7C3AED" }}>
                                {t.items.map((it: any) => it.emptyReturned > 0 ? (
                                  <p key={it.productId} className="leading-tight">{it.productName || 'Cyl'}: <strong>{it.emptyReturned}</strong></p>
                                ) : null)}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <p className="font-bold text-[14px]" style={{ color: "#D97706" }}>{t.cylindersReturned || <span style={{ color: "#A1A1AA" }}>—</span>}</p>
                            {t.items && Array.isArray(t.items) && t.cylindersReturned > 0 && (
                              <div className="text-[9px] mt-0.5 space-y-0.5 font-medium" style={{ color: "#D97706" }}>
                                {t.items.map((it: any) => it.unsoldReturned > 0 ? (
                                  <p key={it.productId} className="leading-tight">{it.productName || 'Cyl'}: <strong>{it.unsoldReturned}</strong></p>
                                ) : null)}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-[11px]" style={{ color: "#71717A" }}>{t.departureTime ? new Date(t.departureTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                          <td className="px-4 py-2.5 text-[11px]" style={{ color: "#71717A" }}>{t.returnTime ? new Date(t.returnTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                          <td className="px-4 py-2.5"><TripBadge status={t.tripStatus} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
