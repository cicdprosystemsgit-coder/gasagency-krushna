"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Plus, ClipboardCheck, CheckCircle2, ChevronDown, ChevronRight, CheckSquare, Calendar, AlertTriangle, Printer, Edit2 } from "lucide-react";
import { createDailyClosingWithEmployees, getDeliveryBoysForDate, approveDailyClosing, updateDailyClosingEmployee } from "@/app/actions/daily-closing";
import { CalendarPicker } from "@/components/ui/CalendarPicker";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { DailyClosingEmployeePanel, EmployeeClosingData } from "@/components/daily-closing/DailyClosingEmployeePanel";

interface ClosingEmployee {
  id: string;
  deliveryBoy: { id: string; name: string };
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

interface Closing {
  id: string;
  date: string;
  totalDeliveries: number;
  totalCashCollected: number;
  totalOnlinePayment: number;
  totalUdhari: number;
  totalCollection: number;
  pendingDeliveries: number;
  returnedCylinders: number;
  grandExpected: number;
  cashOnHand: number;
  shortageAmount: number;
  excessAmount: number;
  cashVerified: boolean;
  status: string;
  notes: string | null;
  managerApprovedAt: string | null;
  adminApprovedAt: string | null;
  employeeClosings: ClosingEmployee[];
}

interface DailyClosingClientProps {
  initialClosings: Closing[];
  role: string;
}

export function DailyClosingClient({ initialClosings, role }: DailyClosingClientProps) {
  const [closings, setClosings] = useState(initialClosings);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailClosing, setDetailClosing] = useState<Closing | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editableEmployees, setEditableEmployees] = useState<EmployeeClosingData[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Wizard state (fallback creation for admin if they want to create directly)
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [fetchedEmployees, setFetchedEmployees] = useState<EmployeeClosingData[]>([]);
  const [generalNotes, setGeneralNotes] = useState("");
  const [cashVerified, setCashVerified] = useState(false);

  const filteredClosings = closings.filter((c) => {
    const cDate = new Date(c.date);
    cDate.setHours(0, 0, 0, 0);
    if (dateFrom && cDate < new Date(dateFrom)) return false;
    if (dateTo && cDate > new Date(dateTo)) return false;
    return true;
  });

  const handleFetchDeliveryBoys = () => {
    setError("");
    startTransition(async () => {
      const res = await getDeliveryBoysForDate(selectedDate);
      if (res.error) {
        setError(res.error);
        return;
      }
      if (!res.deliveryBoys || res.deliveryBoys.length === 0) {
        setError("No delivery records found for this date.");
        setFetchedEmployees([]);
        return;
      }
      const formatted = res.deliveryBoys.map((db: any) => ({
        deliveryBoyId: db.deliveryBoy.id,
        deliveryBoyName: db.deliveryBoy.name,
        cylinderBreakdown: db.products.map((p: any) => ({
          productId: p.productId,
          productName: p.productName,
          soldQty: p.soldQty,
          baseRate: p.baseRate,
          kmRate: p.kmRate,
          kmExtra: p.kmExtra,
          totalAmt: p.totalAmt,
        })),
        totalDelivered: db.totalDelivered,
        pendingQty: db.pendingQty,
        returnedQty: db.returnedQty,
        udhariAmount: db.udhariAmount,
        cashCollected: db.cashCollected,
        onlineAmount: db.onlineAmount,
        kmBasedExtra: 0,
        expectedTotal: db.cashCollected + db.onlineAmount + db.udhariAmount,
        actualCashGiven: 0,
        notes: "",
      }));
      setFetchedEmployees(formatted);
      setStep(2);
    });
  };

  const handleEmployeeChange = (index: number, updated: EmployeeClosingData) => {
    const next = [...fetchedEmployees];
    next[index] = updated;
    setFetchedEmployees(next);
  };

  const handleSubmitClosing = () => {
    if (!cashVerified) {
      setError("Please physically verify all cash payments and check the confirmation box.");
      return;
    }
    setError("");
    const payload = {
      date: selectedDate,
      notes: generalNotes,
      employeeClosings: fetchedEmployees,
      cashVerified: true,
    };

    startTransition(async () => {
      const res = await createDailyClosingWithEmployees(JSON.stringify(payload));
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.closing) {
        window.location.reload();
      }
    });
  };

  const handleApprove = (id: string) => {
    startTransition(async () => {
      const result = await approveDailyClosing(id, role);
      if (result.success) {
        setClosings((prev) =>
          prev.map((c) =>
            c.id === id
              ? {
                ...c,
                status: role === "ADMIN" ? "APPROVED" : "PENDING",
                managerApprovedAt: role === "MANAGER" ? new Date().toISOString() : c.managerApprovedAt,
                adminApprovedAt: role === "ADMIN" ? new Date().toISOString() : c.adminApprovedAt,
              }
              : c
          )
        );
        if (detailClosing?.id === id) {
          setDetailClosing((prev) =>
            prev
              ? {
                ...prev,
                status: role === "ADMIN" ? "APPROVED" : "PENDING",
                managerApprovedAt: role === "MANAGER" ? new Date().toISOString() : prev.managerApprovedAt,
                adminApprovedAt: role === "ADMIN" ? new Date().toISOString() : prev.adminApprovedAt,
              }
              : null
          );
        }
      }
    });
  };

  // Entering edit mode for existing closing records
  const handleStartEdit = (closing: Closing) => {
    const editable = closing.employeeClosings.map((ec) => ({
      id: ec.id, // Keep the db row ID to update
      deliveryBoyId: ec.deliveryBoy.id,
      deliveryBoyName: ec.deliveryBoy.name,
      cylinderBreakdown: ec.cylinderBreakdown,
      totalDelivered: ec.totalDelivered,
      pendingQty: ec.pendingQty,
      returnedQty: ec.returnedQty,
      udhariAmount: ec.udhariAmount,
      cashCollected: ec.cashCollected,
      onlineAmount: ec.onlineAmount,
      kmBasedExtra: ec.kmBasedExtra,
      expectedTotal: ec.expectedTotal,
      actualCashGiven: ec.actualCashGiven,
      notes: ec.notes || "",
    }));
    setEditableEmployees(editable);
    setEditMode(true);
  };

  const handleEditableEmployeeChange = (index: number, updated: EmployeeClosingData) => {
    const next = [...editableEmployees];
    next[index] = updated;
    setEditableEmployees(next);
  };

  const handleSaveChanges = () => {
    setError("");
    startTransition(async () => {
      try {
        for (const emp of editableEmployees) {
          const rowId = (emp as any).id;
          if (rowId) {
            await updateDailyClosingEmployee(rowId, JSON.stringify(emp));
          }
        }
        window.location.reload();
      } catch (err: any) {
        setError(err.message || "Failed to save changes.");
      }
    });
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm text-slate-500 font-semibold">{filteredClosings.length} closing records</span>
          <DateRangePicker
            dateFrom={dateFrom}
            dateTo={dateTo}
            onChange={(from, to) => {
              setDateFrom(from);
              setDateTo(to);
            }}
          />
        </div>
        <button
          onClick={() => {
            setError("");
            setStep(1);
            setFetchedEmployees([]);
            setCashVerified(false);
            setGeneralNotes("");
            setModalOpen(true);
          }}
          className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-800 transition shadow-sm"
        >
          <Plus className="w-4 h-4" /> Record Daily Closing
        </button>
      </div>

      {/* Closings List Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[11px] tracking-wider">
                <th className="px-5 py-3.5 text-left">Date</th>
                <th className="px-5 py-3.5 text-center">Deliveries</th>
                <th className="px-5 py-3.5 text-right">Cash Handover</th>
                <th className="px-5 py-3.5 text-right">Online Payments</th>
                <th className="px-5 py-3.5 text-right">Udhari (Credit)</th>
                <th className="px-5 py-3.5 text-right">Shortage/Excess</th>
                <th className="px-5 py-3.5 text-left">Status</th>
                <th className="px-5 py-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredClosings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-14 text-center">
                    <ClipboardCheck className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                    <p className="text-slate-400">No daily closing records found</p>
                  </td>
                </tr>
              ) : (
                filteredClosings.map((c) => (
                  <tr key={c.id} className="table-row border-b border-slate-50 last:border-0 hover:bg-slate-50/20">
                    <td className="px-5 py-3.5 font-semibold text-slate-800">{formatDate(c.date)}</td>
                    <td className="px-5 py-3.5 text-center font-bold text-blue-700">{c.totalDeliveries}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-green-700">{formatCurrency(c.cashOnHand)}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-purple-700">{formatCurrency(c.totalOnlinePayment)}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-amber-700">{formatCurrency(c.totalUdhari)}</td>
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
                      <StatusBadge status={c.status === "PENDING" && c.managerApprovedAt ? "MANAGER_APPROVED" : c.status} />
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

      {/* Record Daily Closing Wizard Modal (Add closing) */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Record Daily Closing" size="xl" style={{ minHeight: "500px" }}>
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            {[
              { num: 1, label: "Select Date" },
              { num: 2, label: "Adjust Boy Records" },
              { num: 3, label: "Verify Physical Cash" },
            ].map((s) => (
              <div key={s.num} className="flex items-center gap-2">
                <span
                  className={`w-6 h-4 rounded-full flex items-center justify-center text-xs font-bold ${step === s.num
                    ? "bg-blue-700 text-white"
                    : step > s.num
                      ? "bg-green-600 text-white"
                      : "bg-slate-100 text-slate-400"
                    }`}
                >
                  {s.num
                  }</span>
                <span className={`text-xs font-bold ${step === s.num ? "text-slate-800" : "text-slate-400"}`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4 max-w-md mx-auto py-4 min-h-[480px]">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Closing Date</label>
                <CalendarPicker value={selectedDate} onChange={(val) => setSelectedDate(val)} />
              </div>
              <p className="text-xs text-slate-400">
                This will automatically fetch all active deliveries logged by delivery boys for this date.
              </p>
              <button
                type="button"
                onClick={handleFetchDeliveryBoys}
                disabled={isPending}
                className="w-full bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs hover:bg-blue-800 transition disabled:opacity-60"
              >
                {isPending ? "Fetching Records..." : "Fetch Active Boys & Proceed"}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-blue-50/50 px-4 py-3 rounded-xl border border-blue-100">
                <p className="text-xs text-blue-700 font-semibold">
                  Found <span className="font-bold">{fetchedEmployees.length}</span> active delivery boy records for{" "}
                  {formatDate(selectedDate)}.
                </p>
                <button
                  onClick={() => setStep(1)}
                  className="text-xs text-slate-600 hover:text-slate-800 font-bold bg-white border border-slate-200 px-3 py-1.5 rounded-lg transition"
                >
                  Change Date
                </button>
              </div>

              <div className="max-h-[50vh] overflow-y-auto pr-1">
                {fetchedEmployees.map((emp, index) => (
                  <DailyClosingEmployeePanel
                    key={emp.deliveryBoyId}
                    employee={emp}
                    onChange={(updated) => handleEmployeeChange(index, updated)}
                  />
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 transition"
                >
                  Next: Verify Cash & Submit
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Reconciliation Summary
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold pb-2">
                        <th className="py-2">Delivery Boy</th>
                        <th className="py-2 text-right">Online (UPI)</th>
                        <th className="py-2 text-right">Udhari (Credit)</th>
                        <th className="py-2 text-right">Expected Cash</th>
                        <th className="py-2 text-right">Actual Handover</th>
                        <th className="py-2 text-right">Discrepancy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {fetchedEmployees.map((emp) => {
                        const expectedCash = emp.expectedTotal - emp.onlineAmount - emp.udhariAmount;
                        const disc = emp.actualCashGiven - expectedCash;
                        return (
                          <tr key={emp.deliveryBoyId} className="text-slate-700">
                            <td className="py-3 font-semibold">{emp.deliveryBoyName}</td>
                            <td className="py-3 text-right font-semibold text-purple-700">
                              {formatCurrency(emp.onlineAmount)}
                            </td>
                            <td className="py-3 text-right font-semibold text-amber-700">
                              {formatCurrency(emp.udhariAmount)}
                            </td>
                            <td className="py-3 text-right font-bold text-slate-600">{formatCurrency(expectedCash)}</td>
                            <td className="py-3 text-right font-black text-blue-700">
                              {formatCurrency(emp.actualCashGiven)}
                            </td>
                            <td className="py-3 text-right font-black">
                              {disc === 0 ? (
                                <span className="text-green-600">Balanced</span>
                              ) : disc < 0 ? (
                                <span className="text-rose-600">-{formatCurrency(Math.abs(disc))}</span>
                              ) : (
                                <span className="text-emerald-600">+{formatCurrency(disc)}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-slate-200 font-black text-slate-800">
                        <td className="py-3">Grand Total</td>
                        <td className="py-3 text-right text-purple-700">
                          {formatCurrency(fetchedEmployees.reduce((sum, e) => sum + e.onlineAmount, 0))}
                        </td>
                        <td className="py-3 text-right text-amber-700">
                          {formatCurrency(fetchedEmployees.reduce((sum, e) => sum + e.udhariAmount, 0))}
                        </td>
                        <td className="py-3 text-right">
                          {formatCurrency(
                            fetchedEmployees.reduce(
                              (sum, e) => sum + (e.expectedTotal - e.onlineAmount - e.udhariAmount),
                              0
                            )
                          )}
                        </td>
                        <td className="py-3 text-right text-blue-700">
                          {formatCurrency(fetchedEmployees.reduce((sum, e) => sum + e.actualCashGiven, 0))}
                        </td>
                        <td className="py-3 text-right">
                          {(() => {
                            const totExp = fetchedEmployees.reduce(
                              (sum, e) => sum + (e.expectedTotal - e.onlineAmount - e.udhariAmount),
                              0
                            );
                            const totAct = fetchedEmployees.reduce((sum, e) => sum + e.actualCashGiven, 0);
                            const diff = totAct - totExp;
                            return diff === 0 ? (
                              <span className="text-green-600">Balanced</span>
                            ) : diff < 0 ? (
                              <span className="text-rose-600">-{formatCurrency(Math.abs(diff))}</span>
                            ) : (
                              <span className="text-emerald-600">+{formatCurrency(diff)}</span>
                            );
                          })()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  General Closing Notes
                </label>
                <textarea
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  placeholder="Notes for the whole day, general cash drawer issues..."
                  rows={2}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-medium text-slate-600"
                />
              </div>

              <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                <input
                  type="checkbox"
                  id="admin-confirm-verified"
                  checked={cashVerified}
                  onChange={(e) => setCashVerified(e.target.checked)}
                  className="mt-0.5 w-4.5 h-4.5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="admin-confirm-verified" className="text-xs text-emerald-800 font-bold cursor-pointer select-none">
                  Cash Verified ✅
                  <span className="block font-medium text-[11px] text-emerald-700/80 mt-1">
                    I confirm that I have physically counted all notes/coins handed over by the delivery boys and checked all digital payments. I verify the shortage/excess figures are correct.
                  </span>
                </label>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                >
                  Back
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitClosing}
                    disabled={isPending || !cashVerified}
                    className="px-6 py-2.5 rounded-xl text-xs font-black text-white bg-green-600 hover:bg-green-700 transition disabled:opacity-50"
                  >
                    {isPending ? "Submitting..." : "Submit Daily Closing"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Details View / Edit Modal */}
      <Modal open={!!detailClosing} onClose={() => { setDetailClosing(null); setEditMode(false); }} title={`Closing Details: ${detailClosing ? formatDate(detailClosing.date) : ""}`} size="xl">
        {detailClosing && (
          <div className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs flex items-center gap-2 font-medium">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Aggregate Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Deliveries</p>
                <p className="text-lg font-black text-blue-700">{detailClosing.totalDeliveries} cylinders</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cash Collected</p>
                <p className="text-lg font-black text-green-700">{formatCurrency(detailClosing.cashOnHand)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Online Payments</p>
                <p className="text-lg font-black text-purple-700">{formatCurrency(detailClosing.totalOnlinePayment)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Udhari (Credit)</p>
                <p className="text-lg font-black text-amber-700">{formatCurrency(detailClosing.totalUdhari)}</p>
              </div>
            </div>

            {/* Verification status and notes */}
            <div className="flex items-center justify-between p-4 bg-blue-50/40 border border-blue-100/50 rounded-2xl">
              <div>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full">
                  <CheckSquare className="w-3.5 h-3.5" /> Cash Counts Verified
                </span>
                <p className="text-xs text-slate-500 mt-2">
                  Status: <StatusBadge status={detailClosing.status === "PENDING" && detailClosing.managerApprovedAt ? "MANAGER_APPROVED" : detailClosing.status} />
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Grand Expected Total</p>
                <p className="text-lg font-black text-slate-800">{formatCurrency(detailClosing.grandExpected)}</p>
              </div>
            </div>

            {/* Edit / View individual employee closings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Delivery Boys Breakdown</h4>
                {!editMode && detailClosing.status !== "APPROVED" && (
                  <button
                    onClick={() => handleStartEdit(detailClosing)}
                    className="flex items-center gap-1 text-xs text-blue-700 hover:text-blue-800 font-bold bg-blue-50 px-3 py-1.5 rounded-lg transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Closing Records
                  </button>
                )}
              </div>

              <div className="max-h-[40vh] overflow-y-auto pr-1">
                {editMode ? (
                  editableEmployees.map((emp, index) => (
                    <DailyClosingEmployeePanel
                      key={emp.deliveryBoyId}
                      employee={emp}
                      onChange={(updated) => handleEditableEmployeeChange(index, updated)}
                    />
                  ))
                ) : (
                  detailClosing.employeeClosings.map((emp) => (
                    <DailyClosingEmployeePanel
                      key={emp.id}
                      employee={{
                        deliveryBoyId: emp.deliveryBoy.id,
                        deliveryBoyName: emp.deliveryBoy.name,
                        cylinderBreakdown: emp.cylinderBreakdown,
                        totalDelivered: emp.totalDelivered,
                        pendingQty: emp.pendingQty,
                        returnedQty: emp.returnedQty,
                        udhariAmount: emp.udhariAmount,
                        cashCollected: emp.cashCollected,
                        onlineAmount: emp.onlineAmount,
                        kmBasedExtra: emp.kmBasedExtra,
                        expectedTotal: emp.expectedTotal,
                        actualCashGiven: emp.actualCashGiven,
                        notes: emp.notes || "",
                      }}
                      onChange={() => { }}
                      readOnly={true}
                    />
                  ))
                )}
              </div>
            </div>

            {detailClosing.notes && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs text-slate-600">
                <h5 className="font-bold text-slate-700 mb-1">General Notes</h5>
                <p>{detailClosing.notes}</p>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-800 font-bold bg-white border border-slate-200 px-4 py-2 rounded-xl transition"
              >
                <Printer className="w-4 h-4" /> Print Report
              </button>

              <div className="flex gap-3">
                {editMode ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditMode(false)}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                    >
                      Cancel Edit
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveChanges}
                      disabled={isPending}
                      className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-blue-700 hover:bg-blue-800 transition disabled:opacity-60"
                    >
                      {isPending ? "Saving..." : "Save Changes"}
                    </button>
                  </>
                ) : (
                  <>
                    {detailClosing.status === "PENDING" && (
                      <button
                        onClick={() => handleApprove(detailClosing.id)}
                        disabled={isPending}
                        className="flex items-center gap-1.5 text-xs bg-green-600 hover:bg-green-700 text-white font-bold px-5 py-2.5 rounded-xl transition disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Approve Closing
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setDetailClosing(null)}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                    >
                      Close
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
