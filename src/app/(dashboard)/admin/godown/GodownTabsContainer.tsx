"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Warehouse, Truck, MapPin, Map } from "lucide-react";
import { GodownClient } from "./GodownClient";
import { InternalVehiclesClient } from "./InternalVehiclesClient";

// Dynamically import map component with SSR disabled
const GodownTrackingMap = dynamic(
  () => import("@/components/attendance/GodownTrackingMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[600px] bg-slate-100 flex items-center justify-center rounded-xl border border-slate-200">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-[13px] font-medium text-slate-500">Loading Map Layer...</p>
        </div>
      </div>
    ),
  }
);

interface Props {
  initialRecords: any[];
  totalFilled: number;
  totalEmpty: number;
  deliveryVehicles: any[];
  deliveryBoys: any[];
  todayTripLogs: any[];
  cylinderTypes: any[];
  isAdmin: boolean;
  userId: string;
  
  // For Map view
  mapRecords: any[];
  mapTrips: any[];
  mapMovements: any[];
  selectedDate: string;
}

export function GodownTabsContainer({
  initialRecords,
  totalFilled,
  totalEmpty,
  deliveryVehicles,
  deliveryBoys,
  todayTripLogs,
  cylinderTypes,
  isAdmin,
  userId,
  mapRecords,
  mapTrips,
  mapMovements,
  selectedDate,
}: Props) {
  const [activeTab, setActiveTab] = useState<"supply" | "fleet" | "live">("supply");

  return (
    <div className="space-y-6">
      {/* Premium Tab bar */}
      <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-100/80 border border-slate-200/60 w-full sm:w-fit backdrop-blur-xs">
        <button
          onClick={() => setActiveTab("supply")}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200 ${
            activeTab === "supply"
              ? "bg-white text-blue-600 shadow-sm border border-slate-200/50"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <Warehouse className="w-4 h-4" />
          <span>Supply Vehicles</span>
        </button>

        <button
          onClick={() => setActiveTab("fleet")}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200 ${
            activeTab === "fleet"
              ? "bg-white text-emerald-600 shadow-sm border border-slate-200/50"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Internal Fleet</span>
        </button>

        <button
          onClick={() => setActiveTab("live")}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200 ${
            activeTab === "live"
              ? "bg-white text-purple-600 shadow-sm border border-slate-200/50"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <Map className="w-4 h-4 animate-pulse" />
          <span>Live GPS Tracking</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="transition-all duration-200">
        {activeTab === "supply" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <div className="w-2 h-2 rounded-full bg-blue-600" />
              <p className="text-[12px] font-bold uppercase tracking-wider text-slate-500">
                Company Supply Vehicle (Bharat Gas)
              </p>
            </div>
            <GodownClient
              initialRecords={initialRecords}
              totalFilled={totalFilled}
              totalEmpty={totalEmpty}
              isAdmin={isAdmin}
              userId={userId}
              cylinderTypes={cylinderTypes}
            />
          </div>
        )}

        {activeTab === "fleet" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <div className="w-2 h-2 rounded-full bg-emerald-600" />
              <p className="text-[12px] font-bold uppercase tracking-wider text-slate-500">
                Internal Delivery Fleet
              </p>
            </div>
            <InternalVehiclesClient
              initialVehicles={deliveryVehicles}
              initialTripLogs={todayTripLogs}
              deliveryBoys={deliveryBoys}
              isAdmin={isAdmin}
              userId={userId}
              cylinderTypes={cylinderTypes}
            />
          </div>
        )}

        {activeTab === "live" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <div className="w-2 h-2 rounded-full bg-purple-600" />
              <p className="text-[12px] font-bold uppercase tracking-wider text-slate-500">
                Live Operations Geo-Tracking Map
              </p>
            </div>
            <GodownTrackingMap
              initialRecords={mapRecords}
              initialTrips={mapTrips}
              initialMovements={mapMovements}
              selectedDate={selectedDate}
            />
          </div>
        )}
      </div>
    </div>
  );
}
