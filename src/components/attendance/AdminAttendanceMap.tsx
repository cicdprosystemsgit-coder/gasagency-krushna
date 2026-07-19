"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from "react-leaflet";
import L from "leaflet";
import {
  Clock, MapPin, User, Search, RefreshCw, Eye, EyeOff,
  Navigation, Layers, AlertCircle, Wifi, WifiOff, ChevronRight,
} from "lucide-react";

// ── Color helpers ─────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  MANAGER: { bg: "#8b5cf6", text: "#f5f3ff" },
  STAFF: { bg: "#3b82f6", text: "#eff6ff" },
  DELIVERY_BOY: { bg: "#f97316", text: "#fff7ed" },
  GODOWN_KEEPER: { bg: "#10b981", text: "#ecfdf5" },
  CASHIER: { bg: "#ec4899", text: "#fdf2f8" },
  ADMIN: { bg: "#64748b", text: "#f8fafc" },
};

const STATUS_LABEL: Record<string, string> = {
  PRESENT: "Present", ABSENT: "Absent", HALF_DAY: "Half Day", ON_LEAVE: "On Leave",
};

function makeIcon(color: string, label: string, selected: boolean) {
  const sz = selected ? 38 : 30;
  const ring = selected ? `box-shadow:0 0 0 3px white,0 0 0 5px ${color};` : "";
  return L.divIcon({
    html: `<div style="background:${color};width:${sz}px;height:${sz}px;border-radius:50%;border:3px solid white;${ring}display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:bold;box-shadow:0 2px 8px rgba(0,0,0,.25)">${label}</div>`,
    className: "custom-leaflet-marker",
    iconSize: [sz, sz], iconAnchor: [sz / 2, sz], popupAnchor: [0, -(sz + 2)],
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LocationRecord {
  id: string; name: string; role: string; status: string;
  punchIn: Date | string | null; punchOut: Date | string | null;
  punchInLat: number | null; punchInLng: number | null;
  punchOutLat: number | null; punchOutLng: number | null;
}

interface Props {
  data: LocationRecord[];
  layer: "punchIn" | "punchOut" | "both";
  selectedDate?: string; // YYYY-MM-DD, used for polling
}

// ── Map auto-bounds ───────────────────────────────────────────────────────────

function AutoBounds({ pts }: { pts: [number, number][] }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (!done.current && pts.length > 0) {
      map.fitBounds(L.latLngBounds(pts), { padding: [60, 60], maxZoom: 15 });
      done.current = true;
    }
  }, [pts, map]);
  return null;
}

// ── POLL_MS: how often we fetch fresh data (30 s) ────────────────────────────
const POLL_MS = 30_000;

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminAttendanceMap({ data: initialData, layer, selectedDate }: Props) {
  const [isClient, setIsClient] = useState(false);
  const [liveData, setLiveData] = useState<LocationRecord[]>(initialData);
  const [lastFetch, setLastFetch] = useState<Date>(new Date());
  const [polling, setPolling] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [countdown, setCountdown] = useState(POLL_MS / 1000);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);

  useEffect(() => { setIsClient(true); }, []);

  // ── Fetch from API ──────────────────────────────────────────────────────────
  const fetchLive = useCallback(async () => {
    try {
      const qs = selectedDate ? `?date=${selectedDate}` : "";
      const res = await fetch(`/api/admin/attendance-live${qs}`, { cache: "no-store" });
      if (!res.ok) throw new Error("non-ok");
      const json = await res.json();
      setLiveData(json.data ?? []);
      setLastFetch(new Date());
      setFetchError(false);
      setCountdown(POLL_MS / 1000);
    } catch {
      setFetchError(true);
    }
  }, [selectedDate]);

  // ── Auto-poll every POLL_MS ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isClient || !polling) return;
    fetchLive(); // immediate first fetch
    const interval = setInterval(fetchLive, POLL_MS);
    return () => clearInterval(interval);
  }, [isClient, polling, fetchLive]);

  // ── Countdown ticker ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!polling) return;
    const t = setInterval(() => setCountdown((c) => (c <= 1 ? POLL_MS / 1000 : c - 1)), 1000);
    return () => clearInterval(t);
  }, [polling]);

  // ── Derived data ─────────────────────────────────────────────────────────────
  const allRoles = Array.from(new Set(liveData.map((d) => d.role))).sort();
  const allStatuses = Array.from(new Set(liveData.map((d) => d.status))).sort();

  const filtered = liveData.filter((r) => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (roleFilter !== "ALL" && r.role !== roleFilter) return false;
    if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
    return true;
  });

  const withGPS = filtered.filter((r) => r.punchInLat || r.punchOutLat);
  const withoutGPS = filtered.filter((r) => !r.punchInLat && !r.punchOutLat && r.status !== "ABSENT");

  type Pin = {
    id: string; empId: string; name: string; role: string;
    type: "▶" | "■"; time: string; lat: number; lng: number; color: string;
  };

  const pins: Pin[] = [];
  filtered.forEach((r) => {
    const color = ROLE_COLORS[r.role]?.bg ?? "#6b7280";
    const selected = r.id === selectedId;
    if ((layer === "punchIn" || layer === "both") && r.punchInLat && r.punchInLng) {
      pins.push({
        id: `${r.id}-in`, empId: r.id, name: r.name, role: r.role, type: "▶",
        time: r.punchIn ? new Date(r.punchIn).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "--",
        lat: r.punchInLat, lng: r.punchInLng, color: selected ? "#2563eb" : color
      });
    }
    if ((layer === "punchOut" || layer === "both") && r.punchOutLat && r.punchOutLng) {
      pins.push({
        id: `${r.id}-out`, empId: r.id, name: r.name, role: r.role, type: "■",
        time: r.punchOut ? new Date(r.punchOut).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "--",
        lat: r.punchOutLat, lng: r.punchOutLng, color: selected ? "#dc2626" : "#dc2626"
      });
    }
  });

  const selEmp = filtered.find((r) => r.id === selectedId);
  const routeLine: [number, number][] =
    selEmp?.punchInLat && selEmp.punchInLng && selEmp.punchOutLat && selEmp.punchOutLng
      ? [[selEmp.punchInLat, selEmp.punchInLng], [selEmp.punchOutLat, selEmp.punchOutLng]]
      : [];

  const bounds = pins.map((p) => [p.lat, p.lng] as [number, number]);

  if (!isClient) {
    return (
      <div className="h-[520px] w-full rounded-2xl bg-zinc-50 border flex items-center justify-center text-sm text-zinc-400">
        Loading map...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">

      {/* ── Live Status Bar ───────────────────────────────────────────────── */}
      <div className="bg-white border border-zinc-200 rounded-xl px-4 py-2.5 flex flex-wrap items-center gap-3 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          <input type="text" placeholder="Search employee…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 border border-zinc-200 rounded-lg text-xs bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        {/* Role */}
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
          className="py-1.5 px-2 border border-zinc-200 rounded-lg text-xs bg-zinc-50 font-semibold">
          <option value="ALL">All Roles</option>
          {allRoles.map((r) => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
        </select>

        {/* Status */}
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="py-1.5 px-2 border border-zinc-200 rounded-lg text-xs bg-zinc-50 font-semibold">
          <option value="ALL">All Statuses</option>
          {allStatuses.map((s) => <option key={s} value={s}>{STATUS_LABEL[s] ?? s}</option>)}
        </select>

        {/* Sidebar toggle */}
        <button onClick={() => setShowSidebar((v) => !v)}
          className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-50 transition">
          {showSidebar ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {showSidebar ? "Hide" : "Show"} List
        </button>

        {/* Live toggle */}
        <button onClick={() => setPolling((v) => !v)}
          className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg border text-xs font-bold transition ${polling ? "border-emerald-400 text-emerald-700 bg-emerald-50" : "border-zinc-200 text-zinc-500 bg-white"
            }`}>
          {polling ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          {polling ? `Live (${countdown}s)` : "Paused"}
        </button>

        {/* Manual refresh */}
        <button onClick={fetchLive}
          className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-50 transition">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Now
        </button>

        {/* Stats */}
        <div className="flex items-center gap-3 ml-auto text-[11px] font-semibold">
          {fetchError ? (
            <span className="text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Fetch failed</span>
          ) : (
            <span className="text-zinc-400">
              Updated {lastFetch.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
          <span className="text-blue-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{withGPS.length} on map</span>
          {withoutGPS.length > 0 && (
            <span className="text-amber-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{withoutGPS.length} no GPS</span>
          )}
        </div>
      </div>

      {/* ── Main Panel ──────────────────────────────────────────────────── */}
      <div className="flex gap-4" style={{ minHeight: 520 }}>

        {/* Sidebar */}
        {showSidebar && (
          <div className="w-72 flex-shrink-0 bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-3 py-2.5 border-b border-zinc-100 bg-zinc-50 flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
                Employees ({filtered.length})
              </span>
              {selectedId && (
                <button onClick={() => setSelectedId(null)}
                  className="text-[10px] font-bold text-blue-600 hover:underline">Clear</button>
              )}
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-zinc-50">
              {filtered.length === 0 && (
                <div className="p-6 text-center text-xs text-zinc-400 italic">No employees match filters</div>
              )}
              {filtered.map((emp) => {
                const hasGPS = !!(emp.punchInLat || emp.punchOutLat);
                const rc = ROLE_COLORS[emp.role] ?? { bg: "#64748b", text: "#fff" };
                const isSel = selectedId === emp.id;
                return (
                  <button key={emp.id} onClick={() => setSelectedId(isSel ? null : emp.id)}
                    className={`w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-all hover:bg-blue-50 ${isSel ? "bg-blue-50 border-l-2 border-blue-600" : ""}`}>
                    <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5"
                      style={{ background: rc.bg, color: rc.text }}>
                      {emp.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-zinc-800 truncate">{emp.name}</span>
                        <ChevronRight className={`w-3 h-3 flex-shrink-0 transition-transform ${isSel ? "rotate-90 text-blue-600" : "text-zinc-300"}`} />
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: rc.bg + "22", color: rc.bg }}>
                          {emp.role.replace(/_/g, " ")}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
                          {STATUS_LABEL[emp.status] ?? emp.status}
                        </span>
                        {hasGPS
                          ? <span className="text-[9px] font-bold text-blue-600 flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />GPS</span>
                          : <span className="text-[9px] font-bold text-zinc-400 flex items-center gap-0.5"><Navigation className="w-2.5 h-2.5" />No GPS</span>
                        }
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[9px] font-mono">
                        {emp.punchIn && <span className="text-emerald-600 font-bold">▶ {new Date(emp.punchIn).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>}
                        {emp.punchOut && <span className="text-red-500 font-bold">■ {new Date(emp.punchOut).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>}
                        {!emp.punchIn && !emp.punchOut && <span className="text-zinc-400">— No record</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {withoutGPS.length > 0 && (
              <div className="border-t border-zinc-100 px-3 py-2 bg-amber-50">
                <p className="text-[10px] font-bold text-amber-700 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {withoutGPS.length} punched in without GPS
                </p>
                <p className="text-[9px] text-amber-600 mt-0.5 truncate">{withoutGPS.map((e) => e.name).join(", ")}</p>
              </div>
            )}
          </div>
        )}

        {/* Map */}
        <div className="flex-1 relative rounded-xl border border-zinc-200 shadow-sm overflow-hidden" style={{ minHeight: 520 }}>
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

          {/* Live pulse badge */}
          {polling && (
            <div className="absolute top-3 left-3 z-[1000] flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 border border-emerald-300 shadow text-[11px] font-bold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              LIVE — refreshes in {countdown}s
            </div>
          )}



          <MapContainer center={[20.5937, 78.9629]} zoom={5}
            style={{ height: "100%", width: "100%", minHeight: 520, zIndex: 1 }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {routeLine.length === 2 && (
              <Polyline positions={routeLine}
                pathOptions={{ color: "#2563eb", weight: 2, dashArray: "6 4", opacity: 0.8 }} />
            )}

            {pins.map((pin) => (
              <Marker key={pin.id} position={[pin.lat, pin.lng]}
                icon={makeIcon(pin.color, pin.type, pin.empId === selectedId)}
                eventHandlers={{ click: () => setSelectedId(pin.empId) }}>
                <Popup>
                  <div className="p-1 min-w-[170px] space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-zinc-800 text-sm">
                      <User className="w-4 h-4 text-zinc-400" />{pin.name}
                    </div>
                    <div className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
                      {pin.role.replace(/_/g, " ")}
                    </div>
                    <div className="border-t pt-1 flex items-center justify-between text-xs text-zinc-600">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-zinc-400" />
                        {pin.type === "▶" ? "Punch In" : "Punch Out"}
                      </span>
                      <span className="font-bold text-zinc-800">{pin.time}</span>
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono">
                      {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
                    </div>
                    <a href={`https://www.google.com/maps?q=${pin.lat},${pin.lng}`}
                      target="_blank" rel="noreferrer"
                      className="block text-[10px] font-bold text-blue-600 hover:underline">
                      Open in Google Maps ↗
                    </a>
                  </div>
                </Popup>
              </Marker>
            ))}

            <AutoBounds pts={bounds} />
          </MapContainer>

          {/* Legend */}
          <div className="absolute bottom-4 right-4 z-[1000] bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow border border-zinc-200 text-[10px] font-semibold space-y-1">
            <div className="flex items-center gap-1.5 text-zinc-600 font-extrabold uppercase tracking-wider mb-1">
              <Layers className="w-3 h-3" /> Legend
            </div>
            <div className="flex items-center gap-1.5 text-emerald-700"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Punch In</div>
            <div className="flex items-center gap-1.5 text-red-600"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Punch Out</div>
            {Object.entries(ROLE_COLORS).map(([role, c]) => (
              <div key={role} className="flex items-center gap-1.5" style={{ color: c.bg }}>
                <span className="w-3 h-3 rounded-full inline-block" style={{ background: c.bg }} />
                {role.replace(/_/g, " ")}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Selected Employee Card ─────────────────────────────────────── */}
      {selEmp && (
        <div className="bg-white border border-blue-200 rounded-xl p-4 shadow-sm flex flex-wrap gap-6 items-start">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-extrabold"
              style={{ background: ROLE_COLORS[selEmp.role]?.bg ?? "#6b7280", color: ROLE_COLORS[selEmp.role]?.text ?? "#fff" }}>
              {selEmp.name.charAt(0)}
            </div>
            <div>
              <p className="font-extrabold text-zinc-800">{selEmp.name}</p>
              <p className="text-xs text-zinc-500 font-semibold">{selEmp.role.replace(/_/g, " ")}</p>
              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 bg-zinc-100 text-zinc-600">
                {STATUS_LABEL[selEmp.status] ?? selEmp.status}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
            {[
              {
                label: "Punch In", color: "#22c55e",
                value: selEmp.punchIn ? new Date(selEmp.punchIn).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—",
                sub: selEmp.punchInLat ? `${selEmp.punchInLat?.toFixed(4)}, ${selEmp.punchInLng?.toFixed(4)}` : "No GPS"
              },
              {
                label: "Punch Out", color: "#ef4444",
                value: selEmp.punchOut ? new Date(selEmp.punchOut).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—",
                sub: selEmp.punchOutLat ? `${selEmp.punchOutLat?.toFixed(4)}, ${selEmp.punchOutLng?.toFixed(4)}` : "No GPS"
              },
              {
                label: "Duration", color: "#3b82f6",
                value: selEmp.punchIn && selEmp.punchOut
                  ? (() => { const m = Math.floor((new Date(selEmp.punchOut!).getTime() - new Date(selEmp.punchIn!).getTime()) / 60000); return `${Math.floor(m / 60)}h ${m % 60}m`; })()
                  : "—",
                sub: selEmp.punchIn && !selEmp.punchOut ? "Still working" : ""
              },
              {
                label: "Route", color: "#8b5cf6",
                value: routeLine.length === 2 ? "Shown on map" : "N/A",
                sub: routeLine.length === 2 ? "Blue dashed line" : "Need both punches"
              },
            ].map((item) => (
              <div key={item.label} className="space-y-0.5">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">{item.label}</p>
                <p className="text-sm font-bold" style={{ color: item.color }}>{item.value}</p>
                {item.sub && <p className="text-[9px] text-zinc-400 font-mono">{item.sub}</p>}
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            {selEmp.punchInLat && (
              <a href={`https://www.google.com/maps?q=${selEmp.punchInLat},${selEmp.punchInLng}`}
                target="_blank" rel="noreferrer"
                className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1">
                <MapPin className="w-3 h-3" /> View Punch In ↗
              </a>
            )}
            {selEmp.punchOutLat && (
              <a href={`https://www.google.com/maps?q=${selEmp.punchOutLat},${selEmp.punchOutLng}`}
                target="_blank" rel="noreferrer"
                className="text-[11px] font-bold text-red-500 hover:underline flex items-center gap-1">
                <MapPin className="w-3 h-3" /> View Punch Out ↗
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
