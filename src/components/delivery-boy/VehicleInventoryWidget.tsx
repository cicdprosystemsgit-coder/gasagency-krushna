"use client";

import React from "react";
import Link from "next/link";
import {
  Truck,
  Package,
  RotateCcw,
  CheckCircle2,
  Clock,
  ArrowRight,
  Plus,
  Layers,
  Fuel,
  AlertCircle,
} from "lucide-react";

export interface VehicleTripItem {
  productId: string;
  productName: string;
  loaded: number;
  unsoldReturned?: number;
  emptyReturned?: number;
}

export interface VehicleInventoryWidgetProps {
  assignedVehicle: {
    id: string;
    vehicleNo: string;
    vehicleName: string;
    vehicleType: string;
    status: string;
  } | null;
  todayTrip: {
    id?: string;
    cylindersLoaded: number;
    cylindersDelivered: number;
    cylindersReturned: number;
    tripStatus: string;
    departureTime?: string | Date | null;
    returnTime?: string | Date | null;
    items?: any;
    notes?: string | null;
  } | null;
  todayCountRequest?: {
    id: string;
    status: string;
    totalRequested: number;
    totalLoaded: number;
    fulfilledItems?: any;
    fuelLitres?: number | null;
    fuelAmount?: number | null;
    fulfilledBy?: { name: string } | null;
  } | null;
  totalDeliveredToday: number;
}

