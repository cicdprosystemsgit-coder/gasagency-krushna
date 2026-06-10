"use client";

import { useState, useTransition, useMemo } from "react";
import {
  Truck, Plus, Edit2, Trash2, X, Check, Eye, Car,
  Search, Filter, RefreshCw, AlertTriangle, Users,
  MapPin, Clock, Package, BarChart3, CheckCircle2,
  XCircle, Wrench, Activity, TrendingUp, Calendar,
  ChevronRight, Info,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import {
  createDeliveryVehicle,
  updateDeliveryVehicle,
  deleteDeliveryVehicle,
  createVehicleTripLog,
  updateTripStatus,
} from "@/app/actions/delivery-vehicles";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Vehicle {
  id: string;
  vehicleNo: string;
  vehicleName: string;
  vehicleType: string;
  status: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
  assignedToId: string | null;
  assignedTo: { id: string; name: string; role: string } | null;
  notes: string | null;
  agencyId: string;
  createdAt: string;
  tripLogs?: TripLog[];
}

export interface TripLog {
  id: string;
  vehicleId: string;
  vehicle?: { vehicleNo: string; vehicleName: string; assignedTo?: { name: string } | null };
  date: string;
  cylindersLoaded: number;
  cylindersDelivered: number;
  cylindersReturned: number;
  departureTime: string | null;
  returnTime: string | null;
  tripStatus: "LOADED" | "OUT_FOR_DELIVERY" | "RETURNED" | "PARTIAL_RETURN";
  notes: string | null;
  recordedById: string;
  recordedBy?: { name: string } | null;
  createdAt: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  assignedVehicle?: { id: string; vehicleNo: string; vehicleName: string } | null;
}

interface Props {
  initialVehicles: Vehicle[];
  initialTripLogs: TripLog[];
  employees: Employee[];
  isAdmin: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const VEHICLE_TYPES = ["Two-Wheeler", "Three-Wheeler", "Four-Wheeler"];

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  ACTIVE: { label: "Active", color: "#15803D", bg: "#F0FDF4", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  MAINTENANCE: { label: "Maintenance", color: "#B45309", bg: "#FFFBEB", icon: <Wrench className="w-3.5 h-3.5" /> },
  INACTIVE: { label: "Inactive", color: "#6B7280", bg: "#F3F4F6", icon: <XCircle className="w-3.5 h-3.5" /> },
};

const TRIP_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  LOADED: { label: "Loaded", color: "#1D4ED8", bg: "#EFF6FF" },
  OUT_FOR_DELIVERY: { label: "Out for Delivery", color: "#D97706", bg: "#FFFBEB" },
  RETURNED: { label: "Returned", color: "#15803D", bg: "#F0FDF4" },
  PARTIAL_RETURN: { label: "Partial Return", color: "#7C3AED", bg: "#F5F3FF" },
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin", MANAGER: "Manager", GODOWN_KEEPER: "Godown Keeper",
  STAFF: "Staff", DELIVERY_BOY: "Delivery Boy",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtTime(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}
function fmtDateTime(d: string) {
  return new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function isToday(d: string) {
  const today = new Date();
  const date = new Date(d);
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
}

function nowLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: color + "22" }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 leading-tight">{label}</p>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
        active ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.INACTIVE;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ color: meta.color, background: meta.bg }}>
      {meta.icon}{meta.label}
    </span>
  );
}

function TripStatusBadge({ status }: { status: string }) {
  const meta = TRIP_STATUS_META[status] ?? { label: status, color: "#6B7280", bg: "#F3F4F6" };
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ color: meta.color, background: meta.bg }}>
      {meta.label}
    </span>
  );
}

