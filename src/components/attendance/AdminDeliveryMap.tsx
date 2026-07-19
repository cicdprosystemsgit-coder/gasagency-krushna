"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from "react-leaflet";
import L from "leaflet";
import {
  Clock, MapPin, User, Search, RefreshCw, Eye, EyeOff,
  Navigation, Layers, AlertCircle, Wifi, CheckCircle2, ChevronRight, Map as MapIcon
} from "lucide-react";

// Icons helpers
function makeDivIcon(color: string, label: string, selected: boolean, pulse: boolean = false) {
  const sz = selected ? 36 : 28;
  const ring = selected ? `box-shadow: 0 0 0 3px white, 0 0 0 5px ${color};` : "";
  const pulseClass = pulse ? "animate-pulse" : "";
  const pulseStyle = pulse ? "box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.4);" : "";
  
  return L.divIcon({
    html: `<div class="${pulseClass}" style="background:${color};width:${sz}px;height:${sz}px;border-radius:50%;border:2px solid white;${ring}${pulseStyle}display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,.2)">${label}</div>`,
    className: "custom-leaflet-marker",
    iconSize: [sz, sz],
    iconAnchor: [sz / 2, sz / 2],
    popupAnchor: [0, -sz / 2],
  });
}

// Custom auto bounds helper
function AutoBounds({ pts }: { pts: [number, number][] }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (!done.current && pts.length > 0) {
      map.fitBounds(L.latLngBounds(pts), { padding: [50, 50], maxZoom: 15 });
      done.current = true;
    }
  }, [pts, map]);
  return null;
}

const POLL_MS = 30_000;

export interface DeliveryRecordMap {
  id: string;
  date: string | Date;
  createdAt: string | Date;
  deliveredQty: number;
  returnedQty: number;
  pendingQty: number;
  cashCollected: number;
  paymentMode: string;
  creditAmount: number | null;
  status: string;
  notes: string | null;
  customer: { name: string; phone: string; address: string | null; type: string };
  product: { name: string };
  deliveredBy: { name: string };
  deliveryLat: number | null;
  deliveryLng: number | null;
  deliveryAccuracy: number | null;
}

export interface LiveLocationMap {
  id: string;
  userId: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  updatedAt: string;
  user: { name: string; role: string };
}

export interface AttendanceRecordMap {
  employeeId: string;
  status: string;
  punchIn: string | null;
  punchOut: string | null;
  punchInLat: number | null;
  punchInLng: number | null;
  punchOutLat: number | null;
  punchOutLng: number | null;
}

interface Props {
  initialDeliveries: DeliveryRecordMap[];
  initialLiveLocations: LiveLocationMap[];
  initialAttendance: AttendanceRecordMap[];
  selectedDate: string;
}

