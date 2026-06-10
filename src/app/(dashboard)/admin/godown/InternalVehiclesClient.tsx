"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDateTime } from "@/lib/utils";
import { Plus, Truck, User, Edit2, Activity, CheckCircle2, RotateCcw, ArrowUpRight } from "lucide-react";
import {
  createDeliveryVehicle,
  updateDeliveryVehicle,
  createVehicleTripLog,
  updateTripStatus,
} from "@/app/actions/delivery-vehicles";

interface DeliveryVehicle {
  id: string; vehicleNo: string; vehicleName: string; vehicleType: string;
  status: string; notes: string | null;
  assignedTo: { id: string; name: string } | null;
}
interface TripLog {
  id: string; vehicleId: string; date: Date | string;
  cylindersLoaded: number; cylindersReturned: number; cylindersDelivered: number;
  departureTime: Date | string | null; returnTime: Date | string | null;
  tripStatus: string; notes: string | null;
  vehicle: { vehicleNo: string; vehicleName: string; assignedTo: { name: string } | null };
  recordedBy: { name: string };
}
interface DeliveryBoy { id: string; name: string; }

const TRIP_STATUS_COLORS: Record<string, string> = {
  LOADED: "badge-blue",
  OUT_FOR_DELIVERY: "badge-pending",
  RETURNED: "badge-approved",
  PARTIAL_RETURN: "badge-correction",
};
const TRIP_STATUS_LABELS: Record<string, string> = {
  LOADED: "Loaded", OUT_FOR_DELIVERY: "Out for Delivery",
  RETURNED: "Returned", PARTIAL_RETURN: "Partial Return",
};
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "badge-approved", INACTIVE: "badge-neutral", MAINTENANCE: "badge-pending",
};

