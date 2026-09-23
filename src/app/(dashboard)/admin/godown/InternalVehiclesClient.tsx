import { useState, useTransition, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { formatDateTime } from "@/lib/utils";
import {
  Plus, Minus, X, HelpCircle, Truck, User, Edit2, Activity,
  CheckCircle2, RotateCcw, ArrowUpRight, AlertCircle, Navigation,
  Clock, Fuel, Trash2
} from "lucide-react";
import {
  createDeliveryVehicle,
  updateDeliveryVehicle,
  createVehicleTripLog,
  updateTripStatus,
  updateTripLog,
  softDeleteTripLog,
  restoreTripLog,
  permanentDeleteTripLog,
} from "@/app/actions/delivery-vehicles";
import { addCylinderType } from "@/app/actions/godown";
import { fulfillDeliveryCountRequest } from "@/app/actions/delivery-count-requests";
import { useGodownGps } from "@/hooks/useGodownGps";
import { LocationStatusCard } from "@/components/ui/GpsStatusBox";
import type { GodownDeliveryRequest } from "../../godown-keeper/delivery-requests/DeliveryRequestsClient";

interface Product {
  id: string;
  name: string;
}

interface CylinderRowItem {
  id: string;
  productId: string;
  productName: string;
  loaded: number;
  unsoldReturned: number;
  emptyReturned: number;
  isNewReturnItem?: boolean;
}

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
  items?: unknown;
  departureLat?: number | null;
  departureLng?: number | null;
  departureAccuracy?: number | null;
  returnLat?: number | null;
  returnLng?: number | null;
  returnAccuracy?: number | null;
  isDeleted?: boolean;
  deletedAt?: Date | string | null;
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

function getTripItems(t: TripLog): CylinderRowItem[] {
  if (!t.items) return [];
  if (typeof t.items === "string") {
    try {
      const parsed = JSON.parse(t.items);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  if (Array.isArray(t.items)) {
    return t.items as CylinderRowItem[];
  }
  return [];
}

export function InternalVehiclesClient({
  initialVehicles,
  initialTripLogs,
  initialDeletedTripLogs = [],
  deliveryBoys,
  isAdmin,
  userId,
  userRole = "ADMIN",
  cylinderTypes = [],
  selectedDate,
  deliveryRequests = [],
  products = [],
}: {
  initialVehicles: DeliveryVehicle[];
  initialTripLogs: TripLog[];
  initialDeletedTripLogs?: TripLog[];
  deliveryBoys: DeliveryBoy[];
  isAdmin: boolean;
  userId: string;
  userRole?: string;
  cylinderTypes?: Product[];
  selectedDate?: string;
  deliveryRequests?: GodownDeliveryRequest[];
  products?: Product[];
}) {
  const router = useRouter();
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [tripLogs, setTripLogs] = useState(initialTripLogs);
  const [deletedTripLogs, setDeletedTripLogs] = useState<TripLog[]>(initialDeletedTripLogs);
  const confirm = useConfirm();

  const canDelete = isAdmin || userRole === "MANAGER";
  const canPermanentDelete = isAdmin;

  useEffect(() => {
    setTripLogs(initialTripLogs);
  }, [initialTripLogs]);

  useEffect(() => {
    setDeletedTripLogs(initialDeletedTripLogs);
  }, [initialDeletedTripLogs]);

  useEffect(() => {
    setVehicles(initialVehicles);
  }, [initialVehicles]);

  const [activeTab, setActiveTab] = useState<"vehicles" | "trips" | "deleted_trips">("trips");
  const [vehicleModal, setVehicleModal] = useState(false);
  const [tripModal, setTripModal] = useState(false);
  const [updateModal, setUpdateModal] = useState<TripLog | null>(null);
  const [editVehicle, setEditVehicle] = useState<DeliveryVehicle | null>(null);
  const [editTripLogId, setEditTripLogId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [productsState, setProductsState] = useState<Product[]>(cylinderTypes);
  const [departureItems, setDepartureItems] = useState<CylinderRowItem[]>([]);
  const [returnItems, setReturnItems] = useState<CylinderRowItem[]>([]);

  // Vehicle Loading Modal for Delivery Boy requests
  const [loadingModalRequest, setLoadingModalRequest] = useState<GodownDeliveryRequest | null>(null);
  const [loadItems, setLoadItems] = useState<Array<{ productId: string; productName: string; loadedQty: number }>>([]);
  const [fuelLitres, setFuelLitres] = useState<string>("");
  const [fuelAmount, setFuelAmount] = useState<string>("");
  const [fuelType, setFuelType] = useState<string>("Petrol");
  const [godownNotes, setGodownNotes] = useState<string>("");
  const [loadModalError, setLoadModalError] = useState<string>("");

  const openLoadModal = (req: GodownDeliveryRequest) => {
    setLoadingModalRequest(req);
    setLoadItems(
      req.items.map((it) => ({
        productId: it.productId,
        productName: it.productName,
        loadedQty: it.requestedQty,
      }))
    );
    setFuelLitres("");
    setFuelAmount("");
    setFuelType(req.deliveryBoy.vehicle?.vehicleType === "Two-Wheeler" ? "Petrol" : "Diesel");
    setGodownNotes("");
    setLoadModalError("");
  };

  const handleLoadedQtyChange = (idx: number, val: number) => {
    const updated = [...loadItems];
    updated[idx] = { ...updated[idx], loadedQty: Math.max(0, val) };
    setLoadItems(updated);
  };

  const handleAddExtraProduct = () => {
    const available = (products.length > 0 ? products : productsState).find(
      (p) => !loadItems.some((li) => li.productId === p.id)
    );
    const target = available || (products.length > 0 ? products[0] : productsState[0]);
    if (target) {
      setLoadItems([...loadItems, { productId: target.id, productName: target.name, loadedQty: 1 }]);
    }
  };

  const handleRemoveLoadItem = (idx: number) => {
    if (loadItems.length <= 1) return;
    setLoadItems(loadItems.filter((_, i) => i !== idx));
  };

  const handleFulfillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loadingModalRequest) return;
    setLoadModalError("");

    const validItems = loadItems.filter((it) => Number(it.loadedQty) > 0);
    if (validItems.length === 0) {
      setLoadModalError("At least one product must have loaded quantity > 0");
      return;
    }

    startTransition(async () => {
      const res = await fulfillDeliveryCountRequest(loadingModalRequest.id, {
        fulfilledItems: validItems,
        fuelLitres: fuelLitres ? Number(fuelLitres) : undefined,
        fuelAmount: fuelAmount ? Number(fuelAmount) : undefined,
        fuelType: fuelLitres ? fuelType : undefined,
        godownNotes,
      });

      if (res.error) {
        setLoadModalError(res.error);
        toast.error(res.error);
      } else {
        toast.success(`Vehicle successfully loaded & dispatched for ${loadingModalRequest.deliveryBoy.name}!`);
        setLoadingModalRequest(null);
        router.refresh();
      }
    });
  };

  const [addTypeOpen, setAddTypeOpen] = useState(false);
  const [addTypeCallback, setAddTypeCallback] = useState<((p: Product) => void) | null>(null);

  const departureGps = useGodownGps();
  const returnGps = useGodownGps();

  // Location is NOT auto-captured — user must tap the "Get My Location" button.
  // departureGps and returnGps are reset when their modals open so each fresh modal shows the idle CTA.

  const openAddType = useCallback((cb: (p: Product) => void) => {
    setAddTypeCallback(() => cb);
    setAddTypeOpen(true);
  }, []);

  function handleTypeAdded(p: Product) {
    setProductsState((prev) => [...prev, p]);
    addTypeCallback?.(p);
    setAddTypeCallback(null);
  }

  function newDepartureRow(products: Product[]): CylinderRowItem {
    const p = products[0];
    return {
      id: Math.random().toString(36).substring(2, 9),
      productId: p?.id ?? "",
      productName: p?.name ?? "",
      loaded: 10,
      unsoldReturned: 0,
      emptyReturned: 0,
    };
  }

  function newReturnRow(products: Product[]): CylinderRowItem {
    const p = products[0];
    return {
      id: Math.random().toString(36).substring(2, 9),
      productId: p?.id ?? "",
      productName: p?.name ?? "",
      loaded: 0,
      unsoldReturned: 0,
      emptyReturned: 0,
      isNewReturnItem: true,
    };
  }

  const getLocalDateString = (d: Date = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getLocalDateTimeString = (d: Date = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [vForm, setVForm] = useState({ vehicleNo: "", vehicleName: "", vehicleType: "Two-Wheeler", assignedToId: "", notes: "", status: "ACTIVE" });
  const [tForm, setTForm] = useState({ vehicleId: "", date: getLocalDateString(), departureTime: getLocalDateTimeString(), notes: "" });
  const [uForm, setUForm] = useState({ tripStatus: "RETURNED", returnTime: getLocalDateTimeString(), notes: "" });

  const todayTrips = tripLogs.filter((t) => getLocalDateString(new Date(t.date)) === getLocalDateString());
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
    if (departureItems.length === 0) { setError("Please add at least one cylinder type"); return; }
    if (departureItems.some(item => !item.productId)) { setError("Please select a cylinder type for all loaded rows"); return; }

    const fd = new FormData();
    Object.entries(tForm).forEach(([k, v]) => fd.append(k, v));
    
    const totalLoaded = departureItems.reduce((sum, r) => sum + r.loaded, 0);
    fd.append("cylindersLoaded", String(totalLoaded));
    fd.append("items", JSON.stringify(departureItems.map(item => ({
      productId: item.productId,
      productName: item.productName,
      loaded: item.loaded,
      unsoldReturned: item.unsoldReturned || 0,
      emptyReturned: item.emptyReturned || 0
    }))));

    if (departureGps.gps.lat !== null) fd.append("departureLat", String(departureGps.gps.lat));
    if (departureGps.gps.lng !== null) fd.append("departureLng", String(departureGps.gps.lng));
    if (departureGps.gps.accuracy !== null) fd.append("departureAccuracy", String(departureGps.gps.accuracy));

    startTransition(async () => {
      const result = editTripLogId
        ? await updateTripLog(editTripLogId, fd)
        : await createVehicleTripLog(fd);
      if (result.error) { setError(result.error); return; }
      if (result.tripLog) {
        setTripLogs((prev) =>
          editTripLogId
            ? prev.map((t) => (t.id === result.tripLog!.id ? (result.tripLog! as TripLog) : t))
            : [result.tripLog!, ...prev]
        );
        setTripModal(false);
        setEditTripLogId(null);
        setDepartureItems([]);
      }
    });
  }

  function openModifyDeparture(t: TripLog) {
    setEditTripLogId(t.id);
    let initialDepartureItems: CylinderRowItem[] = [];
    if (t.items) {
      try {
        const parsed = typeof t.items === "string" ? JSON.parse(t.items) : t.items;
        if (Array.isArray(parsed)) {
          initialDepartureItems = parsed.map((item: any) => ({
            id: Math.random().toString(36).substring(2, 9),
            productId: item.productId || "",
            productName: item.productName || "",
            loaded: Number(item.loaded) || 0,
            unsoldReturned: Number(item.unsoldReturned) || 0,
            emptyReturned: Number(item.emptyReturned) || 0,
          }));
        }
      } catch (e) {
        console.error("Failed to parse trip items:", e);
      }
    }
    setDepartureItems(initialDepartureItems);
    setTForm({
      vehicleId: t.vehicleId,
      date: new Date(t.date).toISOString().slice(0, 10),
      departureTime: t.departureTime ? new Date(t.departureTime).toISOString().slice(0, 16) : "",
      notes: t.notes ?? "",
    });
    setError("");
    setTripModal(true);
    departureGps.resetGps();
  }

  function openUpdateTrip(t: TripLog) {
    setUpdateModal(t);
    let initialReturnItems: CylinderRowItem[] = [];
    if (t.items) {
      try {
        const parsed = typeof t.items === "string" ? JSON.parse(t.items) : t.items;
        if (Array.isArray(parsed)) {
          initialReturnItems = parsed.map((item: any) => ({
            id: Math.random().toString(36).substring(2, 9),
            productId: item.productId || "",
            productName: item.productName || "",
            loaded: Number(item.loaded) || 0,
            unsoldReturned: Number(item.unsoldReturned) || 0,
            emptyReturned: Number(item.emptyReturned) || 0,
          }));
        }
      } catch (e) {
        console.error("Failed to parse trip items:", e);
      }
    }

    if (initialReturnItems.length === 0 && t.cylindersLoaded > 0) {
      const defaultProduct = productsState[0];
      initialReturnItems = [{
        id: Math.random().toString(36).substring(2, 9),
        productId: defaultProduct?.id ?? "",
        productName: defaultProduct?.name ?? "Cylinder",
        loaded: t.cylindersLoaded,
        unsoldReturned: 0,
        emptyReturned: t.cylindersLoaded,
      }];
    }

    setReturnItems(initialReturnItems);
    setUForm({
      tripStatus: t.tripStatus === "LOADED" || t.tripStatus === "OUT_FOR_DELIVERY" ? "RETURNED" : t.tripStatus,
      returnTime: t.returnTime ? new Date(t.returnTime).toISOString().slice(0, 16) : getLocalDateTimeString(),
      notes: t.notes ?? "",
    });
    setError("");
  }

  function handleUpdateTrip(e: React.FormEvent) {
    e.preventDefault();
    if (!updateModal) return;
    if (returnItems.length === 0) { setError("Please add at least one cylinder type"); return; }
    if (returnItems.some(item => !item.productId)) { setError("Please select a cylinder type for all reconciliation rows"); return; }

    const fd = new FormData();
    fd.append("tripStatus", uForm.tripStatus);
    fd.append("returnTime", uForm.returnTime);
    fd.append("notes", uForm.notes);
    
    fd.append("items", JSON.stringify(returnItems.map(item => ({
      productId: item.productId,
      productName: item.productName,
      loaded: item.loaded,
      unsoldReturned: item.unsoldReturned,
      emptyReturned: item.emptyReturned
    }))));

    const emptyReturnedTotal = returnItems.reduce((sum, r) => sum + r.emptyReturned, 0);
    const unsoldReturnedTotal = returnItems.reduce((sum, r) => sum + r.unsoldReturned, 0);
    fd.append("cylindersReturned", String(unsoldReturnedTotal));
    fd.append("cylindersDelivered", String(emptyReturnedTotal));

    if (returnGps.gps.lat !== null) fd.append("returnLat", String(returnGps.gps.lat));
    if (returnGps.gps.lng !== null) fd.append("returnLng", String(returnGps.gps.lng));
    if (returnGps.gps.accuracy !== null) fd.append("returnAccuracy", String(returnGps.gps.accuracy));

    startTransition(async () => {
      const result = await updateTripStatus(updateModal.id, fd);
      if (result.error) { setError(result.error); return; }
      if (result.tripLog) {
        setTripLogs((prev) => prev.map((t) => t.id === result.tripLog!.id ? result.tripLog! as TripLog : t));
        setUpdateModal(null);
      }
    });
  }

  // ── Soft Delete Trip Log ──
  async function handleSoftDeleteTripLog(t: TripLog) {
    const ok = await confirm({
      title: "Delete Internal Trip Log",
      message: `Are you sure you want to move the trip log for vehicle "${t.vehicle.vehicleNo}" to deleted records? You can restore it later from the Deleted Trips tab.`,
      confirmText: "Delete Trip Log",
      variant: "danger",
    });
    if (!ok) return;
    startTransition(async () => {
      const res = await softDeleteTripLog(t.id);
      if (res.success) {
        setTripLogs((prev) => prev.filter((item) => item.id !== t.id));
        setDeletedTripLogs((prev) => [{ ...t, isDeleted: true, deletedAt: new Date().toISOString() }, ...prev]);
        toast.success(`Trip log for vehicle ${t.vehicle.vehicleNo} moved to deleted records.`);
      } else {
        toast.error(res.error || "Failed to delete trip log");
      }
    });
  }

  // ── Restore Trip Log ──
  async function handleRestoreTripLog(t: TripLog) {
    const ok = await confirm({
      title: "Restore Internal Trip Log",
      message: `Are you sure you want to restore the trip log for vehicle "${t.vehicle.vehicleNo}" back to active trips?`,
      confirmText: "Restore Trip Log",
      variant: "primary",
    });
    if (!ok) return;
    startTransition(async () => {
      const res = await restoreTripLog(t.id);
      if (res.success) {
        setDeletedTripLogs((prev) => prev.filter((item) => item.id !== t.id));
        const restored = res.tripLog || { ...t, isDeleted: false, deletedAt: null };
        setTripLogs((prev) => [restored as TripLog, ...prev]);
        toast.success(`Trip log for vehicle ${t.vehicle.vehicleNo} restored successfully.`);
      } else {
        toast.error(res.error || "Failed to restore trip log");
      }
    });
  }

  // ── Permanent Delete Trip Log ──
  async function handlePermanentDeleteTripLog(t: TripLog) {
    const ok = await confirm({
      title: "Permanently Delete Trip Log",
      message: `WARNING: This action is permanent and cannot be undone! The trip log for vehicle "${t.vehicle.vehicleNo}" will be completely removed from the database. Are you absolutely sure?`,
      confirmText: "Permanently Delete",
      variant: "danger",
    });
    if (!ok) return;
    startTransition(async () => {
      const res = await permanentDeleteTripLog(t.id);
      if (res.success) {
        setDeletedTripLogs((prev) => prev.filter((item) => item.id !== t.id));
        toast.success(`Trip log for vehicle ${t.vehicle.vehicleNo} permanently deleted.`);
      } else {
        toast.error(res.error || "Failed to permanently delete trip log");
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
      <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg mb-4" style={{ background: "#F4F4F5", width: "fit-content" }}>
        {(["trips", "vehicles", "deleted_trips"] as const).map((tab) => {
          const label = tab === "trips" ? "Today's Trips" : tab === "vehicles" ? "Vehicle Fleet" : "Deleted Trips";
          const count = tab === "deleted_trips" ? deletedTripLogs.length : undefined;
          return (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="px-4 py-1.5 rounded-md text-[13px] font-medium transition-all flex items-center gap-1.5"
              style={activeTab === tab ? { background: tab === "deleted_trips" ? "#FEF2F2" : "#fff", color: tab === "deleted_trips" ? "#DC2626" : "#18181B", boxShadow: "0 1px 2px rgba(0,0,0,0.08)" } : { color: tab === "deleted_trips" && deletedTripLogs.length > 0 ? "#DC2626" : "#71717A" }}>
              <span>{label}</span>
              {count !== undefined && count > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TODAY TRIPS TAB */}
      {activeTab === "trips" && (
        <>
          {/* Approved Vehicle Loading Banner */}
          {deliveryRequests.filter((r) => r.status === "APPROVED").length > 0 && (
            <div className="mb-4 p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-900">
                    {deliveryRequests.filter((r) => r.status === "APPROVED").length} Vehicle(s) Approved & Ready for Cylinder Loading
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Delivery count requests approved by admin. Load vehicles directly from the Fleet tab to synchronize trip logs and fuel.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab("vehicles")}
                className="btn text-xs font-bold bg-white text-blue-700 border border-blue-200 hover:bg-blue-50 py-1.5 px-3 rounded-lg shadow-2xs whitespace-nowrap"
              >
                View Fleet ({deliveryRequests.filter((r) => r.status === "APPROVED").length})
              </button>
            </div>
          )}

          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>Internal vehicle trip log</p>
            <button onClick={() => {
              setError("");
              if (productsState.length > 0) {
                setDepartureItems([newDepartureRow(productsState)]);
              } else {
                setDepartureItems([]);
              }
              setTForm({
                vehicleId: "",
                date: getLocalDateString(),
                departureTime: getLocalDateTimeString(),
                notes: ""
              });
              setTripModal(true);
            departureGps.resetGps(); // Reset so idle CTA shows fresh each time
            }} className="btn btn-primary">
              <Plus className="w-3.5 h-3.5" /> Record Departure
            </button>
          </div>
          <div className="rounded-lg overflow-hidden" style={{ background: "#fff", border: "1px solid #E4E4E7", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr>
                  <th>Vehicle</th><th>Delivery Boy</th><th>Cylinders Loaded</th>
                  <th>Departure</th><th>Return</th><th>Delivered</th><th>Returned</th>
                  <th className="text-center">Status</th>
                  <th className="text-center">GPS</th>
                  <th className="text-center">Action</th>
                </tr></thead>
                <tbody>
                  {tripLogs.length === 0 ? (
                    <tr><td colSpan={10} className="py-14 text-center">
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
                      <td className="text-center">
                        <span className="font-bold text-[13px]" style={{ color: "#2563EB" }}>{t.cylindersLoaded}</span>
                        {getTripItems(t).length > 0 && (
                          <div className="text-[10px] text-slate-400 font-normal mt-0.5 whitespace-nowrap">
                            {getTripItems(t).map((it, idx) => (
                              <div key={idx}>{it.productName}: {it.loaded}</div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="muted text-[12px]">{t.departureTime ? formatDateTime(t.departureTime) : "—"}</td>
                      <td className="muted text-[12px]">{t.returnTime ? formatDateTime(t.returnTime) : "—"}</td>
                      <td className="text-center font-bold" style={{ color: "#16A34A" }}>
                        <span>{t.cylindersDelivered || "—"}</span>
                        {getTripItems(t).length > 0 && t.cylindersDelivered > 0 && (
                          <div className="text-[10px] text-slate-400 font-normal mt-0.5 whitespace-nowrap">
                            {getTripItems(t).filter(it => it.emptyReturned > 0).map((it, idx) => (
                              <div key={idx}>{it.productName}: {it.emptyReturned}</div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="text-center font-bold" style={{ color: "#D97706" }}>
                        <span>{t.cylindersReturned || "—"}</span>
                        {getTripItems(t).length > 0 && t.cylindersReturned > 0 && (
                          <div className="text-[10px] text-slate-400 font-normal mt-0.5 whitespace-nowrap">
                            {getTripItems(t).filter(it => it.unsoldReturned > 0).map((it, idx) => (
                              <div key={idx}>{it.productName}: {it.unsoldReturned}</div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="text-center">
                        <span className={`badge ${TRIP_STATUS_COLORS[t.tripStatus] ?? "badge-neutral"}`}>
                          {TRIP_STATUS_LABELS[t.tripStatus] ?? t.tripStatus}
                        </span>
                      </td>
                      <td className="text-center py-4">
                        <div className="flex flex-col gap-1 items-center justify-center">
                          {t.departureLat && t.departureLng ? (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${t.departureLat},${t.departureLng}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] font-bold text-purple-600 bg-purple-50 border border-purple-200 rounded px-1.5 py-0.5 hover:bg-purple-100 transition-all inline-flex items-center gap-0.5 whitespace-nowrap"
                              title="Departure Geolocation"
                            >
                              Dep <Navigation className="w-2.5 h-2.5" />
                            </a>
                          ) : null}
                          {t.returnLat && t.returnLng ? (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${t.returnLat},${t.returnLng}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] font-bold text-pink-600 bg-pink-50 border border-pink-200 rounded px-1.5 py-0.5 hover:bg-pink-100 transition-all inline-flex items-center gap-0.5 whitespace-nowrap"
                              title="Return Geolocation"
                            >
                              Ret <Navigation className="w-2.5 h-2.5" />
                            </a>
                          ) : null}
                          {!t.departureLat && !t.returnLat && <span className="text-[11px] text-slate-400 italic">—</span>}
                        </div>
                      </td>
                      <td className="text-center py-4">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* Edit Departure */}
                          <button
                            onClick={() => openModifyDeparture(t)}
                            disabled={isPending}
                            className="btn text-[11px] py-1 px-2 border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold inline-flex items-center gap-0.5 shadow-2xs whitespace-nowrap"
                            title="Modify Departure details"
                          >
                            <Edit2 className="w-3 h-3" /> Edit Dep
                          </button>

                          {/* Record Return for incomplete trips */}
                          {(t.tripStatus === "LOADED" || t.tripStatus === "OUT_FOR_DELIVERY") && (
                            <button
                              onClick={() => openUpdateTrip(t)}
                              disabled={isPending}
                              className="btn text-[11px] py-1 px-2 border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold inline-flex items-center gap-0.5 shadow-2xs whitespace-nowrap"
                              title="Record Return details"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Return
                            </button>
                          )}

                          {/* Edit Return for completed trips */}
                          {(t.tripStatus === "RETURNED" || t.tripStatus === "PARTIAL_RETURN") && (
                            <button
                              onClick={() => openUpdateTrip(t)}
                              disabled={isPending}
                              className="btn text-[11px] py-1 px-2 border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold inline-flex items-center gap-0.5 shadow-2xs whitespace-nowrap"
                              title="Modify Return details"
                            >
                              <RotateCcw className="w-3 h-3" /> Edit Ret
                            </button>
                          )}

                          {/* Delete Trip Log */}
                          {canDelete && (
                            <button
                              onClick={() => handleSoftDeleteTripLog(t)}
                              disabled={isPending}
                              className="btn text-[11px] py-1 px-2 border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold inline-flex items-center gap-0.5 shadow-2xs whitespace-nowrap"
                              title="Delete trip log"
                            >
                              <Trash2 className="w-3 h-3" /> Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* DELETED TRIPS TAB */}
      {activeTab === "deleted_trips" && (
        <>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[13px] font-semibold text-rose-800">Deleted Internal Trip Logs</p>
              <p className="text-[11px] text-slate-500">Soft-deleted vehicle trips. You can restore them to active status or permanently delete them.</p>
            </div>
          </div>
          <div className="rounded-lg overflow-hidden" style={{ background: "#fff", border: "1px solid #E4E4E7", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr>
                  <th>Vehicle</th><th>Delivery Boy</th><th>Cylinders Loaded</th>
                  <th>Departure</th><th>Return</th><th>Delivered</th><th>Returned</th>
                  <th>Deleted On</th>
                  <th className="text-center">Action</th>
                </tr></thead>
                <tbody>
                  {deletedTripLogs.length === 0 ? (
                    <tr><td colSpan={9} className="py-14 text-center">
                      <Truck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-slate-700 text-[13px]">No deleted trip logs</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Any deleted trip logs will appear here for restoration.</p>
                    </td></tr>
                  ) : deletedTripLogs.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <p className="font-mono font-semibold text-[13px]" style={{ color: "#18181B" }}>{t.vehicle.vehicleNo}</p>
                        <p className="text-[11px]" style={{ color: "#A1A1AA" }}>{t.vehicle.vehicleName}</p>
                      </td>
                      <td className="text-[13px]" style={{ color: "#52525B" }}>{t.vehicle.assignedTo?.name ?? "—"}</td>
                      <td className="text-center font-bold text-[13px] text-blue-600">
                        {t.cylindersLoaded}
                      </td>
                      <td className="muted text-[12px]">{t.departureTime ? formatDateTime(t.departureTime) : "—"}</td>
                      <td className="muted text-[12px]">{t.returnTime ? formatDateTime(t.returnTime) : "—"}</td>
                      <td className="text-center font-bold text-emerald-600">
                        {t.cylindersDelivered || "—"}
                      </td>
                      <td className="text-center font-bold text-amber-600">
                        {t.cylindersReturned || "—"}
                      </td>
                      <td className="text-[12px] font-medium text-rose-600">
                        {t.deletedAt ? formatDateTime(t.deletedAt) : "Deleted"}
                      </td>
                      <td className="text-center py-4">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => handleRestoreTripLog(t)}
                            disabled={isPending}
                            className="btn text-[11px] py-1 px-2.5 border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold inline-flex items-center gap-1 shadow-2xs whitespace-nowrap"
                            title="Restore trip log"
                          >
                            <RotateCcw className="w-3 h-3" /> Restore
                          </button>
                          {canPermanentDelete && (
                            <button
                              onClick={() => handlePermanentDeleteTripLog(t)}
                              disabled={isPending}
                              className="btn text-[11px] py-1 px-2.5 border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold inline-flex items-center gap-1 shadow-2xs whitespace-nowrap"
                              title="Permanently remove from database"
                            >
                              <Trash2 className="w-3 h-3" /> Delete Permanently
                            </button>
                          )}
                        </div>
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

                {/* Connected Delivery Request for assigned driver */}
                {(() => {
                  const driverReq = deliveryRequests.find((r) => r.deliveryBoy.id === v.assignedTo?.id);
                  if (!driverReq) return null;

                  if (driverReq.status === "APPROVED") {
                    return (
                      <div className="mt-3 p-2.5 rounded-lg bg-blue-50 border border-blue-200 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="inline-flex items-center gap-1 font-bold text-blue-700">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Ready to Load
                          </span>
                          <span className="font-bold text-blue-900 bg-white px-2 py-0.5 rounded border border-blue-200">
                            {driverReq.totalRequested} cyl
                          </span>
                        </div>
                        <button
                          onClick={() => openLoadModal(driverReq)}
                          className="w-full btn text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition"
                        >
                          <Truck className="w-3.5 h-3.5" /> Fill / Load Vehicle
                        </button>
                      </div>
                    );
                  }

                  if (driverReq.status === "FULFILLED") {
                    return (
                      <div className="mt-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="font-bold text-emerald-800 flex items-center gap-1">
                            <Truck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Loaded: {driverReq.totalLoaded} cyl</span>
                          </div>
                          {driverReq.fuelLitres != null && (
                            <p className="text-[11px] text-emerald-600">
                              Fuel: {driverReq.fuelLitres}L {driverReq.fuelType || ""} (₹{driverReq.fuelAmount || 0})
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide bg-white px-1.5 py-0.5 rounded border border-emerald-200">
                          Dispatched
                        </span>
                      </div>
                    );
                  }

                  if (driverReq.status === "PENDING") {
                    return (
                      <div className="mt-3 p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs flex items-center justify-between">
                        <span className="font-semibold text-amber-800 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 animate-pulse" /> Awaiting Admin
                        </span>
                        <span className="font-bold text-amber-900">{driverReq.totalRequested} cyl</span>
                      </div>
                    );
                  }

                  return null;
                })()}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add/Edit Vehicle Modal */}
      <Modal
        open={vehicleModal}
        onClose={() => setVehicleModal(false)}
        title={editVehicle ? "Edit Vehicle" : "Add Internal Vehicle"}
        centerFooter={true}
        footer={
          <>
            <button type="button" onClick={() => setVehicleModal(false)} className="btn btn-secondary">Cancel</button>
            <button form="vehicle-form" type="submit" disabled={isPending} className="btn btn-primary shadow-sm px-5">
              {isPending ? "Saving…" : editVehicle ? "Update Vehicle" : "Add Vehicle"}
            </button>
          </>
        }
      >
        <form id="vehicle-form" onSubmit={handleVehicleSubmit} className="space-y-4">
          {error && (
            <div className="text-[13px] px-3.5 py-2.5 rounded-xl border flex items-center gap-2" style={{ background: "#FEF2F2", borderColor: "#FCA5A5", color: "#B91C1C" }}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}
          
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">General Information</p>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1.5">Vehicle No. *</label>
                <input value={vForm.vehicleNo} onChange={(e) => setVForm({ ...vForm, vehicleNo: e.target.value.toUpperCase() })} placeholder="MH12AB1234" className="input font-mono text-[13px] font-bold tracking-widest" style={{ textTransform: "uppercase" }} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1.5">Vehicle Name *</label>
                <input value={vForm.vehicleName} onChange={(e) => setVForm({ ...vForm, vehicleName: e.target.value })} placeholder="Activa, TVS, Tata Ace..." className="input text-[13px]" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 overflow-visible">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 rounded-t-xl">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Assignment &amp; Status</p>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1.5">Vehicle Type</label>
                <CustomSelect
                  value={vForm.vehicleType}
                  onChange={(val) => setVForm({ ...vForm, vehicleType: val })}
                  options={["Two-Wheeler", "Three-Wheeler", "Four-Wheeler"].map((t) => ({ value: t, label: t }))}
                  placeholder="Select Vehicle Type"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1.5">Assign Delivery Boy</label>
                <CustomSelect
                  value={vForm.assignedToId}
                  onChange={(val) => setVForm({ ...vForm, assignedToId: val })}
                  options={[
                    { value: "", label: "Unassigned" },
                    ...deliveryBoys.map((b) => ({ value: b.id, label: b.name }))
                  ]}
                  placeholder="Unassigned"
                />
              </div>
            </div>
          </div>

          {editVehicle && (
            <div className="rounded-xl border border-slate-200 overflow-visible">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 rounded-t-xl">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Operational Status</p>
              </div>
              <div className="p-4">
                <CustomSelect
                  value={vForm.status}
                  onChange={(val) => setVForm({ ...vForm, status: val })}
                  options={["ACTIVE", "INACTIVE", "MAINTENANCE"].map((s) => ({ value: s, label: s }))}
                  placeholder="Select Status"
                />
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Remarks / Notes</p>
            </div>
            <div className="p-4">
              <textarea value={vForm.notes} onChange={(e) => setVForm({ ...vForm, notes: e.target.value })} rows={2} placeholder="Any remarks…" className="input text-[13px] resize-none" />
            </div>
          </div>
        </form>
      </Modal>

      {/* Record Trip Modal */}
      <Modal
        open={tripModal}
        onClose={() => { setTripModal(false); setEditTripLogId(null); }}
        title={editTripLogId ? "Modify Vehicle Departure" : "Record Vehicle Departure"}
        size="lg"
        centerFooter={true}
        footer={
          <>
            <button type="button" onClick={() => { setTripModal(false); setEditTripLogId(null); }} className="btn btn-secondary">Cancel</button>
            <button form="trip-form" type="submit" disabled={isPending} className="btn btn-primary shadow-sm px-5">
              {isPending ? "Saving…" : (editTripLogId ? "Update Departure" : "Record Departure")}
            </button>
          </>
        }
      >
        <form id="trip-form" onSubmit={handleTripSubmit} className="space-y-4">
          {error && (
            <div className="text-[13px] px-3.5 py-2.5 rounded-xl border flex items-center gap-2" style={{ background: "#FEF2F2", borderColor: "#FCA5A5", color: "#B91C1C" }}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <LocationStatusCard
            location={{
              lat: departureGps.gps.lat,
              lng: departureGps.gps.lng,
              accuracy: departureGps.gps.accuracy,
              status: departureGps.gps.loading ? "loading" : departureGps.gps.lat !== null ? "success" : departureGps.gps.error ? "denied" : "idle",
              error: departureGps.gps.error,
              hint: departureGps.gps.hint ?? null,
            }}
            onCapture={departureGps.captureGps}
            showWhenIdle
            label="Departure Location"
          />
          
          <div className="rounded-xl border border-slate-200 overflow-visible">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 rounded-t-xl">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Select Vehicle</p>
            </div>
            <div className="p-4">
              <CustomSelect
                value={tForm.vehicleId}
                onChange={(val) => setTForm({ ...tForm, vehicleId: val })}
                options={vehicles.filter((v) => v.status === "ACTIVE").map((v) => ({
                  value: v.id,
                  label: `${v.vehicleNo} — ${v.vehicleName} ${v.assignedTo ? `(${v.assignedTo.name})` : ""}`
                }))}
                placeholder="Choose vehicle…"
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Schedule</p>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1.5">Date</label>
                <input type="date" value={tForm.date} onChange={(e) => setTForm({ ...tForm, date: e.target.value })} className="input text-[13px]" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1.5">Departure Time</label>
                <input type="datetime-local" value={tForm.departureTime} onChange={(e) => setTForm({ ...tForm, departureTime: e.target.value })} className="input text-[13px]" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 overflow-visible">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 rounded-t-xl flex items-center justify-between">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cylinders Loaded</p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (productsState.length > 0) {
                      setDepartureItems(prev => [...prev, newDepartureRow(productsState)]);
                    }
                  }}
                  className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg border bg-blue-50 text-blue-600 border-blue-200 shadow-sm hover:bg-blue-100 transition-all cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add Cylinder Type
                </button>
                <button
                  type="button"
                  onClick={() => openAddType(() => {})}
                  className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg border bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm hover:bg-emerald-100 transition-all cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add New Type
                </button>
              </div>
            </div>
            
            <div className="p-4 space-y-3">
              {departureItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-6 border border-dashed rounded-xl text-center bg-slate-50/50" style={{ borderColor: "#E2E8F0" }}>
                  <AlertCircle className="w-5 h-5 mb-1.5 text-slate-400" />
                  <p className="text-[12px] font-medium text-slate-500">No cylinder types loaded</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Click "Add Cylinder Type" to add cylinders to this trip.</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-visible bg-white shadow-xs">
                  <div className="overflow-visible">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Type</th>
                          <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center w-36">Quantity</th>
                          <th className="py-2.5 px-3 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {departureItems.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="p-2">
                              <CustomSelect
                                value={row.productId}
                                onChange={(val) => {
                                  const selectedProduct = productsState.find(p => p.id === val);
                                  setDepartureItems(prev =>
                                    prev.map(r => r.id === row.id ? { ...r, productId: val, productName: selectedProduct?.name ?? "" } : r)
                                  );
                                }}
                                options={productsState.map((p) => ({ value: p.id, label: p.name }))}
                                placeholder="Select Type..."
                                onAddClick={() => {
                                  openAddType((p) => {
                                    setDepartureItems(prev =>
                                      prev.map(r => r.id === row.id ? { ...r, productId: p.id, productName: p.name } : r)
                                    );
                                  });
                                }}
                                addLabel="+ Add New Type..."
                                size="sm"
                              />
                            </td>
                            <td className="p-2">
                              <div className="flex items-center justify-center">
                                <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden h-7 bg-white">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDepartureItems(prev =>
                                        prev.map(r => r.id === row.id ? { ...r, loaded: Math.max(0, r.loaded - 1) } : r)
                                      );
                                    }}
                                    className="w-7 h-7 flex items-center justify-center hover:bg-slate-50 transition-colors"
                                  >
                                    <Minus className="w-3 h-3 text-slate-500" />
                                  </button>
                                  <input
                                    type="number"
                                    min="0"
                                    value={row.loaded}
                                    onChange={(e) => {
                                      const val = Math.max(0, parseInt(e.target.value) || 0);
                                      setDepartureItems(prev =>
                                        prev.map(r => r.id === row.id ? { ...r, loaded: val } : r)
                                      );
                                    }}
                                    className="w-10 h-7 text-center font-semibold text-slate-800 text-[12px] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border-x border-slate-200"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDepartureItems(prev =>
                                        prev.map(r => r.id === row.id ? { ...r, loaded: r.loaded + 1 } : r)
                                      );
                                    }}
                                    className="w-7 h-7 flex items-center justify-center hover:bg-slate-50 transition-colors"
                                  >
                                    <Plus className="w-3 h-3 text-slate-500" />
                                  </button>
                                </div>
                              </div>
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setDepartureItems(prev => prev.filter(r => r.id !== row.id));
                                }}
                                className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {departureItems.length > 0 && (
                    <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-t border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Total Loaded</span>
                      <span className="text-[13px] font-extrabold text-slate-800">
                        {departureItems.reduce((sum, r) => sum + r.loaded, 0)} <span className="text-[10px] font-normal text-slate-500">pcs</span>
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Notes (Optional)</p>
            </div>
            <div className="p-4">
              <textarea value={tForm.notes} onChange={(e) => setTForm({ ...tForm, notes: e.target.value })} rows={2} placeholder="Any remarks…" className="input text-[13px] resize-none" />
            </div>
          </div>
        </form>
      </Modal>

      {/* Update Trip Status Modal */}
      <Modal
        open={!!updateModal}
        onClose={() => setUpdateModal(null)}
        title={updateModal?.tripStatus === "RETURNED" || updateModal?.tripStatus === "PARTIAL_RETURN" ? "Modify Vehicle Return" : "Record Vehicle Return"}
        size="lg"
        centerFooter={true}
        footer={
          <>
            <button type="button" onClick={() => setUpdateModal(null)} className="btn btn-secondary">Cancel</button>
            <button form="update-trip-form" type="submit" disabled={isPending} className="btn btn-primary shadow-sm px-5">
              {isPending ? "Saving…" : (updateModal?.tripStatus === "RETURNED" || updateModal?.tripStatus === "PARTIAL_RETURN" ? "Update Return Details" : "Record Return")}
            </button>
          </>
        }
      >
        <form id="update-trip-form" onSubmit={handleUpdateTrip} className="space-y-4">
          {error && (
            <div className="text-[13px] px-3.5 py-2.5 rounded-xl border flex items-center gap-2" style={{ background: "#FEF2F2", borderColor: "#FCA5A5", color: "#B91C1C" }}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <LocationStatusCard
            location={{
              lat: returnGps.gps.lat,
              lng: returnGps.gps.lng,
              accuracy: returnGps.gps.accuracy,
              status: returnGps.gps.loading ? "loading" : returnGps.gps.lat !== null ? "success" : returnGps.gps.error ? "denied" : "idle",
              error: returnGps.gps.error,
              hint: returnGps.gps.hint ?? null,
            }}
            onCapture={returnGps.captureGps}
            showWhenIdle
            label="Return Location"
          />
          
          {updateModal && (
            <div className="px-4 py-3 rounded-xl border flex items-center justify-between" style={{ background: "#EFF6FF", borderColor: "#BFDBFE" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Truck className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-[13px] font-bold font-mono text-blue-800">{updateModal.vehicle.vehicleNo}</p>
                  <p className="text-[11px] text-blue-600">{updateModal.vehicle.vehicleName}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Loaded Cylinders</p>
                <p className="text-[16px] font-extrabold text-blue-800">{updateModal.cylindersLoaded} <span className="text-[11px] font-normal">pcs</span></p>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 overflow-visible">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 rounded-t-xl flex items-center justify-between">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Reconciliation</p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (productsState.length > 0) {
                      setReturnItems(prev => [...prev, newReturnRow(productsState)]);
                    }
                  }}
                  className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg border bg-blue-50 text-blue-600 border-blue-200 shadow-sm hover:bg-blue-100 transition-all cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add Cylinder Type
                </button>
                <button
                  type="button"
                  onClick={() => openAddType(() => {})}
                  className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg border bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm hover:bg-emerald-100 transition-all cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add New Type
                </button>
              </div>
            </div>
            
            <div className="p-4 space-y-3">
              {returnItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-6 border border-dashed rounded-xl text-center bg-slate-50/50" style={{ borderColor: "#E2E8F0" }}>
                  <AlertCircle className="w-5 h-5 mb-1.5 text-slate-400" />
                  <p className="text-[12px] font-medium text-slate-500">No cylinder types to reconcile</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Click "Add Cylinder Type" to start reconciliation.</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-visible bg-white shadow-xs">
                  <div className="overflow-visible">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Type</th>
                          <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center w-16">Loaded</th>
                          <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center w-36">Empty Ret.</th>
                          <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center w-36">Filled Ret.</th>
                          <th className="py-2.5 px-3 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {returnItems.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="p-2">
                              <CustomSelect
                                value={row.productId}
                                onChange={(val) => {
                                  const selectedProduct = productsState.find(p => p.id === val);
                                  setReturnItems(prev =>
                                    prev.map(r => r.id === row.id ? { ...r, productId: val, productName: selectedProduct?.name ?? "" } : r)
                                  );
                                }}
                                options={productsState.map((p) => ({ value: p.id, label: p.name }))}
                                placeholder="Select Type..."
                                onAddClick={() => {
                                  openAddType((p) => {
                                    setReturnItems(prev =>
                                      prev.map(r => r.id === row.id ? { ...r, productId: p.id, productName: p.name } : r)
                                    );
                                  });
                                }}
                                addLabel="+ Add New Type..."
                                size="sm"
                              />
                            </td>
                            <td className="p-2 text-center text-[12px] font-semibold text-slate-600">
                              {row.isNewReturnItem ? (
                                <div className="flex items-center justify-center">
                                  <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden h-7 bg-white w-14">
                                    <input
                                      type="number"
                                      min="0"
                                      value={row.loaded}
                                      onChange={(e) => {
                                        const val = Math.max(0, parseInt(e.target.value) || 0);
                                        setReturnItems(prev =>
                                          prev.map(r => {
                                            if (r.id !== row.id) return r;
                                            const newEmpty = Math.min(val, r.emptyReturned);
                                            return {
                                              ...r,
                                              loaded: val,
                                              emptyReturned: newEmpty,
                                              unsoldReturned: val - newEmpty
                                            };
                                          })
                                        );
                                      }}
                                      className="w-full h-7 text-center font-semibold text-slate-800 text-[12px] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border-none"
                                    />
                                  </div>
                                </div>
                              ) : (
                                row.loaded
                              )}
                            </td>
                            <td className="p-2">
                              <div className="flex items-center justify-center">
                                <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden h-7 bg-white">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReturnItems(prev =>
                                        prev.map(r => {
                                          if (r.id !== row.id) return r;
                                          const val = Math.max(0, Math.min(r.loaded, r.emptyReturned - 1));
                                          return { ...r, emptyReturned: val, unsoldReturned: r.loaded - val };
                                        })
                                      );
                                    }}
                                    className="w-7 h-7 flex items-center justify-center hover:bg-slate-50 transition-colors"
                                  >
                                    <Minus className="w-3 h-3 text-slate-500" />
                                  </button>
                                  <input
                                    type="number"
                                    min="0"
                                    value={row.emptyReturned}
                                    onChange={(e) => {
                                      const val = Math.max(0, parseInt(e.target.value) || 0);
                                      setReturnItems(prev =>
                                        prev.map(r => {
                                          if (r.id !== row.id) return r;
                                          const constrainedVal = Math.min(r.loaded, val);
                                          return { ...r, emptyReturned: constrainedVal, unsoldReturned: r.loaded - constrainedVal };
                                        })
                                      );
                                    }}
                                    className="w-10 h-7 text-center font-semibold text-slate-800 text-[12px] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border-x border-slate-200"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReturnItems(prev =>
                                        prev.map(r => {
                                          if (r.id !== row.id) return r;
                                          const val = Math.min(r.loaded, r.emptyReturned + 1);
                                          return { ...r, emptyReturned: val, unsoldReturned: r.loaded - val };
                                        })
                                      );
                                    }}
                                    className="w-7 h-7 flex items-center justify-center hover:bg-slate-50 transition-colors"
                                  >
                                    <Plus className="w-3 h-3 text-slate-500" />
                                  </button>
                                </div>
                              </div>
                            </td>
                            <td className="p-2">
                              <div className="flex items-center justify-center">
                                <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden h-7 bg-white">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReturnItems(prev =>
                                        prev.map(r => {
                                          if (r.id !== row.id) return r;
                                          const val = Math.max(0, Math.min(r.loaded, r.unsoldReturned - 1));
                                          return { ...r, unsoldReturned: val, emptyReturned: r.loaded - val };
                                        })
                                      );
                                    }}
                                    className="w-7 h-7 flex items-center justify-center hover:bg-slate-50 transition-colors"
                                  >
                                    <Minus className="w-3 h-3 text-slate-500" />
                                  </button>
                                  <input
                                    type="number"
                                    min="0"
                                    value={row.unsoldReturned}
                                    onChange={(e) => {
                                      const val = Math.max(0, parseInt(e.target.value) || 0);
                                      setReturnItems(prev =>
                                        prev.map(r => {
                                          if (r.id !== row.id) return r;
                                          const constrainedVal = Math.min(r.loaded, val);
                                          return { ...r, unsoldReturned: constrainedVal, emptyReturned: r.loaded - constrainedVal };
                                        })
                                      );
                                    }}
                                    className="w-10 h-7 text-center font-semibold text-slate-800 text-[12px] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border-x border-slate-200"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReturnItems(prev =>
                                        prev.map(r => {
                                          if (r.id !== row.id) return r;
                                          const val = Math.min(r.loaded, r.unsoldReturned + 1);
                                          return { ...r, unsoldReturned: val, emptyReturned: r.loaded - val };
                                        })
                                      );
                                    }}
                                    className="w-7 h-7 flex items-center justify-center hover:bg-slate-50 transition-colors"
                                  >
                                    <Plus className="w-3 h-3 text-slate-500" />
                                  </button>
                                </div>
                              </div>
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setReturnItems(prev => prev.filter(r => r.id !== row.id));
                                }}
                                className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {returnItems.length > 0 && (
                    <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-t border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                      <div>
                        Delivered (Empty Ret): <span className="text-slate-800 text-[12px] font-extrabold">{returnItems.reduce((sum, r) => sum + r.emptyReturned, 0)} pcs</span>
                      </div>
                      <div>
                        Returned (Filled Ret): <span className="text-slate-800 text-[12px] font-extrabold">{returnItems.reduce((sum, r) => sum + r.unsoldReturned, 0)} pcs</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 overflow-visible">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 rounded-t-xl">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Return Details</p>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1.5">Return Date &amp; Time</label>
                <input type="datetime-local" value={uForm.returnTime} onChange={(e) => setUForm({ ...uForm, returnTime: e.target.value })} className="input text-[13px]" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1.5">Trip Status</label>
                <CustomSelect
                  value={uForm.tripStatus}
                  onChange={(val) => setUForm({ ...uForm, tripStatus: val })}
                  options={[
                    { value: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
                    { value: "RETURNED", label: "Fully Returned" },
                    { value: "PARTIAL_RETURN", label: "Partial Return" }
                  ]}
                  placeholder="Select Trip Status"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Notes (Optional)</p>
            </div>
            <div className="p-4">
              <textarea value={uForm.notes} onChange={(e) => setUForm({ ...uForm, notes: e.target.value })} rows={2} placeholder="Any remarks…" className="input text-[13px] resize-none" />
            </div>
          </div>
        </form>
      </Modal>

      {/* Modal for Fulfilling Delivery Count Request & Loading Vehicle */}
      {loadingModalRequest && (
        <Modal
          open={true}
          onClose={() => !isPending && setLoadingModalRequest(null)}
          title="Vehicle Loading & Fueling Dispatch"
        >
          <form onSubmit={handleFulfillSubmit} className="space-y-4 text-sm">
            <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase font-semibold text-blue-700">Delivery Boy</span>
                <p className="font-bold text-zinc-900">{loadingModalRequest.deliveryBoy.name}</p>
                <p className="text-xs text-zinc-600 font-mono mt-0.5">
                  {loadingModalRequest.deliveryBoy.vehicle
                    ? `${loadingModalRequest.deliveryBoy.vehicle.vehicleNo} · ${loadingModalRequest.deliveryBoy.vehicle.vehicleName}`
                    : "No vehicle assigned"}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[11px] uppercase font-semibold text-blue-700">Date</span>
                <p className="font-bold text-zinc-900">
                  {format(parseISO(loadingModalRequest.date), "dd MMM yyyy")}
                </p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-zinc-800 uppercase tracking-wide">
                  Cylinders Loaded onto Vehicle <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleAddExtraProduct}
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Product
                </button>
              </div>

              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {loadItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <select
                      value={item.productId}
                      onChange={(e) => {
                        const prods = products.length > 0 ? products : productsState;
                        const prod = prods.find((p) => p.id === e.target.value);
                        const updated = [...loadItems];
                        updated[idx] = {
                          ...updated[idx],
                          productId: e.target.value,
                          productName: prod?.name || "Product",
                        };
                        setLoadItems(updated);
                      }}
                      className="flex-1 text-xs px-3 py-2 border border-zinc-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      {(products.length > 0 ? products : productsState).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>

                    <div className="w-28 relative">
                      <input
                        type="number"
                        min="0"
                        placeholder="Loaded"
                        value={item.loadedQty}
                        onChange={(e) => handleLoadedQtyChange(idx, Number(e.target.value))}
                        className="w-full text-xs px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-right pr-6 font-bold text-zinc-900"
                        required
                      />
                      <span className="absolute right-2 top-2 text-xs text-zinc-400">cyl</span>
                    </div>

                    {loadItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLoadItem(idx)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-2 text-right text-xs font-semibold text-zinc-600">
                Total Loaded:{" "}
                <span className="text-emerald-700 text-sm font-bold">
                  {loadItems.reduce((sum, it) => sum + (Number(it.loadedQty) || 0), 0)} cylinders
                </span>
              </div>
            </div>

            <div className="border border-purple-200 bg-purple-50/50 p-3 rounded-xl space-y-2.5">
              <div className="flex items-center gap-1.5 text-purple-900 font-bold text-xs">
                <Fuel className="w-4 h-4 text-purple-600" />
                <span>Vehicle Fuel Filling (Optional)</span>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Fuel Type</label>
                  <select
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-zinc-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    <option value="Petrol">Petrol</option>
                    <option value="Diesel">Diesel</option>
                    <option value="CNG">CNG</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Litres</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 5"
                    value={fuelLitres}
                    onChange={(e) => setFuelLitres(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 500"
                    value={fuelAmount}
                    onChange={(e) => setFuelAmount(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Godown Loading Remarks (Optional)
              </label>
              <textarea
                rows={2}
                value={godownNotes}
                onChange={(e) => setGodownNotes(e.target.value)}
                placeholder="e.g. Vehicle inspected, full load loaded..."
                className="w-full text-xs px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {loadModalError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-1.5 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {loadModalError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setLoadingModalRequest(null)}
                className="px-3.5 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                <Truck className="w-3.5 h-3.5" /> Confirm Vehicle Loaded & Dispatched
              </button>
            </div>
          </form>
        </Modal>
      )}

      <AddTypeModal
        open={addTypeOpen}
        onClose={() => setAddTypeOpen(false)}
        onAdded={handleTypeAdded}
      />
    </>
  );
}

function AddTypeModal({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: (p: Product) => void;
}) {
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [pending, startT] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setErr("Cylinder type name is required");
      return;
    }
    startT(async () => {
      const res = await addCylinderType(name.trim());
      if (res.error) {
        setErr(res.error);
        return;
      }
      if (res.product) {
        onAdded(res.product);
        setName("");
        setErr("");
        onClose();
      }
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Cylinder Type"
      size="sm"
      centerFooter={true}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button form="add-type-form" type="submit" disabled={pending} className="btn btn-primary shadow-sm px-5">
            {pending ? "Saving..." : "Add Cylinder"}
          </button>
        </>
      }
    >
      <form id="add-type-form" onSubmit={handleSubmit} className="space-y-4">
        {err && (
          <div
            className="text-[13px] px-3.5 py-2.5 rounded-xl border flex items-center gap-2"
            style={{ background: "#FEF2F2", color: "#B91C1C", borderColor: "#FCA5A5" }}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{err}</span>
          </div>
        )}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cylinder Product Details</p>
          </div>
          <div className="p-4">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1.5">Type Name *</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 19kg Commercial, 14.2kg Domestic"
              className="input text-[13px] focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
