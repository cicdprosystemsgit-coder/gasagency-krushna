"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatCurrency } from "@/lib/utils";
import { ClipboardCheck, CheckSquare, Printer } from "lucide-react";
import { DailyClosingEmployeePanel } from "@/components/daily-closing/DailyClosingEmployeePanel";

interface EmployeeClosing {
  id: string;
  date: string;
  status: string;
  cashVerified: boolean;
  totalDelivered: number;
  pendingQty: number;
  returnedQty: number;
  udhariAmount: number;
  cashCollected: number;
  onlineAmount: number;
  kmBasedExtra: number;
  expectedTotal: number;
  actualCashGiven: number;
  shortageAmount: number;
  excessAmount: number;
  notes: string | null;
  cylinderBreakdown: any[];
}

interface DeliveryBoyClosingClientProps {
  initialClosings: EmployeeClosing[];
}

export function DeliveryBoyClosingClient({ initialClosings }: DeliveryBoyClosingClientProps) {
  const [closings] = useState(initialClosings);
  const [detailClosing, setDetailClosing] = useState<EmployeeClosing | null>(null);

  return (
    <>
      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[11px] tracking-wider">
                <th className="px-5 py-3.5 text-left">Date</th>
                <th className="px-5 py-3.5 text-center">Delivered Qty</th>
                <th className="px-5 py-3.5 text-right">Online Payments</th>
                <th className="px-5 py-3.5 text-right">Udhari (Credit)</th>
                <th className="px-5 py-3.5 text-right">Actual Cash Given</th>
                <th className="px-5 py-3.5 text-right">Shortage/Excess</th>
                <th className="px-5 py-3.5 text-left">Status</th>
                <th className="px-5 py-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {closings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-14 text-center">
                    <ClipboardCheck className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                    <p className="text-slate-400">No closing records found</p>
                  </td>
                </tr>
              ) : (
                closings.map((c) => (
                  <tr key={c.id} className="table-row border-b border-slate-50 last:border-0 hover:bg-slate-50/20">
                    <td className="px-5 py-3.5 font-semibold text-slate-800">{formatDate(c.date)}</td>
                    <td className="px-5 py-3.5 text-center font-bold text-blue-700">{c.totalDelivered}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-purple-700">{formatCurrency(c.onlineAmount)}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-amber-700">{formatCurrency(c.udhariAmount)}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-green-700">{formatCurrency(c.actualCashGiven)}</td>
                    <td className="px-5 py-3.5 text-right font-semibold">
                      {c.shortageAmount > 0 ? (
                        <span className="text-rose-600">-{formatCurrency(c.shortageAmount)}</span>
                      ) : c.excessAmount > 0 ? (
                        <span className="text-emerald-600">+{formatCurrency(c.excessAmount)}</span>
                      ) : (
                        <span className="text-slate-400">Balanced</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => setDetailClosing(c)}
                        className="text-xs text-blue-700 hover:text-blue-800 font-bold bg-blue-50 px-2.5 py-1.5 rounded-lg transition"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal open={!!detailClosing} onClose={() => setDetailClosing(null)} title={`Closing Detail: ${detailClosing ? formatDate(detailClosing.date) : ""}`} size="xl">
        {detailClosing && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-emerald-50/40 border border-emerald-100/50 rounded-2xl">
              <div>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full">
                  <CheckSquare className="w-3.5 h-3.5" /> Cash Handover Verified
                </span>
                <p className="text-xs text-slate-500 mt-2">
                  Approval Status: <StatusBadge status={detailClosing.status} />
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase">System Sales Value</p>
                <p className="text-lg font-black text-slate-800">{formatCurrency(detailClosing.expectedTotal)}</p>
              </div>
            </div>

            <DailyClosingEmployeePanel
              employee={{
                deliveryBoyId: "",
                deliveryBoyName: "Reconciliation Record",
                cylinderBreakdown: detailClosing.cylinderBreakdown,
                totalDelivered: detailClosing.totalDelivered,
                pendingQty: detailClosing.pendingQty,
                returnedQty: detailClosing.returnedQty,
                udhariAmount: detailClosing.udhariAmount,
                cashCollected: detailClosing.cashCollected,
                onlineAmount: detailClosing.onlineAmount,
                kmBasedExtra: detailClosing.kmBasedExtra,
                expectedTotal: detailClosing.expectedTotal,
                actualCashGiven: detailClosing.actualCashGiven,
                notes: detailClosing.notes || "",
              }}
              onChange={() => {}}
              readOnly={true}
            />

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-800 font-bold bg-white border border-slate-200 px-4 py-2 rounded-xl transition"
              >
                <Printer className="w-4 h-4" /> Print Closing Summary
              </button>

              <button
                type="button"
                onClick={() => setDetailClosing(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
