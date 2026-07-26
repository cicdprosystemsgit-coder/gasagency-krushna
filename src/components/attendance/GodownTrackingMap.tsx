"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Map, AdvancedMarker, InfoWindow, useMap } from "@vis.gl/react-google-maps";
import {
  Clock, MapPin, Search, RefreshCw, Eye, EyeOff,
  Navigation, Layers, AlertCircle, CheckCircle2, ChevronRight, Map as MapIcon,
  LogIn, LogOut, ArrowRight, Truck, Boxes, ShoppingCart
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { GoogleMapsProvider } from "@/components/providers/GoogleMapsProvider";

// Custom auto bounds helper for Google Maps
function AutoBounds({ pts }: { pts: [number, number][] }) {
  const map = useMap();
  const done = useRef(false);

  useEffect(() => {
    if (map && pts.length > 0 && !done.current) {
      const bounds = new google.maps.LatLngBounds();
      pts.forEach(([lat, lng]) => {
        bounds.extend({ lat, lng });
      });
      map.fitBounds(bounds);
      done.current = true;
    }
  }, [pts, map]);

  return null;
}

// Custom Marker styling in Google Maps (uses pure HTML/React children inside AdvancedMarker)
function MarkerPin({ color, label, selected }: { color: string; label: string; selected: boolean }) {
  const sz = selected ? 36 : 28;
  return (
    <div
      style={{
        background: color,
        width: `${sz}px`,
        height: `${sz}px`,
        borderRadius: "50%",
        border: "2px solid white",
        boxShadow: selected
          ? `0 0 0 3px white, 0 0 0 5px ${color}, 0 2px 6px rgba(0,0,0,.2)`
          : "0 2px 6px rgba(0,0,0,.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontSize: "10px",
        fontWeight: "bold",
        transition: "all 0.2s ease-in-out",
        transform: "translate(-50%, -50%)", // Center on coordinate
      }}
    >
      {label}
    </div>
  );
}

const POLL_MS = 30_000;

interface GodownRecordMap {
  id: string;
  vehicleNo: string;
  entryDate: string | Date;
  exitDate: string | Date | null;
  entryLat: number | null;
  entryLng: number | null;
  exitLat: number | null;
  exitLng: number | null;
  status: string;
  submittedBy: { name: string };
  filledCylindersReceived: number;
  emptyCylindersReturned: number;
}

interface TripLogMap {
  id: string;
  date: string | Date;
  departureTime: string | Date | null;
  returnTime: string | Date | null;
  departureLat: number | null;
  departureLng: number | null;
  returnLat: number | null;
  returnLng: number | null;
  tripStatus: string;
  cylindersLoaded: number;
  cylindersReturned: number;
  cylindersDelivered: number;
  vehicle: { vehicleNo: string; vehicleName: string };
  recordedBy: { name: string };
}

interface InventoryMovementMap {
  id: string;
  date: string | Date;
  moveType: "RECEIVED" | "DISPATCHED";
  qty: number;
  batchNo: string | null;
  notes: string | null;
  recordLat: number | null;
  recordLng: number | null;
  product: { name: string };
  recordedBy: { name: string };
}

interface Props {
  initialRecords: GodownRecordMap[];
  initialTrips: TripLogMap[];
  initialMovements: InventoryMovementMap[];
  selectedDate: string;
}

function GodownTrackingMapContent({
  initialRecords,
  initialTrips,
  initialMovements,
  selectedDate,
}: Props) {
  const [isClient, setIsClient] = useState(false);
  const [records, setRecords] = useState<GodownRecordMap[]>(initialRecords);
  const [trips, setTrips] = useState<TripLogMap[]>(initialTrips);
  const [movements, setMovements] = useState<InventoryMovementMap[]>(initialMovements);
  
  const [lastFetch, setLastFetch] = useState<Date>(new Date());
  const [polling, setPolling] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [countdown, setCountdown] = useState(POLL_MS / 1000);
  const [search, setSearch] = useState("");
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);

  // Layers state
  const [showRecords, setShowRecords] = useState(true);
  const [showTrips, setShowTrips] = useState(true);
  const [showMovements, setShowMovements] = useState(true);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const fetchLive = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/godown-live?date=${selectedDate}`, { cache: "no-store" });
      if (!res.ok) throw new Error("API error");
      const json = await res.json();
      setRecords(json.godownRecords ?? []);
      setTrips(json.tripLogs ?? []);
      setMovements(json.inventoryMovements ?? []);
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

  // Extract all points for auto-bounds and markers
  const mapPoints: {
    id: string;
    type: "RECORD_ENTRY" | "RECORD_EXIT" | "TRIP_DEP" | "TRIP_RET" | "MOVEMENT";
    lat: number;
    lng: number;
    title: string;
    subtitle: string;
    time: Date | string;
    color: string;
    label: string;
    details: any;
  }[] = [];

  if (showRecords) {
    records.forEach(r => {
      if (r.entryLat && r.entryLng) {
        mapPoints.push({
          id: `${r.id}-entry`,
          type: "RECORD_ENTRY",
          lat: r.entryLat,
          lng: r.entryLng,
          title: `Supply Vehicle Entry: ${r.vehicleNo}`,
          subtitle: `Entered at ${formatDateTime(r.entryDate)}`,
          time: r.entryDate,
          color: "#2563EB", // Blue
          label: "VE",
          details: r,
        });
      }
      if (r.exitLat && r.exitLng && r.exitDate) {
        mapPoints.push({
          id: `${r.id}-exit`,
          type: "RECORD_EXIT",
          lat: r.exitLat,
          lng: r.exitLng,
          title: `Supply Vehicle Exit: ${r.vehicleNo}`,
          subtitle: `Exited at ${formatDateTime(r.exitDate)}`,
          time: r.exitDate,
          color: "#F59E0B", // Orange/Amber
          label: "VX",
          details: r,
        });
      }
    });
  }

  if (showTrips) {
    trips.forEach(t => {
      if (t.departureLat && t.departureLng && t.departureTime) {
        mapPoints.push({
          id: `${t.id}-dep`,
          type: "TRIP_DEP",
          lat: t.departureLat,
          lng: t.departureLng,
          title: `Internal Trip Departure: ${t.vehicle.vehicleNo}`,
          subtitle: `Departed at ${formatDateTime(t.departureTime)}`,
          time: t.departureTime,
          color: "#8B5CF6", // Purple
          label: "TD",
          details: t,
        });
      }
      if (t.returnLat && t.returnLng && t.returnTime) {
        mapPoints.push({
          id: `${t.id}-ret`,
          type: "TRIP_RET",
          lat: t.returnLat,
          lng: t.returnLng,
          title: `Internal Trip Return: ${t.vehicle.vehicleNo}`,
          subtitle: `Returned at ${formatDateTime(t.returnTime)}`,
          time: t.returnTime,
          color: "#EC4899", // Pink
          label: "TR",
          details: t,
        });
      }
    });
  }

  if (showMovements) {
    movements.forEach(m => {
      if (m.recordLat && m.recordLng) {
        mapPoints.push({
          id: m.id,
          type: "MOVEMENT",
          lat: m.recordLat,
          lng: m.recordLng,
          title: `${m.moveType === "RECEIVED" ? "Stock Received" : "Stock Dispatched"}: ${m.product.name}`,
          subtitle: `${m.qty} pcs - Recorded at ${formatDateTime(m.date)}`,
          time: m.date,
          color: m.moveType === "RECEIVED" ? "#10B981" : "#EF4444", // Green / Red
          label: m.moveType === "RECEIVED" ? "MR" : "MD",
          details: m,
        });
      }
    });
  }

  // Filter map points based on search
  const filteredPoints = mapPoints.filter(p => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      p.title.toLowerCase().includes(q) ||
      p.subtitle.toLowerCase().includes(q) ||
      (p.details.recordedBy?.name || "").toLowerCase().includes(q) ||
      (p.details.submittedBy?.name || "").toLowerCase().includes(q)
    );
  });

  const allLatLngs: [number, number][] = filteredPoints.map(p => [p.lat, p.lng]);

  const activePoint = mapPoints.find(p => p.id === selectedPinId);

  if (!isClient) {
    return (
      <div className="w-full h-[600px] bg-slate-100 flex items-center justify-center rounded-xl border border-slate-200">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
          <p className="text-[13px] font-medium text-slate-500">Initializing Map View...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm flex flex-col lg:flex-row h-[680px]">
      {/* Sidebar */}
      {showSidebar && (
        <div className="w-full lg:w-96 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col h-1/2 lg:h-full bg-slate-50/50">
          <div className="p-4 border-b border-slate-200 bg-white">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-bold text-slate-800">Godown Tracking Feed</h3>
              <button
                onClick={fetchLive}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
                title="Refresh logs"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search vehicles, products, keepers..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500 bg-white"
              />
            </div>

            {/* Filter checkboxes */}
            <div className="flex items-center gap-4 mt-3 text-[11px] font-semibold text-slate-500">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={showRecords} onChange={e => setShowRecords(e.target.checked)} className="accent-blue-500" />
                <span className="text-blue-600">Supply In/Out</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={showTrips} onChange={e => setShowTrips(e.target.checked)} className="accent-purple-500" />
                <span className="text-purple-600">Internal Trips</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={showMovements} onChange={e => setShowMovements(e.target.checked)} className="accent-emerald-500" />
                <span className="text-emerald-600">Inventory</span>
              </label>
            </div>
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-white">
            {filteredPoints.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <MapPin className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-[13px]">No tracked geo-actions found</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Adjust filters or search query</p>
              </div>
            ) : (
              filteredPoints.map(p => {
                const isSelected = selectedPinId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPinId(p.id)}
                    className={`w-full text-left p-3.5 transition-all flex items-start gap-3 border-l-4 ${
                      isSelected
                        ? "bg-slate-50 border-l-blue-600"
                        : "border-l-transparent hover:bg-slate-50/50"
                    }`}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-sm"
                      style={{ background: p.color }}
                    >
                      {p.label}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-[13px] font-bold text-slate-800 truncate">{p.title}</p>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          {new Date(p.time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">{p.subtitle}</p>
                      
                      {isSelected && (
                        <div className="mt-2.5 p-2 bg-slate-100/80 rounded-lg text-[11px] text-slate-600 space-y-1">
                          <p><strong>Keeper:</strong> {p.details.recordedBy?.name || p.details.submittedBy?.name || "System"}</p>
                          <p>
                            <strong>Google Maps:</strong>{" "}
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 font-bold hover:underline inline-flex items-center gap-0.5"
                            >
                              Open Link <Navigation className="w-2.5 h-2.5" />
                            </a>
                          </p>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              Live auto-sync: {polling ? `Auto (${countdown}s)` : "Paused"}
            </span>
            <span>Last update: {lastFetch.toLocaleTimeString()}</span>
          </div>
        </div>
      )}

      {/* Map pane */}
      <div className="flex-1 relative h-1/2 lg:h-full">
        {/* Toggle sidebar button */}
        <button
          onClick={() => setShowSidebar(s => !s)}
          className="absolute left-3 top-3 z-[1000] p-2 bg-white rounded-lg shadow-md border border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-all"
          title={showSidebar ? "Hide sidebar" : "Show sidebar"}
        >
          <MapIcon className="w-4 h-4" />
        </button>

        {/* Map Container */}
        <Map
          defaultCenter={{ lat: 18.5204, lng: 73.8567 }}
          defaultZoom={13}
          style={{ width: "100%", height: "100%" }}
          mapId="DEMO_MAP_ID"
        >
          {allLatLngs.length > 0 && <AutoBounds pts={allLatLngs} />}

          {filteredPoints.map(p => (
            <AdvancedMarker
              key={p.id}
              position={{ lat: p.lat, lng: p.lng }}
              onClick={() => setSelectedPinId(p.id)}
            >
              <MarkerPin color={p.color} label={p.label} selected={selectedPinId === p.id} />
            </AdvancedMarker>
          ))}

          {activePoint && (
            <InfoWindow
              position={{ lat: activePoint.lat, lng: activePoint.lng }}
              onCloseClick={() => setSelectedPinId(null)}
            >
              <div className="p-1 min-w-[200px]">
                <p className="text-[12px] font-bold text-slate-800 border-b pb-1 mb-1.5 flex items-center gap-1.5">
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white"
                    style={{ background: activePoint.color }}
                  >
                    {activePoint.label}
                  </span>
                  {activePoint.title}
                </p>
                <p className="text-[11px] text-slate-600 mb-1">{activePoint.subtitle}</p>
                <p className="text-[11px] text-slate-500 mb-2">
                  Keeper: <strong>{activePoint.details.recordedBy?.name || activePoint.details.submittedBy?.name || "System"}</strong>
                </p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${activePoint.lat},${activePoint.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold transition-all"
                >
                  View on Google Maps <Navigation className="w-3 h-3" />
                </a>
              </div>
            </InfoWindow>
          )}
        </Map>

        {/* Floating Quick Stats */}
        <div className="absolute right-3 top-3 z-[1000] bg-white/95 backdrop-blur-xs p-2.5 rounded-lg border border-slate-200 shadow-md text-[11px] space-y-1.5 pointer-events-none hidden md:block">
          <p className="font-bold text-slate-700 uppercase tracking-wide text-[9px] border-b pb-1">Operations (Map)</p>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <span className="text-slate-600">Supply Vehicle Entry ({filteredPoints.filter(p => p.type === "RECORD_ENTRY").length})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span className="text-slate-600">Supply Vehicle Exit ({filteredPoints.filter(p => p.type === "RECORD_EXIT").length})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
            <span className="text-slate-600">Internal Departures ({filteredPoints.filter(p => p.type === "TRIP_DEP").length})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-500"></span>
            <span className="text-slate-600">Internal Returns ({filteredPoints.filter(p => p.type === "TRIP_RET").length})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="text-slate-600">Inventory Movements ({filteredPoints.filter(p => p.type === "MOVEMENT").length})</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GodownTrackingMap(props: Props) {
  return (
    <GoogleMapsProvider>
      <GodownTrackingMapContent {...props} />
    </GoogleMapsProvider>
  );
}