export default function AdminDeliveryMap({
  initialDeliveries,
  initialLiveLocations,
  initialAttendance,
  selectedDate,
}: Props) {
  const [isClient, setIsClient] = useState(false);
  const [deliveries, setDeliveries] = useState<DeliveryRecordMap[]>(initialDeliveries);
  const [liveLocations, setLiveLocations] = useState<LiveLocationMap[]>(initialLiveLocations);
  const [attendance, setAttendance] = useState<AttendanceRecordMap[]>(initialAttendance);
  const [lastFetch, setLastFetch] = useState<Date>(new Date());
  const [polling, setPolling] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [countdown, setCountdown] = useState(POLL_MS / 1000);
  const [search, setSearch] = useState("");
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const fetchLive = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/delivery-live?date=${selectedDate}`, { cache: "no-store" });
      if (!res.ok) throw new Error("API error");
      const json = await res.json();
      setDeliveries(json.deliveries ?? []);
      setLiveLocations(json.liveLocations ?? []);
      setAttendance(json.attendanceRecords ?? []);
      setLastFetch(new Date());
      setFetchError(false);
      setCountdown(POLL_MS / 1000);
    } catch {
      setFetchError(true);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (!isClient || !polling) return;
    fetchLive();
    const interval = setInterval(fetchLive, POLL_MS);
    return () => clearInterval(interval);
  }, [isClient, polling, fetchLive]);

  useEffect(() => {
    if (!polling) return;
    const t = setInterval(() => setCountdown((c) => (c <= 1 ? POLL_MS / 1000 : c - 1)), 1000);
    return () => clearInterval(t);
  }, [polling]);

  // Combine lists of active delivery guys
  const deliveryBoysMap = new Map<string, { name: string; live?: LiveLocationMap; attendance?: AttendanceRecordMap }>();
  
  deliveries.forEach((d) => {
    if (d.deliveredBy) {
      if (!deliveryBoysMap.has(d.deliveredBy.name)) {
        deliveryBoysMap.set(d.deliveredBy.name, { name: d.deliveredBy.name });
      }
    }
  });

  liveLocations.forEach((loc) => {
    const name = loc.user.name;
    const existing = deliveryBoysMap.get(name) || { name };
    existing.live = loc;
    deliveryBoysMap.set(name, existing);
  });

  const deliveryBoys = Array.from(deliveryBoysMap.values()) as { name: string; live?: LiveLocationMap; attendance?: AttendanceRecordMap }[];

  // Filter map pins
  const filteredDeliveries = deliveries.filter((d) => {
    if (!d.deliveryLat || !d.deliveryLng) return false;
    const matchesSearch = d.deliveredBy.name.toLowerCase().includes(search.toLowerCase()) ||
      d.customer.name.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const filteredLiveLocations = liveLocations.filter((loc) => {
    return loc.user.name.toLowerCase().includes(search.toLowerCase());
  });

  // Create markers for Leaflet
  const pins: {
    id: string;
    lat: number;
    lng: number;
    color: string;
    type: "DELIVERY" | "LIVE" | "PUNCH_IN";
    label: string;
    name: string;
    details: string;
    time: string;
    accuracy: number | null;
  }[] = [];

  const bounds: [number, number][] = [];

  // Add delivery pins (Orange)
  filteredDeliveries.forEach((d) => {
    if (d.deliveryLat && d.deliveryLng) {
      pins.push({
        id: `delivery-${d.id}`,
        lat: d.deliveryLat,
        lng: d.deliveryLng,
        color: "#F97316", // orange
        type: "DELIVERY",
        label: "📦",
        name: d.deliveredBy.name,
        time: new Date(d.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        accuracy: d.deliveryAccuracy,
        details: `${d.customer.name} - ${d.product.name} (Qty: ${d.deliveredQty})`,
      });
      bounds.push([d.deliveryLat, d.deliveryLng]);
    }
  });

  // Add live heartbeats (Emerald pulsing)
  filteredLiveLocations.forEach((loc) => {
    pins.push({
      id: `live-${loc.id}`,
      lat: loc.lat,
      lng: loc.lng,
      color: "#10B981", // emerald green
      type: "LIVE",
      label: "🟢",
      name: loc.user.name,
      time: new Date(loc.updatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      accuracy: loc.accuracy,
      details: "Live heartbeat coordinates",
    });
    bounds.push([loc.lat, loc.lng]);
  });

  // Add punch in points (Blue Pin)
  attendance.forEach((att) => {
    if (att.punchInLat && att.punchInLng) {
      const dbInfo = liveLocations.find((l) => l.userId === att.employeeId);
      const name = dbInfo?.user.name || "Delivery Boy";
      
      // Filter if name matches search
      if (name.toLowerCase().includes(search.toLowerCase())) {
        pins.push({
          id: `punch-${att.employeeId}`,
          lat: att.punchInLat,
          lng: att.punchInLng,
          color: "#3B82F6", // blue
          type: "PUNCH_IN",
          label: "📍",
          name,
          time: att.punchIn ? new Date(att.punchIn).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—",
          accuracy: null,
          details: "Attendance Punch-in",
        });
        bounds.push([att.punchInLat, att.punchInLng]);
      }
    }
  });

  if (!isClient) {
    return (
      <div className="flex items-center justify-center p-12 border rounded-xl" style={{ minHeight: 520, background: "#FAFAFA" }}>
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-zinc-300 border-t-zinc-600 rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-zinc-500">Initializing Delivery Map Component...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search & Controller Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border bg-white shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-zinc-50 text-zinc-600 border border-zinc-100">
            <MapIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-800">Live Delivery tracking</h3>
            <p className="text-[11px] text-zinc-500 font-semibold">
              Trace GPS logs of delivery actions, punch-ins, and active heartbeats
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search delivery boy or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg text-xs border bg-zinc-50 focus:bg-white focus:outline-none w-56 font-semibold"
            />
          </div>

          {/* Toggle controls */}
          <button
            onClick={() => setPolling(!polling)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition bg-zinc-50 hover:bg-zinc-100"
            style={{ color: polling ? "#10B981" : "#71717A" }}
          >
            {polling ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                Live Polling On
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5 text-zinc-400" />
                Polling Off
              </>
            )}
          </button>

          <button
            onClick={fetchLive}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border hover:bg-zinc-100 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reload
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        {/* Sidebar */}
        {showSidebar && (
          <div className="w-full md:w-80 bg-white rounded-xl border border-zinc-200 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b bg-zinc-50/50 flex items-center justify-between">
              <span className="text-xs font-extrabold text-zinc-700 uppercase tracking-wider">
                Fleet Status ({deliveryBoys.length})
              </span>
            </div>
            
            <div className="flex-1 divide-y divide-zinc-100 overflow-y-auto max-h-[460px]">
              {deliveryBoys.length === 0 ? (
                <div className="p-8 text-center text-zinc-400 text-xs">
                  No active delivery boys today
                </div>
              ) : (
                deliveryBoys.map((boy) => {
                  const hasLive = !!boy.live;
                  return (
                    <div key={boy.name} className="p-3 text-xs flex items-center justify-between hover:bg-zinc-50">
                      <div>
                        <p className="font-extrabold text-zinc-800">{boy.name}</p>
                        <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">
                          {hasLive ? "Pulsing location heartbeat" : "Offline / GPS disconnected"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${hasLive ? "bg-emerald-500 animate-pulse" : "bg-zinc-300"}`} />
                        <span className="text-[10px] font-bold text-zinc-500">
                          {hasLive ? "Active" : "Offline"}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Map view container */}
        <div className="flex-1 relative rounded-xl border border-zinc-200 shadow-sm overflow-hidden" style={{ minHeight: 520 }}>
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

          {/* Polling Countdown Banner */}
          {polling && (
            <div className="absolute top-3 left-3 z-[1000] flex items-center gap-1.5 bg-white/95 backdrop-blur-sm rounded-full px-2.5 py-1 border border-emerald-300 shadow text-[10px] font-bold text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              LIVE — updating in {countdown}s
            </div>
          )}

          {fetchError && (
            <div className="absolute top-3 right-3 z-[1000] flex items-center gap-1 bg-red-50 text-red-700 px-3 py-1 rounded-full border border-red-300 text-[10px] font-bold">
              <AlertCircle className="w-3.5 h-3.5" /> API Connection Failed
            </div>
          )}

          <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: "100%", width: "100%", minHeight: 520, zIndex: 1 }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {pins.map((pin) => (
              <Marker
                key={pin.id}
                position={[pin.lat, pin.lng]}
                icon={makeDivIcon(pin.color, pin.label, pin.id === selectedPinId, pin.type === "LIVE")}
                eventHandlers={{ click: () => setSelectedPinId(pin.id) }}
              >
                <Popup>
                  <div className="p-1 min-w-[180px] space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5 font-extrabold text-zinc-800">
                      <User className="w-3.5 h-3.5 text-zinc-400" />
                      {pin.name}
                    </div>
                    
                    <div className="text-[10px] font-extrabold uppercase text-zinc-400">
                      {pin.type === "LIVE" ? "⚡ Live heartbeat" : pin.type === "PUNCH_IN" ? "📍 Punch in" : "📦 Completed delivery"}
                    </div>

                    <div className="border-t pt-1 space-y-1 text-zinc-600">
                      <div className="font-semibold">{pin.details}</div>
                      <div className="flex items-center justify-between text-[10px] font-bold bg-zinc-50 p-1 rounded border">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-zinc-400" /> Log Time</span>
                        <span className="text-zinc-800">{pin.time}</span>
                      </div>
                      {pin.accuracy && (
                        <div className="text-[9px] text-zinc-400 font-mono">
                          Accuracy: ±{pin.accuracy.toFixed(0)}m
                        </div>
                      )}
                    </div>

                    <a
                      href={`https://www.google.com/maps?q=${pin.lat},${pin.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-[10px] font-bold text-center py-1 rounded bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 transition"
                    >
                      Open in Google Maps ↗
                    </a>
                  </div>
                </Popup>
              </Marker>
            ))}

            <AutoBounds pts={bounds} />
          </MapContainer>

          {/* Legend panel */}
          <div className="absolute bottom-4 right-4 z-[1000] bg-white/95 backdrop-blur-xs rounded-xl px-3 py-2 shadow border border-zinc-200 text-[10px] font-bold space-y-1">
            <div className="flex items-center gap-1.5 text-zinc-400 font-extrabold uppercase tracking-wider border-b pb-1 mb-1">
              <Layers className="w-3 h-3" /> Map Legend
            </div>
            <div className="flex items-center gap-2 text-zinc-600">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F97316] inline-block" />
              Completed Delivery Pin
            </div>
            <div className="flex items-center gap-2 text-zinc-600">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] inline-block animate-pulse" />
              Live Active Heartbeat
            </div>
            <div className="flex items-center gap-2 text-zinc-600">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6] inline-block" />
              Punch-in Location
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
