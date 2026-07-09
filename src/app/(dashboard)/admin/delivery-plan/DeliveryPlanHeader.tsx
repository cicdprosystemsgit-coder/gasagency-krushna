"use client";

import { Truck } from "lucide-react";
import { DateNavigationHeader } from "@/components/ui/DateNavigationHeader";
import { parseISO, format } from "date-fns";

interface DeliveryPlanHeaderProps {
  selectedDate: string;
}

export function DeliveryPlanHeader({ selectedDate }: DeliveryPlanHeaderProps) {
  const formattedSubtitle = `Daily customer delivery list — ${format(parseISO(selectedDate), "dd/MM/yyyy")}`;

  return (
    <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
          <Truck className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight text-slate-800">
            Delivery Plan
          </h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            {formattedSubtitle}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-500">View Date:</span>
        <DateNavigationHeader selectedDate={selectedDate} />
      </div>
    </div>
  );
}