export function VehicleInventoryWidget({
  assignedVehicle,
  todayTrip,
  todayCountRequest,
  totalDeliveredToday,
}: VehicleInventoryWidgetProps) {
  if (!assignedVehicle) {
    return (
      <div className="rounded-2xl p-5 mb-5 border border-zinc-200 bg-zinc-50 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-zinc-200 text-zinc-500 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-zinc-700">No Vehicle Assigned</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Contact your agency manager to assign a delivery vehicle to your account.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Parse trip items breakdown
  let parsedTripItems: VehicleTripItem[] = [];
  if (todayTrip?.items) {
    if (typeof todayTrip.items === "string") {
      try {
        parsedTripItems = JSON.parse(todayTrip.items);
      } catch {}
    } else if (Array.isArray(todayTrip.items)) {
      parsedTripItems = todayTrip.items;
    }
  } else if (todayCountRequest?.fulfilledItems) {
    if (Array.isArray(todayCountRequest.fulfilledItems)) {
      parsedTripItems = todayCountRequest.fulfilledItems.map((fi: any) => ({
        productId: fi.productId,
        productName: fi.productName,
        loaded: Number(fi.loadedQty) || 0,
      }));
    }
  }

  const tripStatus = todayTrip?.tripStatus || "NO_TRIP";
  const isOut = tripStatus === "OUT_FOR_DELIVERY";
  const isLoaded = tripStatus === "LOADED";
  const isReturned = tripStatus === "RETURNED" || tripStatus === "PARTIAL_RETURN";

  const totalLoaded = todayTrip?.cylindersLoaded || todayCountRequest?.totalLoaded || 0;
  // If returned, delivered is recorded in cylindersDelivered; else delivered so far today
  const deliveredCount = isReturned ? (todayTrip?.cylindersDelivered ?? 0) : totalDeliveredToday;
  const remainingFilledInTruck = Math.max(0, totalLoaded - deliveredCount);
  const emptiesCollectedInTruck = isReturned ? (todayTrip?.cylindersDelivered ?? 0) : totalDeliveredToday;

  const deliveredPercent = totalLoaded > 0 ? Math.min(100, (deliveredCount / totalLoaded) * 100) : 0;
  const remainingPercent = totalLoaded > 0 ? Math.max(0, (remainingFilledInTruck / totalLoaded) * 100) : 0;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 md:p-6 mb-5 shadow-sm space-y-5">
      {/* Top Banner: Vehicle Identity + Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 shadow-xs">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-base md:text-lg font-extrabold text-zinc-900 tracking-tight">
                {assignedVehicle.vehicleNo}
              </span>
              <span className="text-[11px] font-semibold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md">
                {assignedVehicle.vehicleName} · {assignedVehicle.vehicleType}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Live Vehicle Cylinder Tracing · Synced with Godown Floor
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isOut ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              On Delivery Route
            </span>
          ) : isLoaded ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-xs">
              <Package className="w-3.5 h-3.5 text-blue-600" />
              Loaded at Godown · Ready to Roll
            </span>
          ) : isReturned ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Returned & Reconciled at Godown
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600 border border-zinc-200">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              No Active Trip Today
            </span>
          )}
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total Loaded From Godown */}
        <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/40 space-y-1">
          <div className="flex items-center justify-between text-blue-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">Loaded from Godown</span>
            <Package className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-blue-900">{totalLoaded}</p>
          <p className="text-[10px] text-blue-600/80 font-medium">Deducted from Godown stock</p>
        </div>

        {/* Delivered to Customers */}
        <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/40 space-y-1">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">Delivered</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-900">{deliveredCount}</p>
          <p className="text-[10px] text-emerald-600/80 font-medium">To domestic / commercial clients</p>
        </div>

        {/* Currently in Vehicle (Filled) */}
        <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/40 space-y-1">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {isReturned ? "Unsold Returned" : "Remaining in Truck"}
            </span>
            <Truck className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-900">
            {isReturned ? (todayTrip?.cylindersReturned ?? 0) : remainingFilledInTruck}
          </p>
          <p className="text-[10px] text-amber-600/80 font-medium">
            {isReturned ? "Returned back to Godown" : "Filled cylinders ready for drop"}
          </p>
        </div>

        {/* Empties Collected in Vehicle */}
        <div className="p-4 rounded-xl border border-purple-100 bg-purple-50/40 space-y-1">
          <div className="flex items-center justify-between text-purple-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {isReturned ? "Empties Returned" : "Empties on Truck"}
            </span>
            <RotateCcw className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-purple-900">{emptiesCollectedInTruck}</p>
          <p className="text-[10px] text-purple-600/80 font-medium">
            {isReturned ? "Added back to Godown empty pool" : "Collected from delivery drops"}
          </p>
        </div>
      </div>

      {/* Progress Bar of Delivery Completion */}
      {totalLoaded > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-[11px] font-semibold text-zinc-600">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Delivered: {deliveredCount} ({Math.round(deliveredPercent)}%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Remaining Filled: {remainingFilledInTruck} ({Math.round(remainingPercent)}%)
            </span>
          </div>

          <div className="h-3 w-full bg-zinc-100 rounded-full overflow-hidden flex shadow-inner">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${deliveredPercent}%` }}
              title={`Delivered: ${deliveredCount}`}
            />
            <div
              className="h-full bg-amber-400 transition-all duration-500"
              style={{ width: `${remainingPercent}%` }}
              title={`Remaining: ${remainingFilledInTruck}`}
            />
          </div>
        </div>
      )}

      {/* Per-Cylinder Breakdown (if available) */}
      {parsedTripItems.length > 0 && (
        <div className="pt-3 border-t border-zinc-100 space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            Vehicle Cylinder Breakdown
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {parsedTripItems.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl border border-zinc-100 bg-zinc-50/70 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-zinc-800 truncate">{item.productName}</p>
                  <p className="text-[10px] text-zinc-400">
                    Loaded: <strong className="text-blue-600">{item.loaded}</strong>
                  </p>
                </div>
                {isReturned ? (
                  <div className="text-right text-[10px]">
                    <span className="block text-emerald-600 font-bold">Ret: {item.unsoldReturned ?? 0}</span>
                    <span className="block text-purple-600 font-bold">Emp: {item.emptyReturned ?? 0}</span>
                  </div>
                ) : (
                  <span className="text-xs font-black px-2 py-0.5 rounded-md bg-white border border-zinc-200 text-zinc-700 shadow-xs">
                    {item.loaded} cyl
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick CTAs Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-100">
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          {todayCountRequest?.fuelLitres ? (
            <span className="flex items-center gap-1 font-semibold text-zinc-600">
              <Fuel className="w-3.5 h-3.5 text-blue-600" />
              Fuel Filled: {todayCountRequest.fuelLitres}L (₹{todayCountRequest.fuelAmount || 0})
            </span>
          ) : null}
          {todayCountRequest?.fulfilledBy ? (
            <span className="text-[11px] text-zinc-400">
              Loaded by: <strong>{todayCountRequest.fulfilledBy.name}</strong>
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/delivery-boy/my-deliveries"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Delivery
          </Link>
          <Link
            href="/delivery-boy/delivery-count"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-zinc-700 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-xl transition shadow-xs"
          >
            Load Requests <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
