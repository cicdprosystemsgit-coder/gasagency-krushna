"use client";

import React, { useState, useMemo } from "react";
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
} from "lucide-react";

import { DeliveryPhotoBackupPanel } from "@/components/delivery/DeliveryPhotoBackupPanel";
import { Camera, Image as ImageIcon, ChevronDown, ChevronUp, Eye, ExternalLink } from "lucide-react";

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
  // ── Delivery Proof Photos (Phase 1 + 2) ──
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
  // Filters state
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [productFilter, setProductFilter] = useState("ALL");
  const [deliveryBoyFilter, setDeliveryBoyFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [gpsFilter, setGpsFilter] = useState("ALL"); // ALL | WITH_GPS | NO_GPS

  // Proof Photos interaction state
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

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

      return (
        matchesSearch &&
        matchesProduct &&
        matchesDeliveryBoy &&
        matchesStatus &&
        matchesPayment &&
        matchesGps
      );
    });
  }, [deliveries, searchQuery, productFilter, deliveryBoyFilter, statusFilter, paymentFilter, gpsFilter]);

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
    gpsFilter !== "ALL";

  const clearFilters = () => {
    setSearchQuery("");
    setProductFilter("ALL");
    setDeliveryBoyFilter("ALL");
    setStatusFilter("ALL");
    setPaymentFilter("ALL");
    setGpsFilter("ALL");
  };

  return (
    <div className="space-y-6">
      {/* ── Phase 2: AWS S3 Photo Backup Panel ── */}
      <DeliveryPhotoBackupPanel />

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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
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
          <div>
            {/* MOBILE CARDS VIEW (<768px) */}
            <div className="block md:hidden space-y-3.5 p-4">
              {filteredDeliveries.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
                  <Truck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="font-semibold text-slate-700 text-sm">No records found matching filters</p>
                  <p className="text-xs text-slate-400 mt-1">Try relaxing your search terms or clearing selections</p>
                </div>
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
                    if (isDom) onlineVal = d.creditAmount || 0;
                    else creditVal = d.creditAmount || 0;
                  } else {
                    onlineVal = d.cashCollected;
                  }

                  const hasPhotos = !!(d.paymentReceiptUrl || d.customerCardUrl || d.additionalImageUrl);
                  const photoCount = (d.paymentReceiptUrl ? 1 : 0) + (d.customerCardUrl ? 1 : 0) + (d.additionalImageUrl ? 1 : 0);
                  const isExpanded = expandedRowId === d.id;

                  return (
                    <div
                      key={`mob-${d.id}`}
                      className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3"
                    >
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div>
                          <p className="font-bold text-slate-900 text-sm leading-snug">
                            {d.customer.name}
                          </p>
                          <a
                            href={`tel:${d.customer.phone}`}
                            className="text-xs font-medium text-blue-600 hover:underline"
                          >
                            📞 {d.customer.phone}
                          </a>
                        </div>
                        <StatusBadge status={d.status} />
                      </div>

                      {/* Product & Staff */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">Product</span>
                          <span className="font-semibold text-slate-800">{d.product.name}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">Delivered By</span>
                          <span className="font-semibold text-slate-800">{d.deliveredBy.name}</span>
                        </div>
                      </div>

                      {/* Quantities Pills */}
                      <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                        <div className="p-1.5 rounded-lg bg-blue-50 border border-blue-100">
                          <span className="text-[10px] text-blue-600 block font-semibold">Delivered</span>
                          <span className="font-bold text-blue-700 text-sm">{d.deliveredQty}</span>
                        </div>
                        <div className="p-1.5 rounded-lg bg-slate-100 border border-slate-200">
                          <span className="text-[10px] text-slate-500 block font-semibold">Returned</span>
                          <span className="font-bold text-slate-700 text-sm">{d.returnedQty}</span>
                        </div>
                        <div className="p-1.5 rounded-lg bg-amber-50 border border-amber-100">
                          <span className="text-[10px] text-amber-600 block font-semibold">Pending</span>
                          <span className="font-bold text-amber-700 text-sm">{d.pendingQty}</span>
                        </div>
                      </div>

                      {/* Financial Breakdown */}
                      <div className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg">
                        <div className="text-center flex-1">
                          <span className="text-[10px] text-slate-400 block">Cash</span>
                          <span className="font-bold text-emerald-600">
                            {cashVal > 0 ? formatCurrency(cashVal) : "—"}
                          </span>
                        </div>
                        <div className="w-px h-6 bg-slate-200" />
                        <div className="text-center flex-1">
                          <span className="text-[10px] text-slate-400 block">Online</span>
                          <span className="font-bold text-purple-600">
                            {onlineVal > 0 ? formatCurrency(onlineVal) : "—"}
                          </span>
                        </div>
                        <div className="w-px h-6 bg-slate-200" />
                        <div className="text-center flex-1">
                          <span className="text-[10px] text-slate-400 block">Udhari</span>
                          <span className="font-bold text-amber-600">
                            {creditVal > 0 ? formatCurrency(creditVal) : "—"}
                          </span>
                        </div>
                      </div>

                      {/* Card Actions Footer */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        {hasPhotos ? (
                          <button
                            type="button"
                            onClick={() => setExpandedRowId(isExpanded ? null : d.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            {photoCount} Proof{photoCount > 1 ? "s" : ""}
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">No proof photos</span>
                        )}

                        {d.deliveryLat && d.deliveryLng && (
                          <a
                            href={`https://www.google.com/maps?q=${d.deliveryLat},${d.deliveryLng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            Maps
                          </a>
                        )}
                      </div>

                      {/* Proof Drawer inside Mobile Card */}
                      {isExpanded && hasPhotos && (
                        <div className="pt-2 border-t border-slate-200 space-y-2">
                          <p className="text-[11px] font-bold text-slate-700">
                            Verified Proof Photos:
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {d.paymentReceiptUrl && (
                              <div
                                onClick={() => setLightboxUrl(d.paymentReceiptUrl!)}
                                className="aspect-video bg-slate-900 rounded-lg overflow-hidden relative cursor-pointer"
                              >
                                <img src={d.paymentReceiptUrl} alt="Receipt" className="w-full h-full object-cover" />
                                <span className="absolute bottom-1 left-1 text-[9px] bg-black/60 text-white px-1 rounded font-medium">Receipt</span>
                              </div>
                            )}
                            {d.customerCardUrl && (
                              <div
                                onClick={() => setLightboxUrl(d.customerCardUrl!)}
                                className="aspect-video bg-slate-900 rounded-lg overflow-hidden relative cursor-pointer"
                              >
                                <img src={d.customerCardUrl} alt="Customer Card" className="w-full h-full object-cover" />
                                <span className="absolute bottom-1 left-1 text-[9px] bg-black/60 text-white px-1 rounded font-medium">Card</span>
                              </div>
                            )}
                            {d.additionalImageUrl && (
                              <div
                                onClick={() => setLightboxUrl(d.additionalImageUrl!)}
                                className="aspect-video bg-slate-900 rounded-lg overflow-hidden relative cursor-pointer"
                              >
                                <img src={d.additionalImageUrl} alt="Additional" className="w-full h-full object-cover" />
                                <span className="absolute bottom-1 left-1 text-[9px] bg-black/60 text-white px-1 rounded font-medium">Photo 3</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* DESKTOP TABLE VIEW (>=768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-5 py-3.5 text-left font-semibold">Customer</th>
                    <th className="px-5 py-3.5 text-left font-semibold">Product</th>
                    <th className="px-5 py-3.5 text-center font-semibold w-20">Delivered</th>
                    <th className="px-5 py-3.5 text-center font-semibold w-20">Returned</th>
                    <th className="px-5 py-3.5 text-center font-semibold w-20">Pending</th>
                    <th className="px-5 py-3.5 text-right font-semibold w-24">Cash</th>
                    <th className="px-5 py-3.5 text-right font-semibold w-24">Online</th>
                    <th className="px-5 py-3.5 text-right font-semibold w-24">Udhari</th>
                    <th className="px-5 py-3.5 text-left font-semibold">Delivery Boy</th>
                    <th className="px-5 py-3.5 text-center font-semibold w-24">Proof Photos</th>
                    <th className="px-5 py-3.5 text-center font-semibold w-16">GPS</th>
                    <th className="px-5 py-3.5 text-left font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDeliveries.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-5 py-16 text-center text-slate-400">
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

                      const hasPhotos = !!(d.paymentReceiptUrl || d.customerCardUrl || d.additionalImageUrl);
                      const photoCount = (d.paymentReceiptUrl ? 1 : 0) + (d.customerCardUrl ? 1 : 0) + (d.additionalImageUrl ? 1 : 0);
                      const isExpanded = expandedRowId === d.id;

                      return (
                        <React.Fragment key={d.id}>
                          <tr className="hover:bg-slate-50/40 transition-colors">
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

                            {/* Proof Photos Cell */}
                            <td className="px-5 py-3.5 text-center">
                              {hasPhotos ? (
                                <button
                                  type="button"
                                  onClick={() => setExpandedRowId(isExpanded ? null : d.id)}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                                    isExpanded
                                      ? "bg-blue-600 text-white border-blue-600"
                                      : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                  }`}
                                >
                                  <Camera className="w-3.5 h-3.5" />
                                  {photoCount} Proof{photoCount > 1 ? "s" : ""}
                                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                              ) : (
                                <span className="text-slate-300 text-xs font-medium">—</span>
                              )}
                            </td>

                            {/* GPS Cell */}
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
                            <td className="px-5 py-3.5">
                              <StatusBadge status={d.status} />
                            </td>
                          </tr>

                          {/* Expanded Proof Photos Drawer */}
                          {isExpanded && hasPhotos && (
                            <tr className="bg-slate-50/80 border-y border-slate-200">
                              <td colSpan={12} className="px-6 py-4">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <ImageIcon className="w-4 h-4 text-blue-600" />
                                      <span className="text-xs font-bold text-slate-800">
                                        Verified Delivery Proof Photos — {d.customer.name}
                                      </span>
                                    </div>
                                    {d.photosCapturedAt && (
                                      <span className="text-[11px] font-medium text-slate-500">
                                        Captured at: {new Date(d.photosCapturedAt).toLocaleString("en-IN")}
                                      </span>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {d.paymentReceiptUrl && (
                                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                                        <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                                          <span className="text-[11px] font-bold text-slate-700">1. Payment Receipt</span>
                                          <button
                                            onClick={() => setLightboxUrl(d.paymentReceiptUrl!)}
                                            className="text-xs text-blue-600 font-semibold flex items-center gap-1 hover:underline"
                                          >
                                            <Eye className="w-3 h-3" /> Zoom
                                          </button>
                                        </div>
                                        <div
                                          onClick={() => setLightboxUrl(d.paymentReceiptUrl!)}
                                          className="aspect-video bg-slate-900 cursor-pointer overflow-hidden relative group"
                                        >
                                          <img src={d.paymentReceiptUrl} alt="Payment Receipt" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                                            <Eye className="w-4 h-4" /> Expand
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {d.customerCardUrl && (
                                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                                        <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                                          <span className="text-[11px] font-bold text-slate-700">2. Customer Card Entry</span>
                                          <button
                                            onClick={() => setLightboxUrl(d.customerCardUrl!)}
                                            className="text-xs text-blue-600 font-semibold flex items-center gap-1 hover:underline"
                                          >
                                            <Eye className="w-3 h-3" /> Zoom
                                          </button>
                                        </div>
                                        <div
                                          onClick={() => setLightboxUrl(d.customerCardUrl!)}
                                          className="aspect-video bg-slate-900 cursor-pointer overflow-hidden relative group"
                                        >
                                          <img src={d.customerCardUrl} alt="Customer Card" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                                            <Eye className="w-4 h-4" /> Expand
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {d.additionalImageUrl && (
                                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                                        <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                                          <span className="text-[11px] font-bold text-slate-700">3. Additional Photo</span>
                                          <button
                                            onClick={() => setLightboxUrl(d.additionalImageUrl!)}
                                            className="text-xs text-blue-600 font-semibold flex items-center gap-1 hover:underline"
                                          >
                                            <Eye className="w-3 h-3" /> Zoom
                                          </button>
                                        </div>
                                        <div
                                          onClick={() => setLightboxUrl(d.additionalImageUrl!)}
                                          className="aspect-video bg-slate-900 cursor-pointer overflow-hidden relative group"
                                        >
                                          <img src={d.additionalImageUrl} alt="Additional Proof" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                                            <Eye className="w-4 h-4" /> Expand
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
                {filteredDeliveries.length > 0 && (
                  <tfoot className="bg-slate-50/80 border-t border-slate-200 font-bold text-slate-800 text-[13px]">
                    <tr>
                      <td colSpan={2} className="px-5 py-4 text-left font-black">
                        Total Daily Summary ({filteredDeliveries.length} entries)
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
                      <td colSpan={4} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Modal for high-res photo viewing */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-black border border-white/20 shadow-2xl">
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={lightboxUrl} alt="Delivery Proof Watermarked Full" className="max-w-full max-h-[85vh] object-contain mx-auto" />
            <div className="p-3 bg-slate-900 text-white text-xs flex items-center justify-between">
              <span className="font-semibold text-slate-300">Watermarked Delivery Proof Photo</span>
              <a
                href={lightboxUrl}
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-bold"
                onClick={(e) => e.stopPropagation()}
              >
                Open Full Resolution <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
