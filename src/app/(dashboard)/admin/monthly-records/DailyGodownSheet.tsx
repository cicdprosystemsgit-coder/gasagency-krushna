"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Package,
  Truck,
  IndianRupee,
  Users,
  AlertTriangle,
  CheckCircle2,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { type DailyGodownSheetData } from "@/app/actions/monthly-records";

interface Props {
  data: DailyGodownSheetData;
  year: number;
  month: number;
  day: number;
  daysInMonth: number;
  onDayChange: (newDay: number) => void;
  isLoading?: boolean;
}

// ─── Helper: format Indian number ───────────────────────────────────────────
function inr(val: number) {
  return val.toLocaleString("en-IN");
}

// ─── Loading Skeleton ────────────────────────────────────────────────────────
function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700 ${className}`}
    />
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-700 dark:bg-slate-800">
      <SkeletonBlock className="mb-4 h-5 w-40" />
      <SkeletonBlock className="mb-2 h-4 w-full" />
      <SkeletonBlock className="mb-2 h-4 w-5/6" />
      <SkeletonBlock className="mb-2 h-4 w-4/6" />
      <SkeletonBlock className="h-4 w-3/6" />
    </div>
  );
}

// ─── Variance Badge ──────────────────────────────────────────────────────────
function VarianceBadge({ value }: { value: number }) {
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
        <CheckCircle2 size={11} /> ₹0
      </span>
    );
  }
  if (value < 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
        <ArrowDownRight size={11} /> ₹{inr(Math.abs(value))}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
      <ArrowUpRight size={11} /> ₹{inr(value)}
    </span>
  );
}

// ─── Diff Cell ───────────────────────────────────────────────────────────────
function DiffCell({ value }: { value: number }) {
  const cls =
    value === 0
      ? "text-emerald-600 dark:text-emerald-400"
      : value < 0
        ? "text-red-600 dark:text-red-400"
        : "text-orange-600 dark:text-orange-400";
  return <span className={`font-semibold ${cls}`}>{value}</span>;
}

// ─── Section Header ──────────────────────────────────────────────────────────
function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-2 dark:border-slate-700">
      <Icon size={16} className="text-blue-500" />
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {title}
      </h3>
    </div>
  );
}

// ─── Table helpers ───────────────────────────────────────────────────────────
const TH = ({
  children,
  right,
}: {
  children?: React.ReactNode;
  right?: boolean;
}) => (
  <th
    className={`whitespace-nowrap bg-slate-50 px-2 py-1.5 text-xs font-semibold text-slate-500 dark:bg-slate-700/50 dark:text-slate-400 ${right ? "text-right" : "text-left"}`}
  >
    {children}
  </th>
);

const TD = ({
  children,
  right,
  className = "",
}: {
  children?: React.ReactNode;
  right?: boolean;
  className?: string;
}) => (
  <td
    className={`px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 ${right ? "text-right" : "text-left"} ${className}`}
  >
    {children}
  </td>
);

const TFoot = ({
  children,
  right,
}: {
  children?: React.ReactNode;
  right?: boolean;
}) => (
  <td
    className={`bg-slate-50 px-2 py-1.5 text-xs font-bold text-slate-800 dark:bg-slate-700/50 dark:text-slate-100 ${right ? "text-right" : "text-left"}`}
  >
    {children}
  </td>
);

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════
export default function DailyGodownSheet({
  data,
  year,
  month,
  day,
  daysInMonth,
  onDayChange,
  isLoading = false,
}: Props) {
  // Month names for display
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // ── Section 1: Day Navigation ─────────────────────────────────────────────
  const DayNav = () => (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-700 dark:bg-slate-800">
      {/* Top row: arrows + date label */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onDayChange(day - 1)}
          disabled={day <= 1 || isLoading}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 print:hidden"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="text-center">
          {isLoading ? (
            <SkeletonBlock className="mx-auto h-5 w-40" />
          ) : (
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {data.dateStr || `${day} ${monthNames[month - 1]} ${year}`}
            </p>
          )}
        </div>

        <button
          onClick={() => onDayChange(day + 1)}
          disabled={day >= daysInMonth || isLoading}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 print:hidden"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 print:hidden">
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
          <button
            key={d}
            onClick={() => onDayChange(d)}
            disabled={isLoading}
            className={`flex h-7 min-w-[28px] flex-shrink-0 items-center justify-center rounded-md px-1.5 text-xs font-medium transition disabled:cursor-not-allowed ${
              d === day
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
            }`}
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  );

  // ── Section 2: KPI Row ────────────────────────────────────────────────────
  const KpiRow = () => {
    const kpis = [
      {
        label: "एकूण संकलन (Total Collection)",
        value: `₹${inr(data.totalDailyCollection)}`,
        icon: IndianRupee,
        color: "text-blue-600 dark:text-blue-400",
        bg: "bg-blue-50 dark:bg-blue-900/20",
      },
      {
        label: "एकूण डिलिव्हरी (Total Deliveries)",
        value: `${data.totalDailyDeliveries}`,
        icon: Truck,
        color: "text-indigo-600 dark:text-indigo-400",
        bg: "bg-indigo-50 dark:bg-indigo-900/20",
      },
      {
        label: "रोख शिल्लक (Cash in Safe)",
        value: `₹${inr(data.totalCountedCash)}`,
        icon: Package,
        color: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-emerald-50 dark:bg-emerald-900/20",
        extra: <VarianceBadge value={data.cashVariance} />,
      },
      {
        label: "गोडाऊन खर्च (Godown Expenses)",
        value: `₹${inr(data.totalGodownExpenses)}`,
        icon: AlertTriangle,
        color: "text-orange-600 dark:text-orange-400",
        bg: "bg-orange-50 dark:bg-orange-900/20",
      },
    ];

    if (isLoading) {
      return (
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-700 dark:bg-slate-800"
            >
              <SkeletonBlock className="mb-2 h-4 w-24" />
              <SkeletonBlock className="h-6 w-20" />
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-700 dark:bg-slate-800"
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {kpi.label}
              </p>
              <div className={`rounded-lg p-1.5 ${kpi.bg}`}>
                <kpi.icon size={14} className={kpi.color} />
              </div>
            </div>
            <p className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</p>
            {kpi.extra && <div className="mt-1">{kpi.extra}</div>}
          </div>
        ))}
      </div>
    );
  };

  // ── Card A: Cash Counter ──────────────────────────────────────────────────
  const CashCard = () => (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-700 dark:bg-slate-800">
      <SectionHeader
        icon={IndianRupee}
        title="गोडाऊन रोख, नोटा व चिल्लर (Cash Counter)"
      />

      {/* Denominations Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <TH>नोट (Denomination)</TH>
              <TH right>संख्या (Count)</TH>
              <TH right>रक्कम (Amount)</TH>
            </tr>
          </thead>
          <tbody>
            {data.cashDenominations.map((row, idx) => (
              <tr
                key={idx}
                className="border-b border-slate-100 dark:border-slate-700"
              >
                <TD>
                  ₹
                  {row.denomination === 0
                    ? "Coins"
                    : inr(row.denomination)}
                </TD>
                <TD right>{row.count}</TD>
                <TD right>₹{inr(row.total)}</TD>
              </tr>
            ))}
            {/* Total */}
            <tr className="border-t-2 border-slate-200 dark:border-slate-600">
              <TFoot>एकूण (Total)</TFoot>
              <TFoot right></TFoot>
              <TFoot right>₹{inr(data.totalCountedCash)}</TFoot>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Counter Sales */}
      <div className="mt-3 rounded-lg bg-slate-50 p-2 dark:bg-slate-700/40">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400">
            काउंटर विक्री (Counter Sales)
          </span>
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {data.counterSalesQty} × ₹{inr(data.counterSalesRate)} ={" "}
            <span className="text-blue-600 dark:text-blue-400">
              ₹{inr(data.counterSalesAmount)}
            </span>
          </span>
        </div>
        {/* Variance */}
        <div className="mt-1 flex justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400">
            तफावत (Cash Variance)
          </span>
          <VarianceBadge value={data.cashVariance} />
        </div>
      </div>

      {/* Payment Modes */}
      <div className="mt-3 flex flex-wrap gap-2">
        <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-700">
          <span className="text-slate-400">Paytm:</span>{" "}
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            ₹{inr(data.paytmAmount)}
          </span>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-700">
          <span className="text-slate-400">SAP:</span>{" "}
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            ₹{inr(data.sapAmount)}
          </span>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-700">
          <span className="text-slate-400">PhonePe:</span>{" "}
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            ₹{inr(data.phonepeAmount)}
          </span>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-700">
          <span className="text-slate-400">Cheque:</span>{" "}
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            ₹{inr(data.chequeAmount)}
          </span>
        </div>
        <div className="rounded-md border border-green-200 bg-green-50 px-2 py-1 text-xs dark:border-green-800 dark:bg-green-900/20">
          <span className="text-slate-400">उधारी मिळाली (Received):</span>{" "}
          <span className="font-semibold text-green-700 dark:text-green-400">
            ₹{inr(data.udhariReceived)}
          </span>
        </div>
        <div className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs dark:border-red-800 dark:bg-red-900/20">
          <span className="text-slate-400">उधारी दिली (Given):</span>{" "}
          <span className="font-semibold text-red-700 dark:text-red-400">
            ₹{inr(data.udhariGiven)}
          </span>
        </div>
      </div>
    </div>
  );

  // ── Card B: Godown Expenses ───────────────────────────────────────────────
  const ExpensesCard = () => (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-700 dark:bg-slate-800">
      <SectionHeader icon={AlertTriangle} title="गोडाऊन खर्च (Godown Expenses)" />

      {/* Expense rows */}
      {data.godownExpenses.length === 0 ? (
        <p className="py-3 text-center text-xs text-slate-400">No expenses recorded</p>
      ) : (
        <div className="mb-3 space-y-1">
          {data.godownExpenses.map((exp) => (
            <div
              key={exp.id}
              className="flex justify-between rounded-lg bg-slate-50 px-2 py-1.5 text-xs dark:bg-slate-700/40"
            >
              <span className="text-slate-600 dark:text-slate-300">
                {exp.description}
              </span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                ₹{inr(exp.amount)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Vehicle Gas Section */}
      {data.vehicleGasEntries.length > 0 && (
        <>
          <div className="mb-2 flex items-center gap-1">
            <Truck size={12} className="text-slate-400" />
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              वाहन गॅस (Vehicle Gas)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <TH>वाहन (Vehicle)</TH>
                  <TH right>Qty</TH>
                  <TH right>Rate</TH>
                  <TH right>Total</TH>
                </tr>
              </thead>
              <tbody>
                {data.vehicleGasEntries.map((v) => (
                  <tr
                    key={v.vehicleId}
                    className="border-b border-slate-100 dark:border-slate-700"
                  >
                    <TD>{v.vehicleNo}</TD>
                    <TD right>{v.qty}</TD>
                    <TD right>₹{inr(v.cylinderRate)}</TD>
                    <TD right>₹{inr(v.qty * v.cylinderRate)}</TD>
                  </tr>
                ))}
                <tr>
                  <TFoot>Vehicle Gas Total</TFoot>
                  <TFoot right></TFoot>
                  <TFoot right></TFoot>
                  <TFoot right>₹{inr(data.totalVehicleGas)}</TFoot>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Grand Total */}
      <div className="mt-3 flex justify-between rounded-lg bg-orange-50 px-3 py-2 dark:bg-orange-900/20">
        <span className="text-xs font-semibold text-orange-700 dark:text-orange-400">
          एकूण खर्च (Total Expenses)
        </span>
        <span className="text-sm font-bold text-orange-700 dark:text-orange-400">
          ₹{inr(data.totalGodownExpenses)}
        </span>
      </div>
    </div>
  );

  // ── Card C: Vehicle Dispatches ────────────────────────────────────────────
  const DispatchCard = () => (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-700 dark:bg-slate-800">
      <SectionHeader icon={Truck} title="मालाचा तपशील (Vehicle Dispatches)" />

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <TH>Vehicle No</TH>
              <TH>Driver</TH>
              <TH right>14.2 Full</TH>
              <TH right>14.2 Empty</TH>
              <TH right>19 Full</TH>
              <TH right>19 Empty</TH>
              <TH right>Total</TH>
            </tr>
          </thead>
          <tbody>
            {data.vehicleDispatches.map((v) => (
              <tr
                key={v.vehicleId}
                className="border-b border-slate-100 dark:border-slate-700"
              >
                <TD className="font-medium">{v.vehicleNo}</TD>
                <TD>{v.driverName}</TD>
                <TD right>{v.cylinder14Full}</TD>
                <TD right>{v.cylinder14Empty}</TD>
                <TD right>{v.cylinder19Full}</TD>
                <TD right>{v.cylinder19Empty}</TD>
                <TD right className="font-semibold">
                  {v.totalLoaded}
                </TD>
              </tr>
            ))}
            {data.vehicleDispatches.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="py-4 text-center text-xs text-slate-400"
                >
                  No dispatches recorded
                </td>
              </tr>
            )}
            {data.vehicleDispatches.length > 0 && (
              <tr className="border-t-2 border-slate-200 dark:border-slate-600">
                <TFoot>एकूण (Total)</TFoot>
                <TFoot right></TFoot>
                <TFoot right>{data.totalDispatched14Full}</TFoot>
                <TFoot right>{data.totalDispatched14Empty}</TFoot>
                <TFoot right>{data.totalDispatched19Full}</TFoot>
                <TFoot right>{data.totalDispatched19Empty}</TFoot>
                <TFoot right>{data.totalDailyDeliveries}</TFoot>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Plant Loads */}
      {data.plantLoadsToday.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 flex items-center gap-1">
            <Layers size={12} className="text-blue-500" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              आजचे प्लांट लोड (Plant Loads Today)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <TH>ERV No</TH>
                  <TH>Vehicle</TH>
                  <TH right>14 Full ↓</TH>
                  <TH right>14 Empty ↑</TH>
                  <TH right>19 Full ↓</TH>
                  <TH right>19 Empty ↑</TH>
                </tr>
              </thead>
              <tbody>
                {data.plantLoadsToday.map((pl, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-slate-100 dark:border-slate-700"
                  >
                    <TD>{pl.ervNo ?? "—"}</TD>
                    <TD>{pl.vehicleNo}</TD>
                    <TD right>{pl.full14Received}</TD>
                    <TD right>{pl.empty14Returned}</TD>
                    <TD right>{pl.full19Received}</TD>
                    <TD right>{pl.empty19Returned}</TD>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  // ── Card D: Daily Stock Movement ──────────────────────────────────────────
  const StockMovementCard = () => (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-700 dark:bg-slate-800">
      <SectionHeader icon={Layers} title="स्टॉक हालचाल (Daily Stock Movement)" />

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <TH>Product</TH>
              <TH right>Open Full</TH>
              <TH right>Open Empty</TH>
              <TH right>Load Full</TH>
              <TH right>Load Empty</TH>
              <TH right>Disp Full</TH>
              <TH right>Disp Empty</TH>
              <TH right>Close Full</TH>
              <TH right>Close Empty</TH>
            </tr>
          </thead>
          <tbody>
            {data.stockMovements.map((row, idx) => (
              <tr
                key={idx}
                className="border-b border-slate-100 dark:border-slate-700"
              >
                <TD className="font-medium">{row.productName}</TD>
                <TD right>{row.openingFull}</TD>
                <TD right>{row.openingEmpty}</TD>
                <TD right>{row.loadFull}</TD>
                <TD right>{row.loadEmpty}</TD>
                <TD right>{row.dispatchedFull}</TD>
                <TD right>{row.dispatchedEmpty}</TD>
                <TD right className="font-semibold text-blue-600 dark:text-blue-400">
                  {row.closingFull}
                </TD>
                <TD right className="font-semibold text-slate-700 dark:text-slate-200">
                  {row.closingEmpty}
                </TD>
              </tr>
            ))}
            {data.stockMovements.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="py-4 text-center text-xs text-slate-400"
                >
                  No stock movement data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ── Card E: Physical vs Computer Stock ────────────────────────────────────
  const PhysicalStockCard = () => (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-700 dark:bg-slate-800">
      <SectionHeader
        icon={CheckCircle2}
        title="प्रत्यक्ष vs सिस्टम शिल्लक (Physical vs Computer Stock)"
      />

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <TH>Product</TH>
              <TH right>Phys Full</TH>
              <TH right>Phys Empty</TH>
              <TH right>Comp Full</TH>
              <TH right>Comp Empty</TH>
              <TH right>Diff Full</TH>
              <TH right>Diff Empty</TH>
            </tr>
          </thead>
          <tbody>
            {data.physicalStockAudit.map((row, idx) => (
              <tr
                key={idx}
                className="border-b border-slate-100 dark:border-slate-700"
              >
                <TD className="font-medium">{row.productName}</TD>
                <TD right>{row.physicalFull}</TD>
                <TD right>{row.physicalEmpty}</TD>
                <TD right>{row.computerFull}</TD>
                <TD right>{row.computerEmpty}</TD>
                <TD right>
                  <DiffCell value={row.diffFull} />
                </TD>
                <TD right>
                  <DiffCell value={row.diffEmpty} />
                </TD>
              </tr>
            ))}
            {data.physicalStockAudit.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="py-4 text-center text-xs text-slate-400"
                >
                  No physical audit data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Match (0)
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-500" /> Short (-)
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-orange-500" /> Excess (+)
        </span>
      </div>
    </div>
  );

  // ── Card F: Driver Empty Cylinder Dues ────────────────────────────────────
  const DriverDuesCard = () => (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-700 dark:bg-slate-800">
      <SectionHeader
        icon={Users}
        title="खाली सिलेंडर जमा व बाकी (Driver Empty Cylinder Dues)"
      />

      {data.driverEmptyDues.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-400">
          No driver data for this day
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <TH>Driver Name</TH>
                <TH right>14.2 जमा (Returned)</TH>
                <TH right>14.2 बाकी (Due)</TH>
                <TH right>19 जमा (Returned)</TH>
                <TH right>19 बाकी (Due)</TH>
                <TH right>Pending Cust.</TH>
              </tr>
            </thead>
            <tbody>
              {data.driverEmptyDues.map((row) => {
                const hasDue = row.cylinder14Due > 0 || row.cylinder19Due > 0;
                return (
                  <tr
                    key={row.driverId}
                    className={`border-b border-slate-100 dark:border-slate-700 ${
                      hasDue
                        ? "bg-yellow-50 dark:bg-yellow-900/10"
                        : ""
                    }`}
                  >
                    <TD className={hasDue ? "font-semibold" : ""}>
                      {row.driverName}
                      {hasDue && (
                        <AlertTriangle
                          size={10}
                          className="ml-1 inline text-yellow-500"
                        />
                      )}
                    </TD>
                    <TD right>{row.cylinder14Returned}</TD>
                    <TD
                      right
                      className={
                        row.cylinder14Due > 0
                          ? "font-semibold text-red-600 dark:text-red-400"
                          : ""
                      }
                    >
                      {row.cylinder14Due}
                    </TD>
                    <TD right>{row.cylinder19Returned}</TD>
                    <TD
                      right
                      className={
                        row.cylinder19Due > 0
                          ? "font-semibold text-red-600 dark:text-red-400"
                          : ""
                      }
                    >
                      {row.cylinder19Due}
                    </TD>
                    <TD right>{row.pendingCustomerCount}</TD>
                  </tr>
                );
              })}
              {/* Totals */}
              <tr className="border-t-2 border-slate-200 dark:border-slate-600">
                <TFoot>एकूण (Total)</TFoot>
                <TFoot right></TFoot>
                <TFoot right>{data.totalDue14}</TFoot>
                <TFoot right></TFoot>
                <TFoot right>{data.totalDue19}</TFoot>
                <TFoot right></TFoot>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Day Navigation */}
      <DayNav />

      {/* KPI Row */}
      <KpiRow />

      {isLoading ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <CardSkeleton />
            <CardSkeleton />
          </div>
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </>
      ) : (
        <>
          {/* Main 2-col grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Left column */}
            <div className="flex flex-col gap-4">
              <CashCard />
              <ExpensesCard />
            </div>
            {/* Right column */}
            <div className="flex flex-col gap-4">
              <DispatchCard />
            </div>
          </div>

          {/* Full-width bottom cards */}
          <StockMovementCard />
          <PhysicalStockCard />
          <DriverDuesCard />
        </>
      )}
    </div>
  );
}
