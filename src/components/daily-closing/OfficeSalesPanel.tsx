"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, User, DollarSign, AlertCircle, FileText, CheckCircle, Receipt } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export interface OfficeTransactionItem {
  type: string;
  description: string | null;
  qty: number;
  unitRate: number;
  amount: number;
  paymentMode: string;
}

export interface OfficeEmployeeClosingData {
  deliveryBoyId: string;
  deliveryBoyName: string;
  cylinderBreakdown?: any[];
  totalDelivered: number;
  pendingQty: number;
  returnedQty: number;
  udhariAmount: number;
  cashCollected: number;
  onlineAmount: number;
  kmBasedExtra: number;
  expectedTotal: number;
  actualCashGiven: number;
  notes: string;
  isOfficeSale: boolean;
  officeTransactionItems: OfficeTransactionItem[];
}

interface OfficeSalesPanelProps {
  employee: OfficeEmployeeClosingData;
  onChange: (updated: OfficeEmployeeClosingData) => void;
  readOnly?: boolean;
}

export function OfficeSalesPanel({
  employee,
  onChange,
  readOnly = false,
}: OfficeSalesPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  const handleFieldChange = (field: keyof OfficeEmployeeClosingData, val: any) => {
    onChange({
      ...employee,
      [field]: val,
    });
  };

  const expectedCash = employee.expectedTotal - employee.onlineAmount - employee.udhariAmount;
  const discrepancy = employee.actualCashGiven - expectedCash;
  const isShortage = discrepancy < 0;
  const isExcess = discrepancy > 0;

  const getPaymentModeDisplay = (mode: string) => {
    if (mode === "CASH") return "Cash";
    if (mode === "ONLINE") return "Online";
    if (mode === "CREDIT") return "Credit";
    return mode;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-4 transition hover:shadow-md duration-200">
      {/* Header */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-5 py-4 bg-slate-50/50 cursor-pointer select-none border-b border-slate-100"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">{employee.deliveryBoyName} (Office Sales)</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Items Sold: {employee.totalDelivered} | Cash: {formatCurrency(employee.cashCollected)} | Udhari: {formatCurrency(employee.udhariAmount)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Expected Cash</p>
            <p className="text-sm font-black text-slate-700">{formatCurrency(expectedCash)}</p>
          </div>

          <div className="text-right">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Status</p>
            {discrepancy === 0 ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full">
                Balanced
              </span>
            ) : isShortage ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full">
                Short: {formatCurrency(Math.abs(discrepancy))}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full">
                Excess: {formatCurrency(discrepancy)}
              </span>
            )}
          </div>

          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </div>

      {/* Content */}
      {isOpen && (
        <div className="p-5 space-y-5 animate-in fade-in duration-200">
          {/* Office Transactions Table */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Office Counter Sales Breakdown
            </h4>
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="px-4 py-2.5">Transaction Type</th>
                    <th className="px-4 py-2.5">Description</th>
                    <th className="px-4 py-2.5 text-center w-24">Qty</th>
                    <th className="px-4 py-2.5 text-right w-28">Unit Rate (₹)</th>
                    <th className="px-4 py-2.5 text-center w-28">Payment Mode</th>
                    <th className="px-4 py-2.5 text-right w-32">Total Value (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employee.officeTransactionItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                        No transactions recorded for this date
                      </td>
                    </tr>
                  ) : (
                    employee.officeTransactionItems.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/20">
                        <td className="px-4 py-3 font-semibold text-slate-700">
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                            {item.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{item.description}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-800">{item.qty}</td>
                        <td className="px-4 py-3 text-right text-slate-500">{formatCurrency(item.unitRate)}</td>
                        <td className="px-4 py-3 text-center text-slate-600 font-medium">{getPaymentModeDisplay(item.paymentMode)}</td>
                        <td className="px-4 py-3 text-right font-black text-slate-800">
                          {formatCurrency(item.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {employee.officeTransactionItems.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-50/30 font-bold text-slate-800 border-t border-slate-100">
                      <td colSpan={2} className="px-4 py-2.5">Total Sales Value</td>
                      <td className="px-4 py-2.5 text-center font-black">
                        {employee.officeTransactionItems.reduce((sum, i) => sum + i.qty, 0)}
                      </td>
                      <td colSpan={2} />
                      <td className="px-4 py-2.5 text-right font-black text-emerald-700">
                        {formatCurrency(employee.expectedTotal)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Reconciliation fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Cash Collected (System)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">₹</span>
                <input
                  type="number"
                  min="0"
                  disabled={true}
                  value={employee.cashCollected}
                  className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none font-bold text-slate-700 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Online Payment (UPI/Cards)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">₹</span>
                <input
                  type="number"
                  min="0"
                  disabled={true}
                  value={employee.onlineAmount}
                  className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none font-bold text-slate-700 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Udhari / Credit Given
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">₹</span>
                <input
                  type="number"
                  min="0"
                  disabled={true}
                  value={employee.udhariAmount}
                  className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none font-bold text-slate-700 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1.5">
                Actual Physical Cash Received
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-semibold text-xs">₹</span>
                <input
                  type="number"
                  min="0"
                  disabled={readOnly}
                  value={employee.actualCashGiven || ""}
                  onChange={(e) => handleFieldChange("actualCashGiven", parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full pl-7 pr-3 py-2 border border-emerald-200 bg-emerald-50/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-black text-emerald-700 disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="border-t border-slate-100 pt-4">
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Notes / Reconciliation Remarks</p>
            <textarea
              disabled={readOnly}
              value={employee.notes || ""}
              onChange={(e) => handleFieldChange("notes", e.target.value)}
              placeholder="Discrepancy explanation, register sync notes, etc."
              rows={1}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none font-medium text-slate-600 disabled:bg-slate-50"
            />
          </div>
        </div>
      )}
    </div>
  );
}
