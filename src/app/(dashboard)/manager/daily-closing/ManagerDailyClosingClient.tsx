"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Plus, ClipboardCheck, CheckCircle2, ChevronDown, ChevronRight, CheckSquare, Calendar, AlertTriangle, Printer, User, Edit2 } from "lucide-react";
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

interface ManagerDailyClosingClientProps {
  initialClosings: Closing[];
  role: string;
}

export function ManagerDailyClosingClient({ initialClosings, role }: ManagerDailyClosingClientProps) {
  const [closings, setClosings] = useState(initialClosings);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailClosing, setDetailClosing] = useState<Closing | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editableEmployees, setEditableEmployees] = useState<EmployeeClosingData[]>([]);

  // Wizard state
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [fetchedEmployees, setFetchedEmployees] = useState<(EmployeeClosingData & { alreadyClosed?: boolean })[]>([]);
  const [selectedBoyId, setSelectedBoyId] = useState<string | null>(null);
  const [generalNotes, setGeneralNotes] = useState("");
  const [cashVerified, setCashVerified] = useState(false);
  const [hasSavedAny, setHasSavedAny] = useState(false);

  const filteredClosings = closings.filter((c) => {
    const cDate = new Date(c.date);
    cDate.setHours(0, 0, 0, 0);
    if (dateFrom && cDate < new Date(dateFrom)) return false;
    if (dateTo && cDate > new Date(dateTo)) return false;
    return true;
  });

  const handleOpenModal = () => {
    setError("");
    setStep(1);
    setFetchedEmployees([]);
    setSelectedBoyId(null);
    setCashVerified(false);
    setGeneralNotes("");
    setHasSavedAny(false);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    if (hasSavedAny) {
      window.location.reload();
    }
  };

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
        alreadyClosed: db.alreadyClosed,
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
    const activeBoy = fetchedEmployees.find((e) => e.deliveryBoyId === selectedBoyId);
    if (!activeBoy) {
      setError("No active delivery boy selected.");
      return;
    }

    const payload = {
      date: selectedDate,
      notes: generalNotes,
      employeeClosings: [activeBoy],
      cashVerified: true,
    };

    startTransition(async () => {
      const res = await createDailyClosingWithEmployees(JSON.stringify(payload));
      if (res.error) {
        setError(res.error);
        return;
      }

      setHasSavedAny(true);

      // Re-fetch to update statuses
      const fetchRes = await getDeliveryBoysForDate(selectedDate);
      if (!fetchRes.error && fetchRes.deliveryBoys) {
        const formatted = fetchRes.deliveryBoys.map((db: any) => ({
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
          alreadyClosed: db.alreadyClosed,
        }));
        setFetchedEmployees(formatted);
      }

      // Reset step 3 state
      setCashVerified(false);
      setGeneralNotes("");
      setSelectedBoyId(null);
      setStep(2);
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
      cylinderBreakdown: ec.cylinderBreakdown as any,
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
          onClick={handleOpenModal}
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

      {/* Record Daily Closing Wizard Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Record Daily Closing" size="xl" style={{ minHeight: "680px" }}>
        <div className="space-y-6">
          {/* Step Indicator */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            {[
              { num: 1, label: "Select Date" },
              { num: 2, label: "Adjust Boy Records" },
              { num: 3, label: "Verify Physical Cash" },
            ].map((s) => (
              <div key={s.num} className="flex items-center gap-2">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === s.num
                    ? "bg-blue-700 text-white"
                    : step > s.num
                      ? "bg-green-600 text-white"
                      : "bg-slate-100 text-slate-400"
                    }`}
                >
                  {s.num}
                </span>
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

          {/* STEP 1: Select Date */}
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

          {/* STEP 2: Adjust Boy Records */}
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

              {selectedBoyId === null ? (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/80 text-xs font-semibold text-slate-500">
                    Select a delivery boy below to verify and reconcile their individual records:
                  </div>
                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                    {fetchedEmployees.map((emp, index) => (
                      <div key={emp.deliveryBoyId} className="flex items-center justify-between p-4 hover:bg-slate-50/30 transition">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-800">{emp.deliveryBoyName}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                              Delivered: {emp.totalDelivered} cylinders | Udhari: {formatCurrency(emp.udhariAmount)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {emp.alreadyClosed ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                              Reconciled ✅
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full">
                              Pending Closing ⏳
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedBoyId(emp.deliveryBoyId)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${emp.alreadyClosed
                              ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                              : "bg-blue-700 hover:bg-blue-800 text-white shadow-sm"
                              }`}
                          >
                            {emp.alreadyClosed ? "Edit Closing" : "Reconcile"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                    >
                      Close Wizard
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {(() => {
                    const empIndex = fetchedEmployees.findIndex(e => e.deliveryBoyId === selectedBoyId);
                    const emp = fetchedEmployees[empIndex];
                    if (!emp) return null;
                    return (
                      <>
                        <div className="flex justify-between items-center bg-blue-50/50 px-4 py-2.5 rounded-xl border border-blue-100">
                          <p className="text-xs text-blue-700 font-semibold">
                            Reconciling: <span className="font-bold">{emp.deliveryBoyName}</span> for {formatDate(selectedDate)}
                          </p>
                          <button
                            type="button"
                            onClick={() => setSelectedBoyId(null)}
                            className="text-xs text-slate-600 hover:text-slate-800 font-bold bg-white border border-slate-200 px-3 py-1.5 rounded-lg transition"
                          >
                            Back to List
                          </button>
                        </div>

                        <div className="max-h-[50vh] overflow-y-auto pr-1">
                          <DailyClosingEmployeePanel
                            employee={emp}
                            onChange={(updated) => handleEmployeeChange(empIndex, updated)}
                          />
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setSelectedBoyId(null)}
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
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Verify Physical Cash */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {(() => {
                const emp = fetchedEmployees.find(e => e.deliveryBoyId === selectedBoyId);
                if (!emp) return null;
                const expectedCash = emp.expectedTotal - emp.onlineAmount - emp.udhariAmount;
                const disc = emp.actualCashGiven - expectedCash;
                return (
                  <>
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                        Reconciliation Summary for {emp.deliveryBoyName}
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs font-medium text-slate-600">
                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Online Payments (UPI)</p>
                          <p className="text-sm font-black text-purple-700 mt-1">{formatCurrency(emp.onlineAmount)}</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Udhari (Credit)</p>
                          <p className="text-sm font-black text-amber-700 mt-1">{formatCurrency(emp.udhariAmount)}</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Expected Cash</p>
                          <p className="text-sm font-black text-slate-800 mt-1">{formatCurrency(expectedCash)}</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Actual Cash Handover</p>
                          <p className="text-sm font-black text-blue-700 mt-1">{formatCurrency(emp.actualCashGiven)}</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-100 col-span-1 md:col-span-2">
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Discrepancy</p>
                          <p className="text-sm font-black mt-1 font-bold">
                            {disc === 0 ? (
                              <span className="text-green-600">Balanced</span>
                            ) : disc < 0 ? (
                              <span className="text-rose-600">Shortage of -{formatCurrency(Math.abs(disc))}</span>
                            ) : (
                              <span className="text-emerald-600">Excess of +{formatCurrency(disc)}</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Closing Notes for {emp.deliveryBoyName}
                      </label>
                      <textarea
                        value={generalNotes}
                        onChange={(e) => setGeneralNotes(e.target.value)}
                        placeholder="Explain any shortages, excess, or other reconciliation issues..."
                        rows={2}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-medium text-slate-600"
                      />
                    </div>

                    {/* Physical Cash Verification Checkbox */}
                    <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                      <input
                        type="checkbox"
                        id="confirm-verified"
                        checked={cashVerified}
                        onChange={(e) => setCashVerified(e.target.checked)}
                        className="mt-0.5 w-4.5 h-4.5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                      />
                      <label htmlFor="confirm-verified" className="text-xs text-emerald-800 font-bold cursor-pointer select-none">
                        Cash Verified ✅
                        <span className="block font-medium text-[11px] text-emerald-700/80 mt-1">
                          I confirm that I have physically counted all notes/coins handed over by {emp.deliveryBoyName} and verified all payments.
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
                          onClick={() => setSelectedBoyId(null)}
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
                          {isPending ? "Submitting..." : `Submit Closing for ${emp.deliveryBoyName}`}
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </Modal>

      {/* Details view modal */}
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
              <div className="text-right flex items-center gap-4">
                {!editMode && detailClosing.status !== "APPROVED" && (
                  <button
                    onClick={() => handleStartEdit(detailClosing)}
                    className="flex items-center gap-1.5 text-xs text-blue-700 hover:text-blue-800 font-bold bg-blue-50 px-3 py-1.5 rounded-lg transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Closing Records
                  </button>
                )}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Grand Expected Total</p>
                  <p className="text-lg font-black text-slate-800">{formatCurrency(detailClosing.grandExpected)}</p>
                </div>
              </div>
            </div>

            {/* Individual Employee Rows */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {editMode ? "Edit Delivery Boys Records" : "Delivery Boys Breakdown"}
              </h4>
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
                        cylinderBreakdown: emp.cylinderBreakdown as any,
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
                      className="px-6 py-2.5 rounded-xl text-xs font-black text-white bg-blue-700 hover:bg-blue-800 transition disabled:opacity-50"
                    >
                      {isPending ? "Saving..." : "Save Changes"}
                    </button>
                  </>
                ) : (
                  <>
                    {detailClosing.status === "PENDING" && !detailClosing.managerApprovedAt && (
                      <button
                        onClick={() => handleApprove(detailClosing.id)}
                        disabled={isPending}
                        className="flex items-center gap-1.5 text-xs bg-green-600 hover:bg-green-700 text-white font-bold px-5 py-2.5 rounded-xl transition disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Submit for Admin Approval
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => { setDetailClosing(null); setEditMode(false); }}
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
