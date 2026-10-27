"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatCurrency, formatDateTime } from "@/lib/utils";
import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Send,
  Clock,
  Receipt,
  ShieldCheck,
  User,
  Package,
  Banknote,
  AlertCircle,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { submitDeliveryBoyClosing } from "@/app/actions/daily-closing";
import { DailyClosingEmployeePanel } from "@/components/daily-closing/DailyClosingEmployeePanel";
import { CashDenominationCounter, CashDenominationItem } from "@/components/daily-closing/CashDenominationCounter";

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
  cashDenominations?: CashDenominationItem[] | null;
  shortageAmount: number;
  excessAmount: number;
  shortageAddedToUdhari?: boolean;
  submissionStatus?: string;
  submittedAt?: string | null;
  managerVerifiedAt?: string | null;
  adminConfirmedAt?: string | null;
  notes: string | null;
  cylinderBreakdown: any[];
}

interface TodayClosingData {
  date: string;
  totalDelivered: number;
  pendingQty: number;
  returnedQty: number;
  cashCollected: number;
  onlineAmount: number;
  udhariAmount: number;
  expectedTotal: number;
  expectedCash: number;
  products: Array<{
    productId: string;
    productName: string;
    soldQty: number;
    baseRate: number;
    kmRate: number;
    kmExtra: number;
    totalAmt: number;
  }>;
  existingClosing: {
    id: string;
    dailyClosingId: string;
    submissionStatus: string;
    actualCashGiven: number;
    cashDenominations?: CashDenominationItem[] | null;
    shortageAmount: number;
    excessAmount: number;
    notes: string | null;
    shortageAddedToUdhari: boolean;
    submittedAt: string | null;
    managerVerifiedAt: string | null;
    adminConfirmedAt: string | null;
    dailyClosingStatus: string;
  } | null;
  currentAdvanceBalance: number;
}

interface DeliveryBoyClosingClientProps {
  initialClosings: EmployeeClosing[];
  todayData: TodayClosingData;
  selectedDate: string;
}

