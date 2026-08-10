"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Warehouse } from "lucide-react";
import { GodownClient } from "../../admin/godown/GodownClient";
import { InternalVehiclesClient } from "../../admin/godown/InternalVehiclesClient";
import { DateNavigationHeader } from "@/components/ui/DateNavigationHeader";

interface GodownKeeperClientProps {
  initialRecords: any[];
  totalFilled: number;
  totalEmpty: number;
  userId: string;
  cylinderTypes: any[];
  initialVehicles: any[];
  initialTripLogs: any[];
  deliveryBoys: any[];
  selectedDate?: string;
}

export function GodownKeeperClient({
  initialRecords,
  totalFilled,
  totalEmpty,
  userId,
  cylinderTypes,
  initialVehicles,
  initialTripLogs,
  deliveryBoys,
  selectedDate = new Date().toISOString().slice(0, 10),
}: GodownKeeperClientProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <PageHeader
          title="Godown Keeper Dashboard"
          subtitle="Track company supply vehicles and manage internal delivery fleet operations"
          icon={<Warehouse className="w-5 h-5 text-blue-600" />}
        />
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date:</span>
          <DateNavigationHeader selectedDate={selectedDate} />
        </div>
      </div>

      {/* Company Vehicle Section */}
      <div className="mb-2">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full" style={{ background: "#2563EB" }} />
          <p className="text-[13px] font-semibold uppercase tracking-wide text-slate-600">Company Supply Vehicle (Bharat Gas)</p>
        </div>
        <GodownClient
          initialRecords={initialRecords}
          totalFilled={totalFilled}
          totalEmpty={totalEmpty}
          isAdmin={false}
          userId={userId}
          cylinderTypes={cylinderTypes}
          selectedDate={selectedDate}
        />
      </div>

      {/* Divider */}
      <div className="my-8" style={{ borderTop: "2px dashed #E2E8F0" }} />

      {/* Internal Fleet Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full" style={{ background: "#16A34A" }} />
          <p className="text-[13px] font-semibold uppercase tracking-wide text-slate-600">Internal Delivery Fleet</p>
        </div>
        <InternalVehiclesClient
          initialVehicles={initialVehicles}
          initialTripLogs={initialTripLogs}
          deliveryBoys={deliveryBoys}
          isAdmin={false}
          userId={userId}
          cylinderTypes={cylinderTypes}
          selectedDate={selectedDate}
        />
      </div>
    </div>
  );
}
