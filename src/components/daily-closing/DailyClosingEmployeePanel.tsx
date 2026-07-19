"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, User, DollarSign, AlertCircle, FileText, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export interface CylinderBreakdownItem {
  productId: string;
  productName: string;
  soldQty: number;
  baseRate: number;
  kmRate: number;
  kmExtra: number;
  totalAmt: number;
}

export interface EmployeeClosingData {
  deliveryBoyId: string;
  deliveryBoyName: string;
  cylinderBreakdown: CylinderBreakdownItem[];
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
}

interface DailyClosingEmployeePanelProps {
  employee: EmployeeClosingData;
  onChange: (updated: EmployeeClosingData) => void;
  readOnly?: boolean;
}

export function DailyClosingEmployeePanel({
  employee,
  onChange,
  readOnly = false,
}: DailyClosingEmployeePanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Recalculates expected totals and kmBasedExtra based on the current rates
  const handleKmRateChange = (productId: string, baseRate: number, val: string) => {
    const numVal = parseFloat(val) || 0;
    const updatedBreakdown = employee.cylinderBreakdown.map((item) => {
      if (item.productId === productId && item.baseRate === baseRate) {
        const kmExtra = Math.max(0, numVal - item.baseRate) * item.soldQty;
        const totalAmt = numVal * item.soldQty;
        return {
          ...item,
          kmRate: numVal,
          kmExtra,
          totalAmt,
        };
      }
      return item;
    });

    const kmBasedExtra = updatedBreakdown.reduce((sum, item) => sum + item.kmExtra, 0);
    // Expected total is the sum of all cylinder sales totals
    const expectedTotal = updatedBreakdown.reduce((sum, item) => sum + item.totalAmt, 0);

    onChange({
      ...employee,
      cylinderBreakdown: updatedBreakdown,
      kmBasedExtra,
      expectedTotal,
    });
  };

  const handleFieldChange = (field: keyof EmployeeClosingData, val: any) => {
    onChange({
      ...employee,
      [field]: val,
    });
  };

  // Financial reconciliation calculations
  const expectedCash = employee.expectedTotal - employee.onlineAmount - employee.udhariAmount;
  const discrepancy = employee.actualCashGiven - expectedCash;
  const isShortage = discrepancy < 0;
  const isExcess = discrepancy > 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-4 transition hover:shadow-md duration-200">
      {/* Header */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-5 py-4 bg-slate-50/50 cursor-pointer select-none border-b border-slate-100"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">{employee.deliveryBoyName}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Delivered: {employee.totalDelivered} | Cash: {formatCurrency(employee.cashCollected)} | Udhari: {formatCurrency(employee.udhariAmount)}
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
          {/* Cylinder breakdown table */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Cylinder Sales Breakdown
            </h4>
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="px-4 py-2.5">Cylinder Type</th>
                    <th className="px-4 py-2.5 text-center w-24">Qty Sold</th>
                    <th className="px-4 py-2.5 text-right w-28">Base Rate (₹)</th>
                    <th className="px-4 py-2.5 text-right w-36">Km-based Rate (₹)</th>
                    <th className="px-4 py-2.5 text-right w-28">Km Extra (₹)</th>
                    <th className="px-4 py-2.5 text-right w-32">Total Value (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employee.cylinderBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                        No sales recorded for this date
                      </td>
                    </tr>
                  ) : (
                    employee.cylinderBreakdown.map((item) => (
                      <tr key={`${item.productId}_${item.baseRate}`} className="hover:bg-slate-50/20">
                        <td className="px-4 py-3 font-semibold text-slate-700">
                          {item.productName}
                          <span className="block text-[10px] text-slate-400 font-medium">Rate: {formatCurrency(item.baseRate)}</span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-slate-800">{item.soldQty}</td>
                        <td className="px-4 py-3 text-right text-slate-500">{formatCurrency(item.baseRate)}</td>
                        <td className="px-4 py-3 text-right">
                          {readOnly ? (
                            <span className="font-bold text-slate-800">{formatCurrency(item.kmRate)}</span>
                          ) : (
                            <input
                              type="number"
                              min={item.baseRate}
                              step="0.01"
                              value={item.kmRate || ""}
                              onChange={(e) => handleKmRateChange(item.productId, item.baseRate, e.target.value)}
                              className="w-24 text-right px-2.5 py-1 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-slate-800 bg-slate-50/30"
                            />
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-amber-700 font-medium">
                          {item.kmExtra > 0 ? `+${formatCurrency(item.kmExtra)}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-slate-800">
                          {formatCurrency(item.totalAmt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {employee.cylinderBreakdown.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-50/30 font-bold text-slate-800 border-t border-slate-100">
                      <td className="px-4 py-2.5">Total Sales Value</td>
                      <td className="px-4 py-2.5 text-center font-black">
                        {employee.cylinderBreakdown.reduce((sum, i) => sum + i.soldQty, 0)}
                      </td>
                      <td colSpan={2} />
                      <td className="px-4 py-2.5 text-right text-amber-700">
                        {employee.kmBasedExtra > 0 ? `+${formatCurrency(employee.kmBasedExtra)}` : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right font-black text-blue-700">
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
                  disabled={readOnly}
                  value={employee.cashCollected}
                  onChange={(e) => handleFieldChange("cashCollected", parseFloat(e.target.value) || 0)}
                  className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 disabled:bg-slate-50 disabled:text-slate-500"
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
                  disabled={readOnly}
                  value={employee.onlineAmount}
                  onChange={(e) => handleFieldChange("onlineAmount", parseFloat(e.target.value) || 0)}
                  className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 disabled:bg-slate-50 disabled:text-slate-500"
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
                  disabled={readOnly}
                  value={employee.udhariAmount}
                  onChange={(e) => handleFieldChange("udhariAmount", parseFloat(e.target.value) || 0)}
                  className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 text-blue-700">
                Actual Physical Cash Received
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600 font-semibold text-xs">₹</span>
                <input
                  type="number"
                  min="0"
                  disabled={readOnly}
                  value={employee.actualCashGiven || ""}
                  onChange={(e) => handleFieldChange("actualCashGiven", parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full pl-7 pr-3 py-2 border border-blue-200 bg-blue-50/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-black text-blue-700 disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Delivery Boy details and notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
            <div className="flex gap-4 items-center">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Pending Deliveries</p>
                {readOnly ? (
                  <p className="text-sm font-bold text-slate-800">{employee.pendingQty}</p>
                ) : (
                  <input
                    type="number"
                    min="0"
                    value={employee.pendingQty}
                    onChange={(e) => handleFieldChange("pendingQty", parseInt(e.target.value) || 0)}
                    className="w-20 mt-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-slate-700"
                  />
                )}
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Returned Empty Cylinders</p>
                {readOnly ? (
                  <p className="text-sm font-bold text-slate-800">{employee.returnedQty}</p>
                ) : (
                  <input
                    type="number"
                    min="0"
                    value={employee.returnedQty}
                    onChange={(e) => handleFieldChange("returnedQty", parseInt(e.target.value) || 0)}
                    className="w-20 mt-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-slate-700"
                  />
                )}
              </div>
            </div>

            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Notes / Reconciliation Remarks</p>
              <textarea
                disabled={readOnly}
                value={employee.notes || ""}
                onChange={(e) => handleFieldChange("notes", e.target.value)}
                placeholder="Discrepancy explanation, km override details, etc."
                rows={1}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-medium text-slate-600 disabled:bg-slate-50"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