export function DeliveryBoyClosingClient({
  initialClosings,
  todayData,
  selectedDate,
}: DeliveryBoyClosingClientProps) {
  const [closings] = useState(initialClosings);
  const [detailClosing, setDetailClosing] = useState<EmployeeClosing | null>(null);

  // Form input state
  const existing = todayData?.existingClosing;
  const initialCash =
    existing?.actualCashGiven !== undefined && existing.actualCashGiven > 0
      ? existing.actualCashGiven
      : todayData.expectedCash;

  const [actualCashGiven, setActualCashGiven] = useState<string>(
    initialCash > 0 ? String(initialCash) : ""
  );
  const [cashDenominations, setCashDenominations] = useState<CashDenominationItem[]>(
    (existing?.cashDenominations as CashDenominationItem[]) || []
  );
  const [returnedQty, setReturnedQty] = useState<string>(
    String(todayData.returnedQty || 0)
  );
  const [notes, setNotes] = useState<string>(existing?.notes || "");

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const cashNum = parseFloat(actualCashGiven) || 0;
  const shortage = todayData.expectedCash > cashNum ? todayData.expectedCash - cashNum : 0;
  const excess = cashNum > todayData.expectedCash ? cashNum - todayData.expectedCash : 0;

  const currentStatus = existing?.submissionStatus || "PENDING";
  const isLocked = currentStatus === "VERIFIED_BY_MANAGER" || currentStatus === "APPROVED";

  const changeDateBy = (days: number) => {
    const cur = new Date(selectedDate);
    cur.setDate(cur.getDate() + days);
    const nextDate = cur.toISOString().slice(0, 10);
    window.location.href = `?date=${nextDate}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (actualCashGiven === "" || cashNum < 0) {
      setErrorMsg("Please enter a valid actual cash amount.");
      return;
    }

    startTransition(async () => {
      const res = await submitDeliveryBoyClosing({
        date: selectedDate,
        actualCashGiven: cashNum,
        cashDenominations,
        returnedQty: parseInt(returnedQty, 10) || 0,
        notes: notes.trim(),
      });

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(
          shortage > 0
            ? `Daily closing submitted to Manager! Note: ₹${shortage.toFixed(0)} cash shortage was recorded and will be added to your Udhari upon Manager & Admin verification.`
            : "Daily closing submitted to Manager successfully! Awaiting cash count and verification."
        );
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* ── 3-Step Process Indicator Bar ── */}
      <div className="bg-white p-5 rounded-2xl border border-zinc-200/90 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-zinc-100 pb-4 mb-4">
          <div>
            <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-blue-600" />
              Daily Closing Workflow Status
            </h2>
            <p className="text-xs text-zinc-500">
              3-tier verification: Delivery Boy submission → Manager Cash Count → Admin Final Confirmation
            </p>
          </div>

          {/* Date Selector */}
          <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl p-1 shadow-2xs">
            <button
              onClick={() => changeDateBy(-1)}
              className="p-1.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 rounded-lg transition"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) {
                  window.location.href = `?date=${e.target.value}`;
                }
              }}
              className="bg-transparent border-none text-xs font-bold text-zinc-800 px-2 py-0.5 focus:outline-none"
            />
            <button
              onClick={() => changeDateBy(1)}
              className="p-1.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 rounded-lg transition"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stepper Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Step 1 */}
          <div
            className={`p-3.5 rounded-xl border flex items-center gap-3 transition ${
              currentStatus === "APPROVED" ||
              currentStatus === "VERIFIED_BY_MANAGER" ||
              currentStatus === "SUBMITTED_TO_MANAGER"
                ? "bg-blue-50/70 border-blue-200 text-blue-900"
                : "bg-amber-50/70 border-amber-200 text-amber-900"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                currentStatus !== "PENDING"
                  ? "bg-blue-600 text-white"
                  : "bg-amber-500 text-white"
              }`}
            >
              {currentStatus !== "PENDING" ? <CheckCircle2 className="w-4 h-4" /> : "1"}
            </div>
            <div className="text-xs">
              <span className="font-bold block">1. Delivery Boy Submission</span>
              <span className="text-[11px] text-zinc-500">
                {existing?.submittedAt
                  ? `Submitted ${formatDateTime(existing.submittedAt)}`
                  : "Fill form & hand over cash"}
              </span>
            </div>
          </div>

          {/* Step 2 */}
          <div
            className={`p-3.5 rounded-xl border flex items-center gap-3 transition ${
              currentStatus === "APPROVED" || currentStatus === "VERIFIED_BY_MANAGER"
                ? "bg-purple-50/70 border-purple-200 text-purple-900"
                : "bg-zinc-50 border-zinc-200 text-zinc-400"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                currentStatus === "APPROVED" || currentStatus === "VERIFIED_BY_MANAGER"
                  ? "bg-purple-600 text-white"
                  : "bg-zinc-200 text-zinc-600"
              }`}
            >
              {currentStatus === "APPROVED" || currentStatus === "VERIFIED_BY_MANAGER" ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                "2"
              )}
            </div>
            <div className="text-xs">
              <span className="font-bold block">2. Manager Cash Count</span>
              <span className="text-[11px] text-zinc-500">
                {existing?.managerVerifiedAt
                  ? `Verified ${formatDateTime(existing.managerVerifiedAt)}`
                  : currentStatus === "SUBMITTED_TO_MANAGER"
                  ? "Pending Manager Count"
                  : "Awaiting your submission"}
              </span>
            </div>
          </div>

          {/* Step 3 */}
          <div
            className={`p-3.5 rounded-xl border flex items-center gap-3 transition ${
              currentStatus === "APPROVED"
                ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                : "bg-zinc-50 border-zinc-200 text-zinc-400"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                currentStatus === "APPROVED"
                  ? "bg-emerald-600 text-white"
                  : "bg-zinc-200 text-zinc-600"
              }`}
            >
              {currentStatus === "APPROVED" ? <ShieldCheck className="w-4 h-4" /> : "3"}
            </div>
            <div className="text-xs">
              <span className="font-bold block">3. Admin Final Confirmation</span>
              <span className="text-[11px] text-zinc-500">
                {existing?.adminConfirmedAt
                  ? `Confirmed ${formatDateTime(existing.adminConfirmedAt)}`
                  : "Final approval & Udhari lock"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Today's Delivery Summary & Handover Form ── */}
      <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-zinc-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-zinc-50/60">
          <div>
            <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-600" />
              Closing for {formatDate(selectedDate)}
            </h3>
            <p className="text-xs text-zinc-500">
              Verify your deliveries, confirm online vs. customer udhari collections, and hand over cash to the manager.
            </p>
          </div>

          {/* Outstanding Udhari Pill */}
          <div className="px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-xl text-xs font-semibold text-purple-800 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-purple-600" />
            <span>Your Current Advance/Udhari Balance:</span>
            <span className="font-black text-purple-900 font-mono">
              {formatCurrency(todayData.currentAdvanceBalance)}
            </span>
          </div>
        </div>

        {/* Banners */}
        {errorMsg && (
          <div className="m-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="m-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            {successMsg}
          </div>
        )}

        {/* 4 Summary Cards */}
        <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4 border-b border-zinc-100">
          <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100">
            <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Cylinders Delivered</p>
            <p className="text-xl font-black text-blue-900 mt-1">{todayData.totalDelivered}</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Pending: <span className="font-bold text-zinc-700">{todayData.pendingQty}</span> | Empties:{" "}
              <span className="font-bold text-emerald-700">{todayData.returnedQty}</span>
            </p>
          </div>

          <div className="p-3.5 bg-purple-50/50 rounded-xl border border-purple-100">
            <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Online (UPI / QR)</p>
            <p className="text-xl font-black text-purple-900 mt-1">{formatCurrency(todayData.onlineAmount)}</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Received directly in agency account</p>
          </div>

          <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-100">
            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Customer Udhari (Credit)</p>
            <p className="text-xl font-black text-amber-900 mt-1">{formatCurrency(todayData.udhariAmount)}</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Customer balance booked to ledger</p>
          </div>

          <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200">
            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Expected Cash Handover</p>
            <p className="text-xl font-black text-emerald-800 mt-1 font-mono">{formatCurrency(todayData.expectedCash)}</p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Cash collected to hand to manager</p>
          </div>
        </div>

        {/* Cylinder Breakdown Table */}
        <div className="p-5 border-b border-zinc-100">
          <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">
            Cylinder Sales Breakdown for {formatDate(selectedDate)}
          </h4>
          <div className="overflow-x-auto rounded-xl border border-zinc-100">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500 font-bold uppercase text-[10px]">
                  <th className="px-4 py-2.5">Cylinder Type</th>
                  <th className="px-4 py-2.5 text-center">Qty Sold</th>
                  <th className="px-4 py-2.5 text-right">Rate</th>
                  <th className="px-4 py-2.5 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {todayData.products.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-zinc-400">
                      No deliveries recorded for this date
                    </td>
                  </tr>
                ) : (
                  todayData.products.map((p) => (
                    <tr key={`${p.productId}_${p.baseRate}`}>
                      <td className="px-4 py-2.5 font-semibold text-zinc-800">{p.productName}</td>
                      <td className="px-4 py-2.5 text-center font-bold text-blue-700">{p.soldQty}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-zinc-500">{formatCurrency(p.baseRate)}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-zinc-800">{formatCurrency(p.totalAmt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Closing Submission Form ── */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left: Cash input & shortage notice */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Actual Physical Cash Handed Over to Manager (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    disabled={isLocked || isPending}
                    value={actualCashGiven}
                    onChange={(e) => setActualCashGiven(e.target.value)}
                    placeholder="0"
                    className="w-full pl-8 pr-4 py-2.5 border-2 border-blue-300 rounded-xl text-base font-black text-blue-900 bg-blue-50/20 focus:outline-none focus:border-blue-600 disabled:bg-zinc-100 disabled:text-zinc-500 disabled:border-zinc-200"
                  />
                </div>
              </div>

              {/* Real-time Shortage / Balanced Notice */}
              {actualCashGiven !== "" && (
                <div>
                  {shortage > 0 ? (
                    <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-amber-800">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>Cash Shortage Detected: -{formatCurrency(shortage)}</span>
                      </div>
                      <p className="text-[11px] text-amber-700 leading-relaxed">
                        ⚠️ <strong>Important Note:</strong> Because your handed-over cash is short by{" "}
                        <strong>{formatCurrency(shortage)}</strong>, this amount will be added directly into your{" "}
                        <strong>Udhari (Advance account)</strong> upon Manager &amp; Admin verification.
                      </p>
                    </div>
                  ) : excess > 0 ? (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>
                        Excess Cash: +{formatCurrency(excess)} (Actual cash handed is greater than expected)
                      </span>
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-semibold">
                        Cash Perfectly Balanced! Exact amount {formatCurrency(cashNum)} collected.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Cash Denominations (Notes & Coins Count) */}
            <div className="md:col-span-2">
              <CashDenominationCounter
                initialDenominations={cashDenominations}
                readOnly={isLocked || isPending}
                defaultExpanded={true}
                onChange={(updatedDenoms, total) => {
                  setCashDenominations(updatedDenoms);
                  setActualCashGiven(total > 0 ? String(total) : "");
                }}
              />
            </div>

            {/* Right: Returned Empties & Notes */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Empty Cylinders Returned to Godown
                </label>
                <input
                  type="number"
                  min="0"
                  disabled={isLocked || isPending}
                  value={returnedQty}
                  onChange={(e) => setReturnedQty(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-zinc-200 rounded-xl text-sm font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Notes / Explanation for Manager
                </label>
                <textarea
                  disabled={isLocked || isPending}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reason for any shortage, pending payments from customer, etc."
                  rows={2}
                  className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl text-xs text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-zinc-100"
                />
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-zinc-100">
            <div className="text-xs text-zinc-500">
              {isLocked ? (
                <span className="inline-flex items-center gap-1.5 font-bold text-purple-700">
                  <ShieldCheck className="w-4 h-4" />
                  This daily closing has been verified by the Manager and is locked.
                </span>
              ) : currentStatus === "SUBMITTED_TO_MANAGER" ? (
                <span className="inline-flex items-center gap-1.5 font-bold text-blue-700">
                  <Clock className="w-4 h-4" />
                  Submitted to Manager. You can update your submission before the manager verifies it.
                </span>
              ) : (
                <span>Please ensure all cash collected is handed over to the manager before submitting.</span>
              )}
            </div>

            {!isLocked && (
              <button
                type="submit"
                disabled={isPending || todayData.products.length === 0}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                {isPending
                  ? "Submitting to Manager..."
                  : currentStatus === "SUBMITTED_TO_MANAGER"
                  ? "Update Closing Submission"
                  : "Submit Daily Closing to Manager"}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* ── Closing History Table ── */}
      <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-zinc-100">
          <h3 className="text-sm font-bold text-zinc-900">Your Past Daily Closing Records</h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Audit history of your daily submissions, cash reconciliations, and shortage bookings.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-zinc-50/80 border-b border-zinc-100 text-zinc-500 font-bold uppercase text-[11px] tracking-wider">
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5 text-center">Delivered</th>
                <th className="px-5 py-3.5 text-right">Online</th>
                <th className="px-5 py-3.5 text-right">Customer Udhari</th>
                <th className="px-5 py-3.5 text-right font-black text-blue-700">Cash Given</th>
                <th className="px-5 py-3.5 text-right">Shortage / Excess</th>
                <th className="px-5 py-3.5 text-center">Workflow Status</th>
                <th className="px-5 py-3.5 text-center">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-xs">
              {closings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-zinc-400">
                    <ClipboardCheck className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
                    No past closing records found
                  </td>
                </tr>
              ) : (
                closings.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-50/60 transition">
                    <td className="px-5 py-3.5 font-bold text-zinc-800">{formatDate(c.date)}</td>
                    <td className="px-5 py-3.5 text-center font-bold text-blue-700">{c.totalDelivered}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-purple-700">
                      {formatCurrency(c.onlineAmount)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-amber-700">
                      {formatCurrency(c.udhariAmount)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-black text-blue-700">
                      {formatCurrency(c.actualCashGiven)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold">
                      {c.shortageAmount > 0 ? (
                        <div>
                          <span className="text-rose-600 font-bold">-{formatCurrency(c.shortageAmount)}</span>
                          <span className="block text-[10px] text-amber-700 font-semibold">Added to Udhari</span>
                        </div>
                      ) : c.excessAmount > 0 ? (
                        <span className="text-emerald-600 font-bold">+{formatCurrency(c.excessAmount)}</span>
                      ) : (
                        <span className="text-zinc-400 font-medium">Balanced</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {c.status === "APPROVED" || c.submissionStatus === "APPROVED" ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          ✓ Confirmed by Admin
                        </span>
                      ) : c.submissionStatus === "VERIFIED_BY_MANAGER" || c.cashVerified ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                          Verified by Manager
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          Submitted to Manager
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => setDetailClosing(c)}
                        className="text-xs text-blue-700 hover:text-blue-800 font-bold bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition"
                      >
                        View Breakdown
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {detailClosing && (
        <Modal
          isOpen={!!detailClosing}
          onClose={() => setDetailClosing(null)}
          title={`Closing Details — ${formatDate(detailClosing.date)}`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-50 p-3.5 rounded-xl border border-zinc-200 text-xs">
              <div>
                <span className="text-zinc-400 block font-semibold">Delivered</span>
                <span className="font-bold text-zinc-800">{detailClosing.totalDelivered}</span>
              </div>
              <div>
                <span className="text-zinc-400 block font-semibold">Online Payment</span>
                <span className="font-bold text-purple-700">{formatCurrency(detailClosing.onlineAmount)}</span>
              </div>
              <div>
                <span className="text-zinc-400 block font-semibold">Customer Credit</span>
                <span className="font-bold text-amber-700">{formatCurrency(detailClosing.udhariAmount)}</span>
              </div>
              <div>
                <span className="text-zinc-400 block font-semibold">Actual Cash Handed</span>
                <span className="font-black text-blue-700">{formatCurrency(detailClosing.actualCashGiven)}</span>
              </div>
            </div>

            {detailClosing.shortageAmount > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Shortage of {formatCurrency(detailClosing.shortageAmount)}:</span>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    This cash shortage was recorded and added directly to your Udhari (Advance) account.
                  </p>
                </div>
              </div>
            )}

            <DailyClosingEmployeePanel
              employee={{
                deliveryBoyId: "",
                deliveryBoyName: "Your Delivery Breakdown",
                cylinderBreakdown: detailClosing.cylinderBreakdown || [],
                totalDelivered: detailClosing.totalDelivered,
                pendingQty: detailClosing.pendingQty,
                returnedQty: detailClosing.returnedQty,
                udhariAmount: detailClosing.udhariAmount,
                cashCollected: detailClosing.cashCollected,
                onlineAmount: detailClosing.onlineAmount,
                kmBasedExtra: detailClosing.kmBasedExtra,
                expectedTotal: detailClosing.expectedTotal,
                actualCashGiven: detailClosing.actualCashGiven,
                cashDenominations: detailClosing.cashDenominations || [],
                notes: detailClosing.notes || "",
                submissionStatus: detailClosing.submissionStatus,
                submittedAt: detailClosing.submittedAt,
                managerVerifiedAt: detailClosing.managerVerifiedAt,
                adminConfirmedAt: detailClosing.adminConfirmedAt,
              }}
              onChange={() => {}}
              readOnly={true}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
