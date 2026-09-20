"use client";

import { useState, useMemo } from "react";
import { format, parseISO, isSameMonth } from "date-fns";
import {
  BarChart3, Calendar, Download, Eye, Truck, Fuel,
  CheckCircle2, Clock, XCircle, ChevronLeft, ChevronRight,
  Package, FileSpreadsheet
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import type { SerializedDeliveryCountRequest } from "../delivery-count/DeliveryCountClient";

interface MonthlyReportClientProps {
  initialRequests: SerializedDeliveryCountRequest[];
}

export function MonthlyReportClient({ initialRequests }: MonthlyReportClientProps) {
  // Current month/year filter state
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth()); // 0-indexed

  // Details Modal
  const [selectedRequest, setSelectedRequest] = useState<SerializedDeliveryCountRequest | null>(null);

  // Filter requests for the selected month and year
  const monthlyRequests = useMemo(() => {
    return initialRequests.filter((req) => {
      const d = parseISO(req.date);
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    });
  }, [initialRequests, selectedYear, selectedMonth]);

  // Aggregate monthly totals
  const totals = useMemo(() => {
    let totalRequested = 0;
    let totalLoaded = 0;
    let totalFuelLitres = 0;
    let totalFuelAmount = 0;
    let pendingCount = 0;
    let approvedCount = 0;
    let fulfilledCount = 0;
    let rejectedCount = 0;

    monthlyRequests.forEach((req) => {
      totalRequested += req.totalRequested || 0;
      totalLoaded += req.totalLoaded || 0;
      totalFuelLitres += req.fuelLitres || 0;
      totalFuelAmount += req.fuelAmount || 0;

      if (req.status === "PENDING") pendingCount++;
      if (req.status === "APPROVED") approvedCount++;
      if (req.status === "FULFILLED") fulfilledCount++;
      if (req.status === "REJECTED") rejectedCount++;
    });

    return {
      count: monthlyRequests.length,
      totalRequested,
      totalLoaded,
      totalFuelLitres,
      totalFuelAmount,
      pendingCount,
      approvedCount,
      fulfilledCount,
      rejectedCount,
    };
  }, [monthlyRequests]);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  // CSV Export
  const exportToCSV = () => {
    const headers = [
      "Date",
      "Requested Products",
      "Total Requested",
      "Status",
      "Total Loaded",
      "Fuel (L)",
      "Fuel Amount (Rs)",
      "Reviewed By",
      "Fulfilled By",
    ];

    const rows = monthlyRequests.map((r) => [
      format(parseISO(r.date), "yyyy-MM-dd"),
      r.items.map((it) => `${it.productName}: ${it.requestedQty}`).join(" | "),
      r.totalRequested,
      r.status,
      r.totalLoaded ?? "",
      r.fuelLitres ?? "",
      r.fuelAmount ?? "",
      r.reviewedBy ?? "",
      r.fulfilledBy ?? "",
    ]);

    // Summary row
    rows.push([
      "TOTAL",
      "",
      totals.totalRequested.toString(),
      `${totals.fulfilledCount} Fulfilled / ${totals.count} Requests`,
      totals.totalLoaded.toString(),
      totals.totalFuelLitres.toString(),
      totals.totalFuelAmount.toString(),
      "",
      "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const monthName = format(new Date(selectedYear, selectedMonth), "MMMM_yyyy");
    link.setAttribute("download", `Monthly_Delivery_Report_${monthName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const monthLabel = format(new Date(selectedYear, selectedMonth), "MMMM yyyy");

  return (
    <div className="space-y-6">
      {/* Month Selector Bar */}
      <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition border border-zinc-200"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-bold text-zinc-800">{monthLabel}</span>
          </div>

          <button
            onClick={handleNextMonth}
            className="p-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition border border-zinc-200"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={exportToCSV}
          disabled={monthlyRequests.length === 0}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-zinc-700 bg-white hover:bg-zinc-50 border border-zinc-300 rounded-xl transition shadow-xs disabled:opacity-40"
        >
          <Download className="w-4 h-4 text-zinc-500" />
          Export CSV Report
        </button>
      </div>

      {/* Monthly KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-sm">
          <span className="text-xs font-medium text-zinc-500">Monthly Load Requests</span>
          <div className="text-2xl font-bold text-zinc-900 mt-1">{totals.count}</div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 mt-2">
            <span className="text-emerald-600 font-semibold">{totals.fulfilledCount} fulfilled</span>
            <span>•</span>
            <span className="text-amber-600 font-semibold">{totals.pendingCount} pending</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-sm">
          <span className="text-xs font-medium text-zinc-500">Total Cylinders Requested</span>
          <div className="text-2xl font-bold text-blue-600 mt-1">{totals.totalRequested}</div>
          <span className="text-xs text-zinc-400 mt-2 block">All submissions combined</span>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-sm">
          <span className="text-xs font-medium text-zinc-500">Total Cylinders Loaded</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{totals.totalLoaded}</div>
          <span className="text-xs text-zinc-400 mt-2 block">Physically filled by Godown</span>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-sm">
          <span className="text-xs font-medium text-zinc-500">Total Vehicle Fuel</span>
          <div className="text-2xl font-bold text-purple-600 mt-1">{totals.totalFuelLitres} L</div>
          <span className="text-xs text-zinc-500 mt-2 block font-medium">
            Total Cost: ₹{totals.totalFuelAmount.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Monthly Requests Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-200 bg-zinc-50/60 flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-800 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            Monthly Delivery Breakdown ({monthLabel})
          </h3>
          <span className="text-xs font-medium text-zinc-500">
            {monthlyRequests.length} day{monthlyRequests.length !== 1 ? "s" : ""} recorded
          </span>
        </div>

        {monthlyRequests.length === 0 ? (
          <div className="py-16 text-center text-zinc-500">
            <Package className="w-10 h-10 mx-auto text-zinc-300 mb-3" />
            <p className="text-sm font-medium text-zinc-700">No delivery requests for {monthLabel}</p>
            <p className="text-xs text-zinc-400 mt-1">Select another month or submit a new request.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/80 text-zinc-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Requested Products</th>
                  <th className="py-3 px-4 text-right">Req. Qty</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Loaded Qty</th>
                  <th className="py-3 px-4">Vehicle Fuel</th>
                  <th className="py-3 px-4">Fulfillment / Review</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 text-zinc-700">
                {monthlyRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-zinc-50/80 transition">
                    <td className="py-3.5 px-4 font-semibold text-zinc-900 whitespace-nowrap">
                      {format(parseISO(req.date), "dd MMM yyyy")}
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="flex flex-wrap gap-1">
                        {req.items.map((it, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 text-zinc-800 border border-zinc-200"
                          >
                            {it.productName}: {it.requestedQty}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold text-zinc-900">
                      {req.totalRequested} cyl
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {req.status === "PENDING" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3" /> Pending
                        </span>
                      )}
                      {req.status === "APPROVED" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          <CheckCircle2 className="w-3 h-3" /> Approved
                        </span>
                      )}
                      {req.status === "FULFILLED" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Truck className="w-3 h-3" /> Fulfilled
                        </span>
                      )}
                      {req.status === "REJECTED" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="w-3 h-3" /> Rejected
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold whitespace-nowrap">
                      {req.totalLoaded != null ? (
                        <span className="text-emerald-700">{req.totalLoaded} cyl</span>
                      ) : (
                        <span className="text-zinc-400 font-normal">-</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-zinc-600">
                      {req.fuelLitres != null ? (
                        <div className="flex items-center gap-1">
                          <Fuel className="w-3.5 h-3.5 text-purple-600" />
                          <span>
                            {req.fuelLitres}L {req.fuelAmount ? `(₹${req.fuelAmount})` : ""}
                          </span>
                        </div>
                      ) : (
                        <span className="text-zinc-400">-</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-xs text-zinc-500 whitespace-nowrap">
                      {req.fulfilledBy ? (
                        <div>
                          Loaded by: <strong className="text-zinc-700">{req.fulfilledBy}</strong>
                        </div>
                      ) : req.reviewedBy ? (
                        <div>
                          Approved by: <strong className="text-zinc-700">{req.reviewedBy}</strong>
                        </div>
                      ) : (
                        <span className="text-zinc-400">Awaiting review</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedRequest(req)}
                        className="p-1 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded transition"
                        title="View Full Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* MONTHLY GRAND TOTALS FOOTER ROW */}
              <tfoot>
                <tr className="border-t-2 border-zinc-300 bg-blue-50/60 font-bold text-zinc-900 text-xs">
                  <td className="py-4 px-4 uppercase tracking-wider text-blue-900">
                    Monthly Total
                  </td>
                  <td className="py-4 px-4 text-zinc-600 font-medium">
                    {totals.count} Requests ({totals.fulfilledCount} Fulfilled)
                  </td>
                  <td className="py-4 px-4 text-right text-blue-700 text-sm">
                    {totals.totalRequested} cyl
                  </td>
                  <td className="py-4 px-4 text-center text-zinc-600">
                    -
                  </td>
                  <td className="py-4 px-4 text-right text-emerald-700 text-sm">
                    {totals.totalLoaded} cyl
                  </td>
                  <td className="py-4 px-4 text-purple-700">
                    {totals.totalFuelLitres} L (₹{totals.totalFuelAmount.toFixed(0)})
                  </td>
                  <td className="py-4 px-4 text-zinc-500 text-[11px]" colSpan={2}>
                    Aggregated across {monthLabel}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedRequest && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedRequest(null)}
          title="Delivery Load Request Details"
        >
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <div>
                <span className="text-xs text-zinc-500">Delivery Date</span>
                <p className="font-semibold text-zinc-900">
                  {format(parseISO(selectedRequest.date), "EEEE, dd MMMM yyyy")}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-800">
                {selectedRequest.status}
              </span>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                Requested Products ({selectedRequest.totalRequested} Total)
              </h4>
              <div className="border border-zinc-200 rounded-lg divide-y divide-zinc-200">
                {selectedRequest.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-center px-3 py-2 text-xs">
                    <span className="font-medium text-zinc-800">{it.productName}</span>
                    <span className="font-bold text-zinc-900">{it.requestedQty} cyl</span>
                  </div>
                ))}
              </div>
              {selectedRequest.notes && (
                <p className="text-xs text-zinc-500 mt-2 bg-zinc-50 p-2 rounded border border-zinc-200">
                  <strong>Notes:</strong> {selectedRequest.notes}
                </p>
              )}
            </div>

            {selectedRequest.reviewedBy && (
              <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200 text-xs space-y-1">
                <span className="font-semibold uppercase text-zinc-500">Reviewer Information</span>
                <p>
                  Reviewed by: <strong>{selectedRequest.reviewedBy}</strong>
                  {selectedRequest.reviewedAt ? ` on ${format(parseISO(selectedRequest.reviewedAt), "dd MMM yyyy, hh:mm a")}` : ""}
                </p>
                {selectedRequest.reviewNote && (
                  <p className="italic text-zinc-600">Note: {selectedRequest.reviewNote}</p>
                )}
              </div>
            )}

            {selectedRequest.status === "FULFILLED" && (
              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 space-y-2 text-xs">
                <div className="flex justify-between items-center font-semibold text-emerald-800">
                  <span>Godown Loading Summary</span>
                  <span>{selectedRequest.totalLoaded} cylinders loaded</span>
                </div>

                {selectedRequest.fulfilledItems && (
                  <div className="bg-white rounded border border-emerald-200 divide-y divide-emerald-200">
                    {selectedRequest.fulfilledItems.map((fit, idx) => (
                      <div key={idx} className="flex justify-between px-2.5 py-1.5">
                        <span>{fit.productName}</span>
                        <strong className="text-emerald-700">{fit.loadedQty} loaded</strong>
                      </div>
                    ))}
                  </div>
                )}

                {selectedRequest.fuelLitres != null && (
                  <p className="text-emerald-900">
                    Fuel Loaded: <strong>{selectedRequest.fuelLitres} Litres</strong> ({selectedRequest.fuelType || "Fuel"}) - ₹{selectedRequest.fuelAmount || 0}
                  </p>
                )}

                {selectedRequest.fulfilledBy && (
                  <p className="text-emerald-800">
                    Loaded by: <strong>{selectedRequest.fulfilledBy}</strong> on{" "}
                    {selectedRequest.fulfilledAt ? format(parseISO(selectedRequest.fulfilledAt), "dd MMM yyyy, hh:mm a") : ""}
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedRequest(null)}
                className="px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