function VehicleTypeIcon({ type }: { type: string }) {
  if (type === "Four-Wheeler") return <Car className="w-4 h-4" />;
  if (type === "Three-Wheeler") return <Truck className="w-4 h-4" />;
  return <Activity className="w-4 h-4" />;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function VehicleManagementClient({ initialVehicles, initialTripLogs, employees, isAdmin }: Props) {
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [tripLogs, setTripLogs] = useState<TripLog[]>(initialTripLogs);
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"fleet" | "trips" | "assignments">("fleet");

  // Fleet filters
  const [fleetSearch, setFleetSearch] = useState("");
  const [fleetStatusFilter, setFleetStatusFilter] = useState("ALL");
  const [fleetTypeFilter, setFleetTypeFilter] = useState("ALL");

  // Trip filters
  const [tripVehicleFilter, setTripVehicleFilter] = useState("ALL");
  const [tripStatusFilter, setTripStatusFilter] = useState("ALL");
  const [tripDateFrom, setTripDateFrom] = useState("");
  const [tripDateTo, setTripDateTo] = useState("");

  // Modals
  const [addModal, setAddModal] = useState(false);
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);
  const [deleteVehicle, setDeleteVehicle] = useState<Vehicle | null>(null);
  const [viewVehicle, setViewVehicle] = useState<Vehicle | null>(null);
  const [assignVehicle, setAssignVehicle] = useState<Vehicle | null>(null);
  const [recordTripVehicle, setRecordTripVehicle] = useState<Vehicle | null>(null);
  const [updateTrip, setUpdateTrip] = useState<TripLog | null>(null);

  // Form state
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // Add/Edit vehicle form
  const [fVehicleNo, setFVehicleNo] = useState("");
  const [fVehicleName, setFVehicleName] = useState("");
  const [fVehicleType, setFVehicleType] = useState("Two-Wheeler");
  const [fStatus, setFStatus] = useState<"ACTIVE" | "INACTIVE" | "MAINTENANCE">("ACTIVE");
  const [fAssignedTo, setFAssignedTo] = useState("");
  const [fNotes, setFNotes] = useState("");

  // Trip form
  const [tDate, setTDate] = useState(new Date().toISOString().split("T")[0]);
  const [tDeparture, setTDeparture] = useState(nowLocal());
  const [tCylinders, setTCylinders] = useState("");
  const [tNotes, setTNotes] = useState("");

  // Update trip form
  const [uTripStatus, setUTripStatus] = useState<TripLog["tripStatus"]>("RETURNED");
  const [uReturnTime, setUReturnTime] = useState(nowLocal());
  const [uCylindersDelivered, setUCylindersDelivered] = useState("");
  const [uCylindersReturned, setUCylindersReturned] = useState("");

  // Assign form
  const [assignToId, setAssignToId] = useState("");

  // ── Computed stats ──────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const today = tripLogs.filter(t => isToday(t.date));
    return {
      total: vehicles.length,
      active: vehicles.filter(v => v.status === "ACTIVE").length,
      maintenance: vehicles.filter(v => v.status === "MAINTENANCE").length,
      inactive: vehicles.filter(v => v.status === "INACTIVE").length,
      assigned: vehicles.filter(v => v.assignedToId).length,
      tripsToday: today.length,
      outForDelivery: today.filter(t => t.tripStatus === "OUT_FOR_DELIVERY").length,
      cylindersToday: today.reduce((s, t) => s + t.cylindersLoaded, 0),
    };
  }, [vehicles, tripLogs]);

  // ── Filtered fleet ──────────────────────────────────────────────────────────

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      if (fleetStatusFilter !== "ALL" && v.status !== fleetStatusFilter) return false;
      if (fleetTypeFilter !== "ALL" && v.vehicleType !== fleetTypeFilter) return false;
      if (fleetSearch) {
        const q = fleetSearch.toLowerCase();
        if (!v.vehicleNo.toLowerCase().includes(q) &&
          !v.vehicleName.toLowerCase().includes(q) &&
          !(v.assignedTo?.name.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [vehicles, fleetSearch, fleetStatusFilter, fleetTypeFilter]);

  // ── Filtered trips ──────────────────────────────────────────────────────────

  const filteredTrips = useMemo(() => {
    return tripLogs.filter(t => {
      if (tripVehicleFilter !== "ALL" && t.vehicleId !== tripVehicleFilter) return false;
      if (tripStatusFilter !== "ALL" && t.tripStatus !== tripStatusFilter) return false;
      if (tripDateFrom && new Date(t.date) < new Date(tripDateFrom)) return false;
      if (tripDateTo && new Date(t.date) > new Date(tripDateTo + "T23:59:59")) return false;
      return true;
    });
  }, [tripLogs, tripVehicleFilter, tripStatusFilter, tripDateFrom, tripDateTo]);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function openAddModal() {
    setFVehicleNo(""); setFVehicleName(""); setFVehicleType("Two-Wheeler");
    setFStatus("ACTIVE"); setFAssignedTo(""); setFNotes("");
    setFormError(""); setAddModal(true);
  }

  function openEditModal(v: Vehicle) {
    setFVehicleNo(v.vehicleNo); setFVehicleName(v.vehicleName);
    setFVehicleType(v.vehicleType); setFStatus(v.status);
    setFAssignedTo(v.assignedToId ?? ""); setFNotes(v.notes ?? "");
    setFormError(""); setEditVehicle(v);
  }

  function openAssignModal(v: Vehicle) {
    setAssignToId(v.assignedToId ?? "");
    setFormError(""); setAssignVehicle(v);
  }

  function openRecordTrip(v: Vehicle) {
    setTDate(new Date().toISOString().split("T")[0]);
    setTDeparture(nowLocal()); setTCylinders(""); setTNotes("");
    setFormError(""); setRecordTripVehicle(v);
  }

  function openUpdateTrip(t: TripLog) {
    setUTripStatus("RETURNED"); setUReturnTime(nowLocal());
    setUCylindersDelivered(""); setUCylindersReturned("");
    setFormError(""); setUpdateTrip(t);
  }

  // ── Actions ─────────────────────────────────────────────────────────────────

  async function handleAddVehicle(e: React.FormEvent) {
    e.preventDefault();
    setFormError(""); setFormLoading(true);
    const fd = new FormData();
    fd.set("vehicleNo", fVehicleNo);
    fd.set("vehicleName", fVehicleName);
    fd.set("vehicleType", fVehicleType);
    fd.set("assignedToId", fAssignedTo);
    fd.set("notes", fNotes);
    startTransition(async () => {
      const res = await createDeliveryVehicle(fd);
      setFormLoading(false);
      if ("error" in res) { setFormError(res.error ?? "Something went wrong"); return; }
      const newV = res.vehicle as unknown as Vehicle;
      const emp = employees.find(e => e.id === fAssignedTo);
      newV.assignedTo = emp ? { id: emp.id, name: emp.name, role: emp.role } : null;
      setVehicles(prev => [newV, ...prev]);
      setAddModal(false);
    });
  }

  async function handleEditVehicle(e: React.FormEvent) {
    e.preventDefault();
    if (!editVehicle) return;
    setFormError(""); setFormLoading(true);
    const fd = new FormData();
    fd.set("vehicleNo", fVehicleNo);
    fd.set("vehicleName", fVehicleName);
    fd.set("vehicleType", fVehicleType);
    fd.set("status", fStatus);
    fd.set("assignedToId", fAssignedTo);
    fd.set("notes", fNotes);
    startTransition(async () => {
      const res = await updateDeliveryVehicle(editVehicle.id, fd);
      setFormLoading(false);
      if ("error" in res) { setFormError(res.error ?? "Something went wrong"); return; }
      const emp = employees.find(e => e.id === fAssignedTo);
      setVehicles(prev => prev.map(v =>
        v.id === editVehicle.id
          ? { ...v, vehicleNo: fVehicleNo, vehicleName: fVehicleName, vehicleType: fVehicleType, status: fStatus, assignedToId: fAssignedTo || null, assignedTo: emp ? { id: emp.id, name: emp.name, role: emp.role } : null, notes: fNotes || null }
          : v
      ));
      setEditVehicle(null);
    });
  }

  async function handleDeleteVehicle() {
    if (!deleteVehicle) return;
    setFormLoading(true);
    startTransition(async () => {
      const res = await deleteDeliveryVehicle(deleteVehicle.id);
      setFormLoading(false);
      if ("error" in res) { setFormError(res.error ?? "Something went wrong"); return; }
      setVehicles(prev => prev.filter(v => v.id !== deleteVehicle.id));
      setTripLogs(prev => prev.filter(t => t.vehicleId !== deleteVehicle.id));
      setDeleteVehicle(null);
    });
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!assignVehicle) return;
    setFormError(""); setFormLoading(true);
    const fd = new FormData();
    fd.set("vehicleNo", assignVehicle.vehicleNo);
    fd.set("vehicleName", assignVehicle.vehicleName);
    fd.set("vehicleType", assignVehicle.vehicleType);
    fd.set("status", assignVehicle.status);
    fd.set("assignedToId", assignToId);
    fd.set("notes", assignVehicle.notes ?? "");
    startTransition(async () => {
      const res = await updateDeliveryVehicle(assignVehicle.id, fd);
      setFormLoading(false);
      if ("error" in res) { setFormError(res.error ?? "Something went wrong"); return; }
      const emp = employees.find(e => e.id === assignToId);
      setVehicles(prev => {
        // If another vehicle had this employee, unassign it
        return prev.map(v => {
          if (v.id === assignVehicle.id) {
            return { ...v, assignedToId: assignToId || null, assignedTo: emp ? { id: emp.id, name: emp.name, role: emp.role } : null };
          }
          if (assignToId && v.assignedToId === assignToId) {
            return { ...v, assignedToId: null, assignedTo: null };
          }
          return v;
        });
      });
      setAssignVehicle(null);
    });
  }

  async function handleRecordTrip(e: React.FormEvent) {
    e.preventDefault();
    if (!recordTripVehicle) return;
    setFormError(""); setFormLoading(true);
    const fd = new FormData();
    fd.set("vehicleId", recordTripVehicle.id);
    fd.set("date", tDate);
    fd.set("departureTime", tDeparture);
    fd.set("cylindersLoaded", tCylinders);
    fd.set("notes", tNotes);
    startTransition(async () => {
      const res = await createVehicleTripLog(fd);
      setFormLoading(false);
      if ("error" in res) { setFormError(res.error ?? "Something went wrong"); return; }
      const newLog: TripLog = {
        ...res.tripLog as unknown as TripLog,
        vehicle: {
          vehicleNo: recordTripVehicle.vehicleNo,
          vehicleName: recordTripVehicle.vehicleName,
          assignedTo: recordTripVehicle.assignedTo ? { name: recordTripVehicle.assignedTo.name } : null,
        },
      };
      setTripLogs(prev => [newLog, ...prev]);
      setRecordTripVehicle(null);
    });
  }

  async function handleUpdateTrip(e: React.FormEvent) {
    e.preventDefault();
    if (!updateTrip) return;
    setFormError(""); setFormLoading(true);
    const fd = new FormData();
    fd.set("tripStatus", uTripStatus);
    fd.set("returnTime", uReturnTime);
    fd.set("cylindersDelivered", uCylindersDelivered);
    fd.set("cylindersReturned", uCylindersReturned);
    startTransition(async () => {
      const res = await updateTripStatus(updateTrip.id, fd);
      setFormLoading(false);
      if ("error" in res) { setFormError(res.error ?? "Something went wrong"); return; }
      setTripLogs(prev => prev.map(t =>
        t.id === updateTrip.id
          ? { ...t, tripStatus: uTripStatus, returnTime: uReturnTime, cylindersDelivered: Number(uCylindersDelivered), cylindersReturned: Number(uCylindersReturned) }
          : t
      ));
      setUpdateTrip(null);
    });
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

  return (
    <div className="space-y-6">

      {/* Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <StatCard icon={<Truck className="w-5 h-5" />} label="Total Fleet" value={stats.total} color="#1D4ED8" />
        <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Active" value={stats.active} color="#15803D" />
        <StatCard icon={<Wrench className="w-5 h-5" />} label="Maintenance" value={stats.maintenance} color="#B45309" />
        <StatCard icon={<XCircle className="w-5 h-5" />} label="Inactive" value={stats.inactive} color="#6B7280" />
        <StatCard icon={<Users className="w-5 h-5" />} label="Assigned" value={stats.assigned} color="#7C3AED" />
        <StatCard icon={<Activity className="w-5 h-5" />} label="Trips Today" value={stats.tripsToday} color="#0891B2" />
        <StatCard icon={<MapPin className="w-5 h-5" />} label="Out Now" value={stats.outForDelivery} color="#D97706" />
        <StatCard icon={<Package className="w-5 h-5" />} label="Cyl. Today" value={stats.cylindersToday} color="#059669" />
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-100 p-1.5">
        <TabBtn active={activeTab === "fleet"} onClick={() => setActiveTab("fleet")}>
          <span className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" />Fleet ({vehicles.length})</span>
        </TabBtn>
        <TabBtn active={activeTab === "trips"} onClick={() => setActiveTab("trips")}>
          <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" />Trip Logs ({tripLogs.length})</span>
        </TabBtn>
        <TabBtn active={activeTab === "assignments"} onClick={() => setActiveTab("assignments")}>
          <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />Assignments</span>
        </TabBtn>
        <div className="ml-auto">
          {activeTab === "fleet" && (
            <button onClick={openAddModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="w-3.5 h-3.5" />Add Vehicle
            </button>
          )}
        </div>
      </div>

      {/* ── FLEET TAB ─────────────────────────────────────────────────────────── */}
      {activeTab === "fleet" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-100 p-3 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={fleetSearch} onChange={e => setFleetSearch(e.target.value)}
                placeholder="Search vehicle no, name, driver…"
                className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <select value={fleetStatusFilter} onChange={e => setFleetStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="INACTIVE">Inactive</option>
            </select>
            <select value={fleetTypeFilter} onChange={e => setFleetTypeFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="ALL">All Types</option>
              {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {(fleetSearch || fleetStatusFilter !== "ALL" || fleetTypeFilter !== "ALL") && (
              <button onClick={() => { setFleetSearch(""); setFleetStatusFilter("ALL"); setFleetTypeFilter("ALL"); }}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                <X className="w-3.5 h-3.5" />Clear
              </button>
            )}
          </div>

          {/* Vehicle Grid */}
          {filteredVehicles.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <Truck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No vehicles found</p>
              <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or add a new vehicle.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredVehicles.map(v => {
                const lastTrip = tripLogs.filter(t => t.vehicleId === v.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                return (
                  <div key={v.id} className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <VehicleTypeIcon type={v.vehicleType} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 font-mono text-sm tracking-wider">{v.vehicleNo}</p>
                          <p className="text-xs text-gray-500">{v.vehicleName}</p>
                        </div>
                      </div>
                      <StatusBadge status={v.status} />
                    </div>

                    {/* Vehicle info */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-gray-400 mb-0.5">Type</p>
                        <p className="font-medium text-gray-700">{v.vehicleType}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-gray-400 mb-0.5">Assigned To</p>
                        <p className="font-medium text-gray-700 truncate">{v.assignedTo?.name ?? "Unassigned"}</p>
                      </div>
                    </div>

                    {/* Last trip */}
                    {lastTrip && (
                      <div className="flex items-center justify-between text-xs border-t border-gray-50 pt-2">
                        <span className="text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />Last: {fmtDate(lastTrip.date)}
                        </span>
                        <TripStatusBadge status={lastTrip.tripStatus} />
                      </div>
                    )}

                    {/* Notes */}
                    {v.notes && (
                      <div className="text-xs text-gray-400 flex items-center gap-1 border-t border-gray-50 pt-2">
                        <Info className="w-3 h-3 flex-shrink-0" /><span className="truncate">{v.notes}</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-gray-50">
                      <button onClick={() => setViewVehicle(v)}
                        title="View details"
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors">
                        <Eye className="w-3.5 h-3.5" />View
                      </button>
                      <button onClick={() => openEditModal(v)}
                        title="Edit vehicle"
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />Edit
                      </button>
                      <button onClick={() => openAssignModal(v)}
                        title="Assign / Reassign"
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors">
                        <Users className="w-3.5 h-3.5" />Assign
                      </button>
                      {v.status === "ACTIVE" && (
                        <button onClick={() => openRecordTrip(v)}
                          title="Record trip departure"
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-600 hover:bg-green-100 transition-colors">
                          <Activity className="w-3.5 h-3.5" />Trip
                        </button>
                      )}
                      {isAdmin && (
                        <button onClick={() => setDeleteVehicle(v)}
                          title="Delete vehicle"
                          className="flex items-center justify-center p-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TRIP LOGS TAB ──────────────────────────────────────────────────────── */}
      {activeTab === "trips" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-100 p-3 flex flex-wrap items-center gap-3">
            <select value={tripVehicleFilter} onChange={e => setTripVehicleFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-40">
              <option value="ALL">All Vehicles</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicleNo} — {v.vehicleName}</option>)}
            </select>
            <select value={tripStatusFilter} onChange={e => setTripStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="ALL">All Status</option>
              {Object.entries(TRIP_STATUS_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <input type="date" value={tripDateFrom} onChange={e => setTripDateFrom(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <span className="text-gray-400 text-sm">to</span>
              <input type="date" value={tripDateTo} onChange={e => setTripDateTo(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {(tripVehicleFilter !== "ALL" || tripStatusFilter !== "ALL" || tripDateFrom || tripDateTo) && (
              <button onClick={() => { setTripVehicleFilter("ALL"); setTripStatusFilter("ALL"); setTripDateFrom(""); setTripDateTo(""); }}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                <X className="w-3.5 h-3.5" />Clear
              </button>
            )}
            <span className="ml-auto text-xs text-gray-400">{filteredTrips.length} records</span>
          </div>

          {/* Trip logs summary */}
          {filteredTrips.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Total Trips", value: filteredTrips.length, color: "#1D4ED8" },
                { label: "Out for Delivery", value: filteredTrips.filter(t => t.tripStatus === "OUT_FOR_DELIVERY").length, color: "#D97706" },
                { label: "Returned", value: filteredTrips.filter(t => t.tripStatus === "RETURNED").length, color: "#15803D" },
                { label: "Cylinders Loaded", value: filteredTrips.reduce((s, t) => s + t.cylindersLoaded, 0), color: "#7C3AED" },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
                  <div className="w-2 h-8 rounded-full" style={{ background: s.color }} />
                  <div>
                    <p className="text-lg font-bold text-gray-900">{s.value}</p>
                    <p className="text-xs text-gray-500">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Trip table */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {filteredTrips.length === 0 ? (
              <div className="p-12 text-center">
                <Activity className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No trip logs found</p>
                <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or record a new trip from the Fleet tab.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Vehicle</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Driver</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Loaded</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Delivered</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Returned</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Departure</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Return</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredTrips.map(t => (
                      <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{fmtDate(t.date)}</td>
                        <td className="px-4 py-3">
                          <p className="font-mono font-semibold text-gray-800 text-xs">{t.vehicle?.vehicleNo ?? "—"}</p>
                          <p className="text-xs text-gray-400">{t.vehicle?.vehicleName}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{t.vehicle?.assignedTo?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-center font-medium text-gray-800">{t.cylindersLoaded}</td>
                        <td className="px-4 py-3 text-center font-medium text-green-700">{t.cylindersDelivered || "—"}</td>
                        <td className="px-4 py-3 text-center font-medium text-blue-700">{t.cylindersReturned || "—"}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmtTime(t.departureTime)}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmtTime(t.returnTime)}</td>
                        <td className="px-4 py-3"><TripStatusBadge status={t.tripStatus} /></td>
                        <td className="px-4 py-3 text-center">
                          {(t.tripStatus === "LOADED" || t.tripStatus === "OUT_FOR_DELIVERY") && (
                            <button onClick={() => openUpdateTrip(t)}
                              className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium">
                              Update
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ASSIGNMENTS TAB ────────────────────────────────────────────────────── */}
      {activeTab === "assignments" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Vehicles with assignment */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-600" />
              <h3 className="font-semibold text-gray-800 text-sm">Vehicle → Driver</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {vehicles.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">No vehicles yet.</p>
              ) : vehicles.map(v => (
                <div key={v.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <VehicleTypeIcon type={v.vehicleType} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono font-semibold text-gray-800 text-xs">{v.vehicleNo}</p>
                    <p className="text-xs text-gray-400 truncate">{v.vehicleName}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                  <div className="flex-1 min-w-0 text-right">
                    {v.assignedTo ? (
                      <>
                        <p className="text-xs font-medium text-gray-700 truncate">{v.assignedTo.name}</p>
                        <p className="text-xs text-gray-400">{ROLE_LABELS[v.assignedTo.role] ?? v.assignedTo.role}</p>
                      </>
                    ) : (
                      <span className="text-xs text-gray-300 italic">Unassigned</span>
                    )}
                  </div>
                  <button onClick={() => openAssignModal(v)}
                    className="ml-2 px-2 py-1 text-xs bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors font-medium flex-shrink-0">
                    {v.assignedTo ? "Reassign" : "Assign"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Employees + their vehicle */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600" />
              <h3 className="font-semibold text-gray-800 text-sm">Employee → Vehicle</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {employees.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">No employees found.</p>
              ) : employees.map(emp => {
                const empVehicle = vehicles.find(v => v.assignedToId === emp.id);
                return (
                  <div key={emp.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">{emp.name.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{emp.name}</p>
                      <p className="text-xs text-gray-400">{ROLE_LABELS[emp.role] ?? emp.role}</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                    <div className="flex-1 min-w-0 text-right">
                      {empVehicle ? (
                        <>
                          <p className="font-mono font-semibold text-xs text-gray-800">{empVehicle.vehicleNo}</p>
                          <p className="text-xs text-gray-400">{empVehicle.vehicleName}</p>
                        </>
                      ) : (
                        <span className="text-xs text-gray-300 italic">No vehicle</span>
                      )}
                    </div>
                    {empVehicle && (
                      <StatusBadge status={empVehicle.status} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Unassigned vehicles callout */}
          {vehicles.filter(v => !v.assignedToId).length > 0 && (
            <div className="lg:col-span-2 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  {vehicles.filter(v => !v.assignedToId).length} vehicle(s) unassigned
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  {vehicles.filter(v => !v.assignedToId).map(v => v.vehicleNo).join(", ")} — go to Fleet tab to assign drivers.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━ MODALS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

      {/* Add Vehicle Modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add New Vehicle" size="md">
        <form onSubmit={handleAddVehicle} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Vehicle Number *</label>
              <input value={fVehicleNo} onChange={e => setFVehicleNo(e.target.value.toUpperCase())}
                placeholder="e.g. MH12AB1234" className={inputCls} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Vehicle Name / Model *</label>
              <input value={fVehicleName} onChange={e => setFVehicleName(e.target.value)}
                placeholder="e.g. Hero Splendor" className={inputCls} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Vehicle Type</label>
              <select value={fVehicleType} onChange={e => setFVehicleType(e.target.value)} className={inputCls}>
                {VEHICLE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Assign To (optional)</label>
              <select value={fAssignedTo} onChange={e => setFAssignedTo(e.target.value)} className={inputCls}>
                <option value="">— Unassigned —</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({ROLE_LABELS[e.role] ?? e.role})</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea value={fNotes} onChange={e => setFNotes(e.target.value)}
              rows={2} placeholder="Additional notes…" className={inputCls} />
          </div>
          {formError && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{formError}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setAddModal(false)}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={formLoading || isPending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {formLoading ? "Adding…" : "Add Vehicle"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Vehicle Modal */}
      <Modal open={!!editVehicle} onClose={() => setEditVehicle(null)} title="Edit Vehicle" size="md">
        <form onSubmit={handleEditVehicle} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Vehicle Number *</label>
              <input value={fVehicleNo} onChange={e => setFVehicleNo(e.target.value.toUpperCase())}
                className={inputCls} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Vehicle Name / Model *</label>
              <input value={fVehicleName} onChange={e => setFVehicleName(e.target.value)}
                className={inputCls} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Vehicle Type</label>
              <select value={fVehicleType} onChange={e => setFVehicleType(e.target.value)} className={inputCls}>
                {VEHICLE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select value={fStatus} onChange={e => setFStatus(e.target.value as "ACTIVE" | "INACTIVE" | "MAINTENANCE")} className={inputCls}>
                <option value="ACTIVE">Active</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Assign To</label>
            <select value={fAssignedTo} onChange={e => setFAssignedTo(e.target.value)} className={inputCls}>
              <option value="">— Unassigned —</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({ROLE_LABELS[e.role] ?? e.role})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea value={fNotes} onChange={e => setFNotes(e.target.value)}
              rows={2} className={inputCls} />
          </div>
          {formError && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{formError}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setEditVehicle(null)}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={formLoading || isPending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {formLoading ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Modal */}
      <Modal open={!!assignVehicle} onClose={() => setAssignVehicle(null)} title="Assign Vehicle to Employee" size="sm">
        {assignVehicle && (
          <form onSubmit={handleAssign} className="space-y-4">
            <div className="bg-blue-50 rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                <VehicleTypeIcon type={assignVehicle.vehicleType} />
              </div>
              <div>
                <p className="font-mono font-bold text-sm text-gray-800">{assignVehicle.vehicleNo}</p>
                <p className="text-xs text-gray-500">{assignVehicle.vehicleName} · {assignVehicle.vehicleType}</p>
              </div>
            </div>
            {assignVehicle.assignedTo && (
              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                Currently assigned to <strong>{assignVehicle.assignedTo.name}</strong>. Re-assigning will remove the current assignment.
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Assign To</label>
              <select value={assignToId} onChange={e => setAssignToId(e.target.value)} className={inputCls}>
                <option value="">— Unassign (no driver) —</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({ROLE_LABELS[e.role] ?? e.role})</option>)}
              </select>
            </div>
            {formError && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{formError}</p>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setAssignVehicle(null)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={formLoading || isPending}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
                {formLoading ? "Saving…" : "Save Assignment"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Record Trip Modal */}
      <Modal open={!!recordTripVehicle} onClose={() => setRecordTripVehicle(null)} title="Record Trip Departure" size="sm">
        {recordTripVehicle && (
          <form onSubmit={handleRecordTrip} className="space-y-4">
            <div className="bg-green-50 rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
                <VehicleTypeIcon type={recordTripVehicle.vehicleType} />
              </div>
              <div>
                <p className="font-mono font-bold text-sm text-gray-800">{recordTripVehicle.vehicleNo}</p>
                <p className="text-xs text-gray-500">{recordTripVehicle.vehicleName} · {recordTripVehicle.assignedTo?.name ?? "Unassigned"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                <input type="date" value={tDate} onChange={e => setTDate(e.target.value)} className={inputCls} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Departure Time</label>
                <input type="datetime-local" value={tDeparture} onChange={e => setTDeparture(e.target.value)} className={inputCls} required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Cylinders Loaded *</label>
              <input type="number" min={0} value={tCylinders} onChange={e => setTCylinders(e.target.value)}
                placeholder="0" className={inputCls} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optional)</label>
              <input value={tNotes} onChange={e => setTNotes(e.target.value)} placeholder="Optional notes…" className={inputCls} />
            </div>
            {formError && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{formError}</p>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setRecordTripVehicle(null)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={formLoading || isPending}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                {formLoading ? "Recording…" : "Record Departure"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Update Trip Status Modal */}
      <Modal open={!!updateTrip} onClose={() => setUpdateTrip(null)} title="Update Trip Status" size="sm">
        {updateTrip && (
          <form onSubmit={handleUpdateTrip} className="space-y-4">
            <div className="bg-blue-50 rounded-xl p-3 text-xs text-gray-700 space-y-1">
              <p><strong>Vehicle:</strong> {updateTrip.vehicle?.vehicleNo} — {updateTrip.vehicle?.vehicleName}</p>
              <p><strong>Date:</strong> {fmtDate(updateTrip.date)} · <strong>Loaded:</strong> {updateTrip.cylindersLoaded} cylinders</p>
              <p><strong>Departure:</strong> {fmtTime(updateTrip.departureTime)}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">New Status</label>
              <select value={uTripStatus} onChange={e => setUTripStatus(e.target.value as TripLog["tripStatus"])} className={inputCls}>
                <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                <option value="RETURNED">Returned</option>
                <option value="PARTIAL_RETURN">Partial Return</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Return Time</label>
              <input type="datetime-local" value={uReturnTime} onChange={e => setUReturnTime(e.target.value)} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cylinders Delivered</label>
                <input type="number" min={0} value={uCylindersDelivered} onChange={e => setUCylindersDelivered(e.target.value)} className={inputCls} placeholder="0" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cylinders Returned</label>
                <input type="number" min={0} value={uCylindersReturned} onChange={e => setUCylindersReturned(e.target.value)} className={inputCls} placeholder="0" />
              </div>
            </div>
            {formError && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{formError}</p>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setUpdateTrip(null)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={formLoading || isPending}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {formLoading ? "Updating…" : "Update Trip"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* View Vehicle Details Modal */}
      <Modal open={!!viewVehicle} onClose={() => setViewVehicle(null)} title="Vehicle Details" size="lg">
        {viewVehicle && (() => {
          const vTrips = tripLogs.filter(t => t.vehicleId === viewVehicle.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          return (
            <div className="space-y-5">
              {/* Vehicle info grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: "Vehicle No", value: viewVehicle.vehicleNo, mono: true },
                  { label: "Model Name", value: viewVehicle.vehicleName },
                  { label: "Type", value: viewVehicle.vehicleType },
                  { label: "Status", value: <StatusBadge status={viewVehicle.status} /> },
                  { label: "Assigned To", value: viewVehicle.assignedTo?.name ?? "Unassigned" },
                  { label: "Role", value: viewVehicle.assignedTo ? (ROLE_LABELS[viewVehicle.assignedTo.role] ?? viewVehicle.assignedTo.role) : "—" },
                ].map(f => (
                  <div key={f.label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-1">{f.label}</p>
                    {typeof f.value === "string"
                      ? <p className={`text-sm font-semibold text-gray-800 ${f.mono ? "font-mono tracking-wider" : ""}`}>{f.value}</p>
                      : f.value}
                  </div>
                ))}
              </div>

              {viewVehicle.notes && (
                <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-800">
                  <strong>Notes:</strong> {viewVehicle.notes}
                </div>
              )}

              {/* Trip stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Total Trips", value: vTrips.length },
                  { label: "Total Cylinders", value: vTrips.reduce((s, t) => s + t.cylindersLoaded, 0) },
                  { label: "Last Trip", value: vTrips[0] ? fmtDate(vTrips[0].date) : "Never" },
                ].map(s => (
                  <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-gray-800">{s.value}</p>
                    <p className="text-xs text-gray-400">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Recent trips */}
              {vTrips.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Recent Trips</h4>
                  <div className="space-y-2 max-h-52 overflow-y-auto">
                    {vTrips.slice(0, 10).map(t => (
                      <div key={t.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2 text-xs">
                        <span className="text-gray-500 w-20 flex-shrink-0">{fmtDate(t.date)}</span>
                        <TripStatusBadge status={t.tripStatus} />
                        <span className="text-gray-600">Loaded: <strong>{t.cylindersLoaded}</strong></span>
                        {t.cylindersDelivered > 0 && <span className="text-green-600">Del: <strong>{t.cylindersDelivered}</strong></span>}
                        {t.cylindersReturned > 0 && <span className="text-blue-600">Ret: <strong>{t.cylindersReturned}</strong></span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button onClick={() => { setViewVehicle(null); openEditModal(viewVehicle); }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                  Edit Vehicle
                </button>
                <button onClick={() => setViewVehicle(null)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                  Close
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal open={!!deleteVehicle} onClose={() => setDeleteVehicle(null)} title="Delete Vehicle" size="sm">
        {deleteVehicle && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800">This action cannot be undone.</p>
                <p className="text-sm text-red-600 mt-1">
                  Deleting <strong>{deleteVehicle.vehicleNo}</strong> ({deleteVehicle.vehicleName}) will also remove all its trip logs.
                </p>
              </div>
            </div>
            {formError && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{formError}</p>}
            <div className="flex gap-3">
              <button onClick={() => { setDeleteVehicle(null); setFormError(""); }}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleDeleteVehicle} disabled={formLoading || isPending}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {formLoading ? "Deleting…" : "Delete Vehicle"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
