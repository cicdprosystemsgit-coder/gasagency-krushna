"use client";

import { useState, useMemo, Fragment } from "react";
import dynamic from "next/dynamic";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import {
  Truck,
  Users,
  Search,
  Filter,
  X,
  CreditCard,
  Layers,
  UserCheck,
  ToggleLeft,
  Map,
  List,
  Navigation,
  ChevronDown,
  ChevronUp,
  Camera,
  Eye,
  ExternalLink,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";

const AdminDeliveryMap = dynamic(
  () => import("@/components/attendance/AdminDeliveryMap"),
  { ssr: false }
);

interface Delivery {
  id: string;
  date: string | Date;
  createdAt: string | Date;
  notes: string | null;
  deliveredQty: number;
  returnedQty: number;
  pendingQty: number;
  cashCollected: number;
  creditAmount: number | null;
  paymentMode: string;
  status: string;
  customer: {
    name: string;
    phone: string;
    address: string | null;
    type: string;
  };
  product: {
    name: string;
  };
  deliveredBy: {
    name: string;
  };
  deliveryLat: number | null;
  deliveryLng: number | null;
  deliveryAccuracy: number | null;
  paymentReceiptUrl?: string | null;
  customerCardUrl?: string | null;
  additionalImageUrl?: string | null;
  photosCapturedAt?: string | Date | null;
}

interface DeliveryPlanClientProps {
  deliveries: Delivery[];
  selectedDate: string;
}

export function DeliveryPlanClient({ deliveries, selectedDate }: DeliveryPlanClientProps) {
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [productFilter, setProductFilter] = useState("ALL");
  const [deliveryBoyFilter, setDeliveryBoyFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [gpsFilter, setGpsFilter] = useState("ALL"); // ALL | WITH_GPS | NO_GPS
  const [photoFilter, setPhotoFilter] = useState("ALL"); // ALL | WITH_PHOTOS | NO_PHOTOS

  // Expansion and Photo Viewer Modal State
  const [expandedDeliveryId, setExpandedDeliveryId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    title: string;
    capturedAt?: string | Date | null;
  } | null>(null);

  // Get unique lists for filter options based on current date's deliveries
  const productOptions = useMemo(() => {
    const names = new Set<string>();
    deliveries.forEach((d) => names.add(d.product.name));
    return Array.from(names).sort();
  }, [deliveries]);

  const deliveryBoyOptions = useMemo(() => {
    const names = new Set<string>();
    deliveries.forEach((d) => names.add(d.deliveredBy.name));
    return Array.from(names).sort();
  }, [deliveries]);

  const statusOptions = useMemo(() => {
    const statuses = new Set<string>();
    deliveries.forEach((d) => statuses.add(d.status));
    return Array.from(statuses).sort();
  }, [deliveries]);

  const paymentOptions = useMemo(() => {
    const modes = new Set<string>();
    deliveries.forEach((d) => modes.add(d.paymentMode));
    return Array.from(modes).sort();
  }, [deliveries]);

  // Apply filters
  const filteredDeliveries = useMemo(() => {
    return deliveries.filter((d) => {
      const matchesSearch =
        d.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.customer.phone.includes(searchQuery);

      const matchesProduct = productFilter === "ALL" || d.product.name === productFilter;
      const matchesDeliveryBoy =
        deliveryBoyFilter === "ALL" || d.deliveredBy.name === deliveryBoyFilter;
      const matchesStatus = statusFilter === "ALL" || d.status === statusFilter;
      const matchesPayment = paymentFilter === "ALL" || d.paymentMode === paymentFilter;

      const hasGps = d.deliveryLat !== null && d.deliveryLng !== null;
      const matchesGps =
        gpsFilter === "ALL" ||
        (gpsFilter === "WITH_GPS" && hasGps) ||
        (gpsFilter === "NO_GPS" && !hasGps);

      const hasPhotos = !!(d.paymentReceiptUrl || d.customerCardUrl || d.additionalImageUrl);
      const matchesPhoto =
        photoFilter === "ALL" ||
        (photoFilter === "WITH_PHOTOS" && hasPhotos) ||
        (photoFilter === "NO_PHOTOS" && !hasPhotos);

      return (
        matchesSearch &&
        matchesProduct &&
        matchesDeliveryBoy &&
        matchesStatus &&
        matchesPayment &&
        matchesGps &&
        matchesPhoto
      );
    });
  }, [deliveries, searchQuery, productFilter, deliveryBoyFilter, statusFilter, paymentFilter, gpsFilter, photoFilter]);

  // Calculations for filtered statistics
  const totalDelivered = useMemo(() => {
    return filteredDeliveries.reduce((a, d) => a + d.deliveredQty, 0);
  }, [filteredDeliveries]);

  const totalReturned = useMemo(() => {
    return filteredDeliveries.reduce((a, d) => a + d.returnedQty, 0);
  }, [filteredDeliveries]);

  const totalPending = useMemo(() => {
    return filteredDeliveries.reduce((a, d) => a + d.pendingQty, 0);
  }, [filteredDeliveries]);

  const pendingCount = useMemo(() => {
    return filteredDeliveries.filter((d) => d.pendingQty > 0).length;
  }, [filteredDeliveries]);

  const totals = useMemo(() => {
    return filteredDeliveries.reduce(
      (acc, d) => {
        const isDom = d.customer.type === "DOMESTIC";
        const isPartial = d.paymentMode === "PARTIAL";
        const isCredit = d.paymentMode === "CREDIT";
        const isCash = d.paymentMode === "CASH";

        let cashVal = 0;
        let onlineVal = 0;
        let creditVal = 0;

        if (isCash) {
          cashVal = d.cashCollected;
        } else if (isCredit) {
          creditVal = d.creditAmount || 0;
        } else if (isPartial) {
          cashVal = d.cashCollected;
          if (isDom) {
            onlineVal = d.creditAmount || 0;
          } else {
            creditVal = d.creditAmount || 0;
          }
        } else {
          onlineVal = d.cashCollected;
        }

        acc.cash += cashVal;
        acc.online += onlineVal;
        acc.udhari += creditVal;
        return acc;
      },
      { cash: 0, online: 0, udhari: 0 }
    );
  }, [filteredDeliveries]);

  const hasActiveFilters =
    searchQuery !== "" ||
    productFilter !== "ALL" ||
    deliveryBoyFilter !== "ALL" ||
    statusFilter !== "ALL" ||
    paymentFilter !== "ALL" ||
    gpsFilter !== "ALL" ||
    photoFilter !== "ALL";

  const clearFilters = () => {
    setSearchQuery("");
    setProductFilter("ALL");
    setDeliveryBoyFilter("ALL");
    setStatusFilter("ALL");
    setPaymentFilter("ALL");
    setGpsFilter("ALL");
    setPhotoFilter("ALL");
  };

  return (
    <div className="space-y-6">
      {/* Stats Widget (dynamically updates with filters) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 transition hover:shadow-md">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Deliveries</p>
          <p className="text-2xl font-black text-blue-700">{totalDelivered} <span className="text-xs font-normal text-slate-400 lowercase">cylinders</span></p>
          {hasActiveFilters && (
            <p className="text-[10px] text-slate-400 mt-1">Filtered from {deliveries.reduce((a, d) => a + d.deliveredQty, 0)} total</p>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 transition hover:shadow-md">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Collected (Cash + Online)</p>
          <p className="text-2xl font-black text-green-700">{formatCurrency(totals.cash + totals.online)}</p>
          <p className="text-[10px] text-slate-400 mt-1">Cash: {formatCurrency(totals.cash)} | Online: {formatCurrency(totals.online)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 transition hover:shadow-md">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Credit / Udhari</p>
          <p className="text-2xl font-black text-amber-700">{formatCurrency(totals.udhari)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 transition hover:shadow-md">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Pending Deliveries</p>
          <p className="text-2xl font-black text-orange-600">{pendingCount} <span className="text-xs font-normal text-slate-400 lowercase">customers</span></p>
        </div>
      </div>

      {/* Filter Control Board */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4.5 h-4.5 text-blue-600" />
            <h3 className="font-bold text-slate-800 text-sm">Filters &amp; Search</h3>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100 transition active:scale-95 duration-150"
            >
              <X className="w-3 h-3" /> Clear Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search customer name/phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
            />
          </div>

          {/* Product Dropdown */}
          <div className="relative">
            <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 appearance-none font-semibold text-slate-700"
            >
              <option value="ALL">All Cylinder Types</option>
              {productOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Delivery Boy Dropdown */}
          <div className="relative">
            <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={deliveryBoyFilter}
              onChange={(e) => setDeliveryBoyFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 appearance-none font-semibold text-slate-700"
            >
              <option value="ALL">All Delivery Boys</option>
              {deliveryBoyOptions.map((db) => (
                <option key={db} value={db}>
                  {db}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="relative">
            <ToggleLeft className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 appearance-none font-semibold text-slate-700"
            >
              <option value="ALL">All Statuses</option>
              {statusOptions.map((st) => (
                <option key={st} value={st}>
                  {st === "COMPLETED"
                    ? "Completed"
                    : st === "PENDING"
                    ? "Pending"
                    : st === "CANCELLED"
                    ? "Cancelled"
                    : st}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Mode Dropdown */}
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 appearance-none font-semibold text-slate-700"
            >
              <option value="ALL">All Payment Modes</option>
              {paymentOptions.map((pm) => (
                <option key={pm} value={pm}>
                  {pm === "CREDIT"
                    ? "Credit / Udhari"
                    : pm === "CASH"
                    ? "Cash"
                    : pm === "ONLINE"
                    ? "Online"
                    : pm === "PARTIAL"
                    ? "Partial Payment"
                    : pm}
                </option>
              ))}
            </select>
          </div>

          {/* GPS Tracking Dropdown */}
          <div className="relative">
            <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={gpsFilter}
              onChange={(e) => setGpsFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 appearance-none font-semibold text-slate-700"
            >
              <option value="ALL">All GPS Logs</option>
              <option value="WITH_GPS">With GPS Coordinates</option>
              <option value="NO_GPS">No GPS logs / Offline</option>
            </select>
          </div>

          {/* Proof Photos Dropdown */}
          <div className="relative">
            <Camera className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={photoFilter}
              onChange={(e) => setPhotoFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 appearance-none font-semibold text-slate-700"
            >
              <option value="ALL">All Proof Photos</option>
              <option value="WITH_PHOTOS">With Proof Photos</option>
              <option value="NO_PHOTOS">No Proof Photos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Deliveries Table/Map Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/20">
          <h2 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-blue-600" />
            Deliveries List ({filteredDeliveries.length} records)
          </h2>
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                viewMode === "list"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              <List className="w-3.5 h-3.5" /> List View
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                viewMode === "map"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              <Map className="w-3.5 h-3.5" /> Map View
            </button>
          </div>
        </div>

        {viewMode === "map" ? (
          <div className="p-4 bg-slate-50/20">
            <AdminDeliveryMap
              initialDeliveries={filteredDeliveries}
              initialLiveLocations={[]}
              initialAttendance={[]}
              selectedDate={selectedDate}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-5 py-3.5 text-left font-semibold">Customer</th>
                  <th className="px-5 py-3.5 text-left font-semibold">Product</th>
                  <th className="px-5 py-3.5 text-center font-semibold w-24">Delivered</th>
                  <th className="px-5 py-3.5 text-center font-semibold w-24">Returned</th>
                  <th className="px-5 py-3.5 text-center font-semibold w-24">Pending</th>
                  <th className="px-5 py-3.5 text-right font-semibold w-28">Cash</th>
                  <th className="px-5 py-3.5 text-right font-semibold w-28">Online</th>
                  <th className="px-5 py-3.5 text-right font-semibold w-28">Udhari</th>
                  <th className="px-5 py-3.5 text-left font-semibold">Delivery Boy</th>
                  <th className="px-5 py-3.5 text-center font-semibold w-20">GPS</th>
                  <th className="px-5 py-3.5 text-center font-semibold w-32">Proof Photos</th>
                  <th className="px-5 py-3.5 text-left font-semibold">Status</th>
                  <th className="px-4 py-3.5 text-center font-semibold w-12">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDeliveries.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-5 py-16 text-center text-slate-400">
                      <Truck className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p className="font-semibold text-slate-600">No records found matching filters</p>
                      <p className="text-xs text-slate-400 mt-1">Try relaxing your search terms or clearing the dropdown selections</p>
                    </td>
                  </tr>
                ) : (
                  filteredDeliveries.map((d) => {
                    const isDom = d.customer.type === "DOMESTIC";
                    const isPartial = d.paymentMode === "PARTIAL";
                    const isCredit = d.paymentMode === "CREDIT";
                    const isCash = d.paymentMode === "CASH";

                    let cashVal = 0;
                    let onlineVal = 0;
                    let creditVal = 0;

                    if (isCash) {
                      cashVal = d.cashCollected;
                    } else if (isCredit) {
                      creditVal = d.creditAmount || 0;
                    } else if (isPartial) {
                      cashVal = d.cashCollected;
                      if (isDom) {
                        onlineVal = d.creditAmount || 0;
                      } else {
                        creditVal = d.creditAmount || 0;
                      }
                    } else {
                      onlineVal = d.cashCollected;
                    }

                    const photos = [d.paymentReceiptUrl, d.customerCardUrl, d.additionalImageUrl].filter(Boolean);
                    const photoCount = photos.length;
                    const isExpanded = expandedDeliveryId === d.id;

                    return (
                      <Fragment key={d.id}>
                        <tr className={`hover:bg-slate-50/60 transition-colors ${isExpanded ? "bg-blue-50/30" : ""}`}>
                          <td className="px-5 py-3.5">
                            <p className="font-bold text-slate-800 text-[13px]">{d.customer.name}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{d.customer.phone}</p>
                          </td>
                          <td className="px-5 py-3.5 text-slate-600 font-medium text-[13px]">{d.product.name}</td>
                          <td className="px-5 py-3.5 text-center font-bold text-blue-700 text-[14px]">
                            {d.deliveredQty}
                          </td>
                          <td className="px-5 py-3.5 text-center text-slate-600 font-medium text-[13px]">
                            {d.returnedQty}
                          </td>
                          <td className="px-5 py-3.5 text-center text-orange-600 font-bold text-[13px]">
                            {d.pendingQty}
                          </td>
                          <td className="px-5 py-3.5 text-right font-bold text-green-700">
                            {cashVal > 0 ? formatCurrency(cashVal) : "—"}
                          </td>
                          <td className="px-5 py-3.5 text-right font-bold text-purple-700">
                            {onlineVal > 0 ? formatCurrency(onlineVal) : "—"}
                          </td>
                          <td className="px-5 py-3.5 text-right font-bold text-amber-700">
                            {creditVal > 0 ? formatCurrency(creditVal) : "—"}
                          </td>
                          <td className="px-5 py-3.5 text-slate-600 font-medium text-[13px]">{d.deliveredBy.name}</td>
                          <td className="px-5 py-3.5 text-center">
                            {d.deliveryLat && d.deliveryLng ? (
                              <a
                                href={`https://www.google.com/maps?q=${d.deliveryLat},${d.deliveryLng}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center p-1 rounded bg-emerald-50 hover:bg-emerald-100 transition border border-emerald-200"
                                title={`Accuracy: ±${d.deliveryAccuracy?.toFixed(0)}m`}
                              >
                                <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                              </a>
                            ) : (
                              <span className="text-slate-300 font-bold">—</span>
                            )}
                          </td>

                          {/* Proof Photos Badge Button */}
                          <td className="px-5 py-3.5 text-center">
                            {photoCount > 0 ? (
                              <button
                                onClick={() => setExpandedDeliveryId(isExpanded ? null : d.id)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                                title="Click to preview proof photos"
                              >
                                <Camera className="w-3.5 h-3.5 text-emerald-600" />
                                <span>{photoCount} Photo{photoCount > 1 ? "s" : ""}</span>
                              </button>
                            ) : (
                              <span className="text-xs text-slate-300 font-medium">—</span>
                            )}
                          </td>

                          <td className="px-5 py-3.5">
                            <StatusBadge status={d.status} />
                          </td>

                          {/* Dropdown Expand Toggle */}
                          <td className="px-4 py-3.5 text-center">
                            <button
                              onClick={() => setExpandedDeliveryId(isExpanded ? null : d.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition cursor-pointer"
                              title={isExpanded ? "Hide Details" : "Show Full Details & Photos"}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-blue-600" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                        </tr>

                        {/* Expanded Dropdown Details & Photos Panel */}
                        {isExpanded && (
                          <tr key={`${d.id}-expanded`} className="bg-slate-50/80 border-b border-slate-200">
                            <td colSpan={13} className="p-4 sm:p-5">
                              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-5">
                                {/* Header bar */}
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                                      📦
                                    </div>
                                    <div>
                                      <h4 className="font-bold text-slate-800 text-sm">
                                        Delivery Details — {d.customer.name}
                                      </h4>
                                      <p className="text-xs text-slate-400">
                                        Record ID: <span className="font-mono">{d.id}</span> | Delivered By: <span className="font-semibold text-slate-700">{d.deliveredBy.name}</span>
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => setExpandedDeliveryId(null)}
                                    className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 transition flex items-center gap-1 cursor-pointer"
                                  >
                                    <ChevronUp className="w-3.5 h-3.5" /> Close Details
                                  </button>
                                </div>

                                {/* Information Cards Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                  {/* Customer & Address Card */}
                                  <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 space-y-1.5">
                                    <p className="font-bold uppercase tracking-wider text-[10px] text-slate-400">Customer Profile</p>
                                    <p className="font-bold text-slate-800 text-sm">{d.customer.name}</p>
                                    <p className="text-slate-600">📞 Phone: <span className="font-medium text-slate-800">{d.customer.phone}</span></p>
                                    <p className="text-slate-600">📍 Address: <span className="font-medium text-slate-800">{d.customer.address || "N/A"}</span></p>
                                    <p className="text-slate-500 text-[11px]">Type: <span className="font-semibold text-blue-700">{d.customer.type}</span></p>
                                  </div>

                                  {/* Payment & Quantities Card */}
                                  <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 space-y-1.5">
                                    <p className="font-bold uppercase tracking-wider text-[10px] text-slate-400">Order &amp; Financials</p>
                                    <p className="text-slate-700">Product: <span className="font-semibold text-slate-800">{d.product.name}</span></p>
                                    <p className="text-slate-700">Quantities: <span className="font-bold text-blue-600">{d.deliveredQty} Delivered</span> | {d.returnedQty} Empty Ret | {d.pendingQty} Pending</p>
                                    <p className="text-slate-700">Payment Mode: <span className="font-bold text-purple-700">{d.paymentMode}</span></p>
                                    <p className="text-slate-700">Cash Collected: <span className="font-bold text-emerald-600">{formatCurrency(d.cashCollected)}</span></p>
                                    {d.creditAmount ? (
                                      <p className="text-slate-700">Credit / Udhari: <span className="font-bold text-amber-600">{formatCurrency(d.creditAmount)}</span></p>
                                    ) : null}
                                    {d.notes && <p className="text-slate-600 italic bg-amber-50/70 p-2 rounded border border-amber-200 mt-1">"{d.notes}"</p>}
                                  </div>

                                  {/* Verification & GPS Card */}
                                  <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 space-y-1.5">
                                    <p className="font-bold uppercase tracking-wider text-[10px] text-slate-400">Verification &amp; GPS</p>
                                    <p className="text-slate-700">Photos Taken: <span className="font-semibold text-slate-800">{d.photosCapturedAt ? new Date(d.photosCapturedAt).toLocaleString("en-IN") : "N/A"}</span></p>
                                    <p className="text-slate-700">Record Date: <span className="font-semibold text-slate-800">{new Date(d.createdAt).toLocaleString("en-IN")}</span></p>
                                    {d.deliveryLat && d.deliveryLng ? (
                                      <div className="pt-1">
                                        <a
                                          href={`https://www.google.com/maps?q=${d.deliveryLat},${d.deliveryLng}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 font-semibold text-xs border border-emerald-200 hover:bg-emerald-200 transition"
                                        >
                                          <Navigation className="w-3.5 h-3.5 text-emerald-700" />
                                          Open Google Maps (±{d.deliveryAccuracy?.toFixed(0)}m)
                                        </a>
                                      </div>
                                    ) : (
                                      <p className="text-slate-400">GPS: No coordinates captured</p>
                                    )}
                                  </div>
                                </div>

                                {/* Proof Photos Preview Gallery */}
                                <div className="border-t border-slate-100 pt-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wide flex items-center gap-1.5">
                                      <Camera className="w-4 h-4 text-orange-600" />
                                      Delivery Proof Photos ({photoCount} Attached)
                                    </h5>
                                    <span className="text-[11px] text-slate-400 font-medium">Click image thumbnail to enlarge</span>
                                  </div>

                                  {photoCount === 0 ? (
                                    <div className="bg-slate-50 rounded-xl p-5 text-center text-slate-400 text-xs border border-dashed border-slate-200">
                                      <Camera className="w-8 h-8 mx-auto mb-1.5 opacity-30" />
                                      <p className="font-semibold text-slate-600">No proof photos attached</p>
                                      <p className="text-[11px] text-slate-400 mt-0.5">This delivery record was created without photo uploads.</p>
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                      {/* 1. Payment Receipt */}
                                      <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs space-y-2">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                                            🧾 Payment Receipt <span className="text-rose-500">*</span>
                                          </span>
                                          {d.paymentReceiptUrl ? (
                                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Verified</span>
                                          ) : (
                                            <span className="text-[10px] font-semibold text-rose-500">Missing</span>
                                          )}
                                        </div>
                                        {d.paymentReceiptUrl ? (
                                          <div
                                            onClick={() => setPreviewImage({ url: d.paymentReceiptUrl!, title: `Payment Receipt — Customer: ${d.customer.name}`, capturedAt: d.photosCapturedAt })}
                                            className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-950 aspect-video cursor-pointer"
                                          >
                                            <img src={d.paymentReceiptUrl} alt="Payment Receipt" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white font-bold text-xs">
                                              <Eye className="w-4 h-4" /> Click to Enlarge
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="h-28 bg-slate-50 rounded-lg border border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-xs">
                                            No photo uploaded
                                          </div>
                                        )}
                                      </div>

                                      {/* 2. Customer Card Entry */}
                                      <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs space-y-2">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                                            📋 Customer Card Entry <span className="text-rose-500">*</span>
                                          </span>
                                          {d.customerCardUrl ? (
                                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Verified</span>
                                          ) : (
                                            <span className="text-[10px] font-semibold text-rose-500">Missing</span>
                                          )}
                                        </div>
                                        {d.customerCardUrl ? (
                                          <div
                                            onClick={() => setPreviewImage({ url: d.customerCardUrl!, title: `Customer Card — Customer: ${d.customer.name}`, capturedAt: d.photosCapturedAt })}
                                            className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-950 aspect-video cursor-pointer"
                                          >
                                            <img src={d.customerCardUrl} alt="Customer Card Entry" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white font-bold text-xs">
                                              <Eye className="w-4 h-4" /> Click to Enlarge
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="h-28 bg-slate-50 rounded-lg border border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-xs">
                                            No photo uploaded
                                          </div>
                                        )}
                                      </div>

                                      {/* 3. Additional Proof */}
                                      <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs space-y-2">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                                            🖼️ Additional Image
                                          </span>
                                          {d.additionalImageUrl ? (
                                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Uploaded</span>
                                          ) : (
                                            <span className="text-[10px] text-slate-400">Optional</span>
                                          )}
                                        </div>
                                        {d.additionalImageUrl ? (
                                          <div
                                            onClick={() => setPreviewImage({ url: d.additionalImageUrl!, title: `Additional Proof — Customer: ${d.customer.name}`, capturedAt: d.photosCapturedAt })}
                                            className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-950 aspect-video cursor-pointer"
                                          >
                                            <img src={d.additionalImageUrl} alt="Additional Image" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white font-bold text-xs">
                                              <Eye className="w-4 h-4" /> Click to Enlarge
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="h-28 bg-slate-50 rounded-lg border border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-xs">
                                            No optional photo
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
              {filteredDeliveries.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-50/50 border-t border-slate-200 font-extrabold text-slate-800 text-[13px]">
                    <td colSpan={2} className="px-5 py-4 text-slate-500 font-semibold uppercase tracking-wider">
                      Total
                    </td>
                    <td className="px-5 py-4 text-center text-blue-700 text-[15px]">{totalDelivered}</td>
                    <td className="px-5 py-4 text-center text-slate-600 text-[14px]">{totalReturned}</td>
                    <td className="px-5 py-4 text-center text-orange-600 text-[14px]">{totalPending}</td>
                    <td className="px-5 py-4 text-right text-green-700 text-[14px]">
                      {totals.cash > 0 ? formatCurrency(totals.cash) : "—"}
                    </td>
                    <td className="px-5 py-4 text-right text-purple-700 text-[14px]">
                      {totals.online > 0 ? formatCurrency(totals.online) : "—"}
                    </td>
                    <td className="px-5 py-4 text-right text-amber-700 text-[14px]">
                      {totals.udhari > 0 ? formatCurrency(totals.udhari) : "—"}
                    </td>
                    <td colSpan={5} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* High-Resolution Photo Viewer Modal (Lightbox) */}
        {previewImage && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">{previewImage.title}</h3>
                  {previewImage.capturedAt && (
                    <p className="text-xs text-slate-500">Captured At: {new Date(previewImage.capturedAt).toLocaleString("en-IN")}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={previewImage.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Full Size / Download
                  </a>
                  <button
                    onClick={() => setPreviewImage(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-4 bg-slate-950 overflow-auto flex items-center justify-center flex-1 min-h-[300px]">
                <img
                  src={previewImage.url}
                  alt={previewImage.title}
                  className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-lg"
                />
              </div>
              <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500 font-medium">
                🔒 Tamper-evident proof photo with burnt IST timestamp
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