export function InternalVehiclesClient({
  initialVehicles, initialTripLogs, deliveryBoys, isAdmin, userId,
}: {
  initialVehicles: DeliveryVehicle[];
  initialTripLogs: TripLog[];
  deliveryBoys: DeliveryBoy[];
  isAdmin: boolean;
  userId: string;
}) {
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [tripLogs, setTripLogs] = useState(initialTripLogs);
  const [activeTab, setActiveTab] = useState<"vehicles" | "trips">("trips");
  const [vehicleModal, setVehicleModal] = useState(false);
  const [tripModal, setTripModal] = useState(false);
  const [updateModal, setUpdateModal] = useState<TripLog | null>(null);
  const [editVehicle, setEditVehicle] = useState<DeliveryVehicle | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [vForm, setVForm] = useState({ vehicleNo: "", vehicleName: "", vehicleType: "Two-Wheeler", assignedToId: "", notes: "", status: "ACTIVE" });
  const [tForm, setTForm] = useState({ vehicleId: "", date: new Date().toISOString().slice(0, 10), cylindersLoaded: "", departureTime: new Date().toISOString().slice(0, 16), notes: "" });
  const [uForm, setUForm] = useState({ tripStatus: "RETURNED", returnTime: new Date().toISOString().slice(0, 16), cylindersReturned: "", cylindersDelivered: "" });

  const todayTrips = tripLogs.filter((t) => new Date(t.date).toDateString() === new Date().toDateString());
  const activeTrips = todayTrips.filter((t) => t.tripStatus === "OUT_FOR_DELIVERY" || t.tripStatus === "LOADED");

  function openEditVehicle(v: DeliveryVehicle) {
    setEditVehicle(v);
    setVForm({ vehicleNo: v.vehicleNo, vehicleName: v.vehicleName, vehicleType: v.vehicleType, assignedToId: v.assignedTo?.id ?? "", notes: v.notes ?? "", status: v.status });
    setError(""); setVehicleModal(true);
  }

  function openAddVehicle() {
    setEditVehicle(null);
    setVForm({ vehicleNo: "", vehicleName: "", vehicleType: "Two-Wheeler", assignedToId: "", notes: "", status: "ACTIVE" });
    setError(""); setVehicleModal(true);
  }

  function handleVehicleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(vForm).forEach(([k, v]) => fd.append(k, v));
    startTransition(async () => {
      const result = editVehicle
        ? await updateDeliveryVehicle(editVehicle.id, fd)
        : await createDeliveryVehicle(fd);
      if ("error" in result && result.error) { setError(result.error); return; }
      if ("vehicle" in result && result.vehicle) {
        const v = result.vehicle as DeliveryVehicle;
        setVehicles((prev) => editVehicle ? prev.map((x) => x.id === v.id ? v : x) : [v, ...prev]);
        setVehicleModal(false);
      }
    });
  }

  function handleTripSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tForm.vehicleId) { setError("Please select a vehicle"); return; }
    const fd = new FormData();
    Object.entries(tForm).forEach(([k, v]) => fd.append(k, v));
    startTransition(async () => {
      const result = await createVehicleTripLog(fd);
      if (result.error) { setError(result.error); return; }
      if (result.tripLog) { setTripLogs((prev) => [result.tripLog!, ...prev]); setTripModal(false); }
    });
  }

  function openUpdateTrip(t: TripLog) {
    setUpdateModal(t);
    setUForm({ tripStatus: "RETURNED", returnTime: new Date().toISOString().slice(0, 16), cylindersReturned: String(t.cylindersLoaded), cylindersDelivered: String(t.cylindersLoaded) });
    setError("");
  }

  function handleUpdateTrip(e: React.FormEvent) {
    e.preventDefault();
    if (!updateModal) return;
    const fd = new FormData();
    Object.entries(uForm).forEach(([k, v]) => fd.append(k, v));
    startTransition(async () => {
      const result = await updateTripStatus(updateModal.id, fd);
      if (result.error) { setError(result.error); return; }
      if (result.tripLog) {
        setTripLogs((prev) => prev.map((t) => t.id === result.tripLog!.id ? result.tripLog! as TripLog : t));
        setUpdateModal(null);
      }
    });
  }

  return (
    <>
      {/* Header stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Vehicles", val: vehicles.length, color: "#2563EB", bg: "#EFF6FF" },
          { label: "Active Today", val: todayTrips.length, color: "#16A34A", bg: "#F0FDF4" },
          { label: "Out for Delivery", val: activeTrips.length, color: "#D97706", bg: "#FFFBEB" },
          { label: "Returned", val: todayTrips.filter((t) => t.tripStatus === "RETURNED").length, color: "#7C3AED", bg: "#F5F3FF" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg p-4" style={{ background: "#fff", border: "1px solid #E4E4E7", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
            <p className="text-[11px] font-medium uppercase tracking-wide mb-1" style={{ color: "#71717A" }}>{s.label}</p>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 p-1 rounded-lg mb-4" style={{ background: "#F4F4F5", width: "fit-content" }}>
        {(["trips", "vehicles"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="px-4 py-1.5 rounded-md text-[13px] font-medium transition-all"
            style={activeTab === tab ? { background: "#fff", color: "#18181B", boxShadow: "0 1px 2px rgba(0,0,0,0.08)" } : { color: "#71717A" }}>
            {tab === "trips" ? "Today's Trips" : "Vehicle Fleet"}
          </button>
        ))}
      </div>

      {/* TODAY TRIPS TAB */}
      {activeTab === "trips" && (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>Internal vehicle trip log</p>
            <button onClick={() => { setError(""); setTripModal(true); }} className="btn btn-primary">
              <Plus className="w-3.5 h-3.5" /> Record Departure
            </button>
          </div>
          <div className="rounded-lg overflow-hidden" style={{ background: "#fff", border: "1px solid #E4E4E7", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr>
                  <th>Vehicle</th><th>Delivery Boy</th><th>Cylinders Loaded</th>
                  <th>Departure</th><th>Return</th><th>Delivered</th><th>Returned</th>
                  <th className="text-center">Status</th><th className="text-center">Action</th>
                </tr></thead>
                <tbody>
                  {tripLogs.length === 0 ? (
                    <tr><td colSpan={9} className="py-14 text-center">
                      <Truck className="w-8 h-8 mx-auto mb-2" style={{ color: "#D4D4D8" }} />
                      <p className="text-[13px]" style={{ color: "#A1A1AA" }}>No trips recorded yet today</p>
                    </td></tr>
                  ) : tripLogs.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <p className="font-mono font-semibold text-[13px]" style={{ color: "#18181B" }}>{t.vehicle.vehicleNo}</p>
                        <p className="text-[11px]" style={{ color: "#A1A1AA" }}>{t.vehicle.vehicleName}</p>
                      </td>
                      <td className="text-[13px]" style={{ color: "#52525B" }}>{t.vehicle.assignedTo?.name ?? "—"}</td>
                      <td className="text-center font-bold" style={{ color: "#2563EB" }}>{t.cylindersLoaded}</td>
                      <td className="muted text-[12px]">{t.departureTime ? formatDateTime(t.departureTime) : "—"}</td>
                      <td className="muted text-[12px]">{t.returnTime ? formatDateTime(t.returnTime) : "—"}</td>
                      <td className="text-center font-bold" style={{ color: "#16A34A" }}>{t.cylindersDelivered || "—"}</td>
                      <td className="text-center font-bold" style={{ color: "#D97706" }}>{t.cylindersReturned || "—"}</td>
                      <td className="text-center">
                        <span className={`badge ${TRIP_STATUS_COLORS[t.tripStatus] ?? "badge-neutral"}`}>
                          {TRIP_STATUS_LABELS[t.tripStatus] ?? t.tripStatus}
                        </span>
                      </td>
                      <td className="text-center">
                        {(t.tripStatus === "LOADED" || t.tripStatus === "OUT_FOR_DELIVERY") && (
                          <button onClick={() => openUpdateTrip(t)} className="btn btn-secondary text-[12px]" style={{ height: 28, padding: "0 10px", color: "#16A34A", borderColor: "#86EFAC" }}>
                            Update Return
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* VEHICLE FLEET TAB */}
      {activeTab === "vehicles" && (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>Fleet management</p>
            {isAdmin && (
              <button onClick={openAddVehicle} className="btn btn-primary">
                <Plus className="w-3.5 h-3.5" /> Add Vehicle
              </button>
            )}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {vehicles.length === 0 ? (
              <div className="col-span-3 py-14 text-center rounded-lg" style={{ background: "#fff", border: "1px solid #E4E4E7" }}>
                <Truck className="w-8 h-8 mx-auto mb-2" style={{ color: "#D4D4D8" }} />
                <p className="text-[13px]" style={{ color: "#A1A1AA" }}>No vehicles added yet</p>
              </div>
            ) : vehicles.map((v) => (
              <div key={v.id} className="rounded-lg p-4" style={{ background: "#fff", border: "1px solid #E4E4E7", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "#EFF6FF" }}>
                    <Truck className="w-5 h-5" style={{ color: "#2563EB" }} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${STATUS_COLORS[v.status] ?? "badge-neutral"}`}>{v.status}</span>
                    {isAdmin && (
                      <button onClick={() => openEditVehicle(v)} className="btn btn-secondary" style={{ height: 28, padding: "0 8px" }}>
                        <Edit2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="font-mono text-[15px] font-bold mb-0.5" style={{ color: "#18181B" }}>{v.vehicleNo}</p>
                <p className="text-[13px] mb-3" style={{ color: "#52525B" }}>{v.vehicleName} · {v.vehicleType}</p>
                <div className="flex items-center gap-2 pt-3" style={{ borderTop: "1px solid #F4F4F5" }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: v.assignedTo ? "#2563EB" : "#D4D4D8" }}>
                    {v.assignedTo ? v.assignedTo.name.charAt(0) : "?"}
                  </div>
                  <p className="text-[12px]" style={{ color: v.assignedTo ? "#52525B" : "#A1A1AA" }}>
                    {v.assignedTo ? v.assignedTo.name : "Unassigned"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add/Edit Vehicle Modal */}
      <Modal open={vehicleModal} onClose={() => setVehicleModal(false)} title={editVehicle ? "Edit Vehicle" : "Add Internal Vehicle"}>
        <form onSubmit={handleVehicleSubmit} className="space-y-4">
          {error && <div className="text-[13px] px-3 py-2.5 rounded-md" style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#B91C1C" }}>{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Vehicle No. *</label>
              <input value={vForm.vehicleNo} onChange={(e) => setVForm({ ...vForm, vehicleNo: e.target.value.toUpperCase() })} placeholder="MH12AB1234" className="input font-mono" style={{ textTransform: "uppercase" }} />
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Vehicle Name *</label>
              <input value={vForm.vehicleName} onChange={(e) => setVForm({ ...vForm, vehicleName: e.target.value })} placeholder="Activa, TVS, Tata Ace..." className="input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Vehicle Type</label>
              <select value={vForm.vehicleType} onChange={(e) => setVForm({ ...vForm, vehicleType: e.target.value })} className="input select-none">
                {["Two-Wheeler", "Three-Wheeler", "Four-Wheeler"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Assign Delivery Boy</label>
              <select value={vForm.assignedToId} onChange={(e) => setVForm({ ...vForm, assignedToId: e.target.value })} className="input select-none">
                <option value="">Unassigned</option>
                {deliveryBoys.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
          {editVehicle && (
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Status</label>
              <select value={vForm.status} onChange={(e) => setVForm({ ...vForm, status: e.target.value })} className="input select-none">
                {["ACTIVE", "INACTIVE", "MAINTENANCE"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Notes</label>
            <textarea value={vForm.notes} onChange={(e) => setVForm({ ...vForm, notes: e.target.value })} rows={2} placeholder="Any remarks…" className="input resize-none" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setVehicleModal(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={isPending} className="btn btn-primary">{isPending ? "Saving…" : editVehicle ? "Update Vehicle" : "Add Vehicle"}</button>
          </div>
        </form>
      </Modal>

      {/* Record Trip Modal */}
      <Modal open={tripModal} onClose={() => setTripModal(false)} title="Record Vehicle Departure">
        <form onSubmit={handleTripSubmit} className="space-y-4">
          {error && <div className="text-[13px] px-3 py-2.5 rounded-md" style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#B91C1C" }}>{error}</div>}
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Select Vehicle *</label>
            <select value={tForm.vehicleId} onChange={(e) => setTForm({ ...tForm, vehicleId: e.target.value })} className="input select-none">
              <option value="">Choose vehicle…</option>
              {vehicles.filter((v) => v.status === "ACTIVE").map((v) => (
                <option key={v.id} value={v.id}>{v.vehicleNo} — {v.vehicleName} {v.assignedTo ? `(${v.assignedTo.name})` : ""}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Date</label>
              <input type="date" value={tForm.date} onChange={(e) => setTForm({ ...tForm, date: e.target.value })} className="input" />
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Departure Time</label>
              <input type="datetime-local" value={tForm.departureTime} onChange={(e) => setTForm({ ...tForm, departureTime: e.target.value })} className="input" />
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Cylinders Loaded *</label>
            <input type="number" min="0" value={tForm.cylindersLoaded} onChange={(e) => setTForm({ ...tForm, cylindersLoaded: e.target.value })} placeholder="0" className="input" />
          </div>
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Notes</label>
            <textarea value={tForm.notes} onChange={(e) => setTForm({ ...tForm, notes: e.target.value })} rows={2} placeholder="Any remarks…" className="input resize-none" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setTripModal(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={isPending} className="btn btn-primary">{isPending ? "Recording…" : "Record Departure"}</button>
          </div>
        </form>
      </Modal>

      {/* Update Trip Status Modal */}
      <Modal open={!!updateModal} onClose={() => setUpdateModal(null)} title="Update Vehicle Return">
        <form onSubmit={handleUpdateTrip} className="space-y-4">
          {error && <div className="text-[13px] px-3 py-2.5 rounded-md" style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#B91C1C" }}>{error}</div>}
          {updateModal && (
            <div className="px-3 py-2.5 rounded-md" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
              <p className="text-[12px] font-semibold" style={{ color: "#1D4ED8" }}>{updateModal.vehicle.vehicleNo} — {updateModal.vehicle.vehicleName}</p>
              <p className="text-[11px]" style={{ color: "#3B82F6" }}>Loaded: {updateModal.cylindersLoaded} cylinders</p>
            </div>
          )}
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Trip Status</label>
            <select value={uForm.tripStatus} onChange={(e) => setUForm({ ...uForm, tripStatus: e.target.value })} className="input select-none">
              <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
              <option value="RETURNED">Fully Returned</option>
              <option value="PARTIAL_RETURN">Partial Return</option>
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Return Time</label>
            <input type="datetime-local" value={uForm.returnTime} onChange={(e) => setUForm({ ...uForm, returnTime: e.target.value })} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Cylinders Delivered</label>
              <input type="number" min="0" value={uForm.cylindersDelivered} onChange={(e) => setUForm({ ...uForm, cylindersDelivered: e.target.value })} className="input" />
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Cylinders Returned</label>
              <input type="number" min="0" value={uForm.cylindersReturned} onChange={(e) => setUForm({ ...uForm, cylindersReturned: e.target.value })} className="input" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setUpdateModal(null)} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={isPending} className="btn btn-primary">{isPending ? "Updating…" : "Update Status"}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
