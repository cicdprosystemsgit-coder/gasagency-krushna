"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ClipboardCheck, Clock, CheckCircle2, XCircle, Truck, Fuel,
  Plus, Trash2, AlertCircle, Calendar, FileText, ChevronRight,
  Eye, RefreshCw, X
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import {
  submitDeliveryCountRequest,
  cancelDeliveryCountRequest,
} from "@/app/actions/delivery-count-requests";

interface ProductItem {
  id: string;
  name: string;
  isCylinder: boolean;
}

export interface SerializedDeliveryCountRequest {
  id: string;
  date: string;
  items: Array<{ productId: string; productName: string; requestedQty: number }>;
  totalRequested: number;
  notes: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "FULFILLED";
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  fulfilledItems: Array<{ productId: string; productName: string; loadedQty: number }> | null;
  totalLoaded: number | null;
  fuelLitres: number | null;
  fuelAmount: number | null;
  fuelType: string | null;
  fulfilledBy: string | null;
  fulfilledAt: string | null;
  godownNotes: string | null;
  createdAt: string;
}

interface DeliveryCountClientProps {
  products: ProductItem[];
  initialRequests: SerializedDeliveryCountRequest[];
  userId: string;
  assignedVehicle: {
    id: string;
    vehicleNo: string;
    vehicleName: string;
    vehicleType: string;
  } | null;
}

export function DeliveryCountClient({
  products,
  initialRequests,
  userId,
  assignedVehicle,
}: DeliveryCountClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const confirm = useConfirm();

  // Form State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [requestDate, setRequestDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [requestItems, setRequestItems] = useState<Array<{ productId: string; requestedQty: number }>>([
    { productId: products[0]?.id || "", requestedQty: 10 },
  ]);
  const [requestNotes, setRequestNotes] = useState("");
  const [formError, setFormError] = useState("");

  // Details Modal State
  const [selectedRequest, setSelectedRequest] = useState<SerializedDeliveryCountRequest | null>(null);

  // Tab filter
  const [filterTab, setFilterTab] = useState<"ALL" | "PENDING" | "APPROVED" | "FULFILLED" | "REJECTED">("ALL");

  const filteredRequests = initialRequests.filter((req) => {
    if (filterTab === "ALL") return true;
    return req.status === filterTab;
  });

  // KPI counters
  const counts = {
    pending: initialRequests.filter((r) => r.status === "PENDING").length,
    approved: initialRequests.filter((r) => r.status === "APPROVED").length,
    fulfilled: initialRequests.filter((r) => r.status === "FULFILLED").length,
    rejected: initialRequests.filter((r) => r.status === "REJECTED").length,
  };

  const handleAddItem = () => {
    const available = products.find((p) => !requestItems.some((ri) => ri.productId === p.id));
    if (available) {
      setRequestItems([...requestItems, { productId: available.id, requestedQty: 5 }]);
    } else {
      setRequestItems([...requestItems, { productId: products[0]?.id || "", requestedQty: 5 }]);
    }
  };

  const handleRemoveItem = (index: number) => {
    if (requestItems.length <= 1) return;
    setRequestItems(requestItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: "productId" | "requestedQty", val: any) => {
    const updated = [...requestItems];
    updated[index] = { ...updated[index], [field]: val };
    setRequestItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const itemsToSubmit = requestItems
      .filter((it) => Number(it.requestedQty) > 0)
      .map((it) => {
        const prod = products.find((p) => p.id === it.productId);
        return {
          productId: it.productId,
          productName: prod?.name || "Product",
          requestedQty: Number(it.requestedQty),
        };
      });

    if (itemsToSubmit.length === 0) {
      setFormError("Please enter valid quantities for at least one cylinder product");
      return;
    }

    startTransition(async () => {
      const res = await submitDeliveryCountRequest({
        date: requestDate,
        items: itemsToSubmit,
        notes: requestNotes,
      });

      if (res.error) {
        setFormError(res.error);
      } else {
        setIsCreateOpen(false);
        setRequestNotes("");
        setRequestItems([{ productId: products[0]?.id || "", requestedQty: 10 }]);
        router.refresh();
      }
    });
  };

  const handleCancelRequest = async (id: string) => {
    const ok = await confirm({
      title: "Cancel Delivery Count Request",
      message: "Are you sure you want to cancel this delivery count request?",
      confirmText: "Cancel Request",
      variant: "danger",
    });
    if (!ok) return;

    startTransition(async () => {
      const res = await cancelDeliveryCountRequest(id);
      if (res.error) {
        alert(res.error);
      } else {
        if (selectedRequest?.id === id) setSelectedRequest(null);
        router.refresh();
      }
    });
  };

  const getStatusBadge = (status: SerializedDeliveryCountRequest["status"]) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 animate-pulse" /> Pending Approval
          </span>
        );
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved - Waiting for Godown
          </span>
        );
      case "FULFILLED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Truck className="w-3.5 h-3.5" /> Vehicle Loaded & Filled
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Vehicle Info */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 rounded-2xl p-6 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Truck className="w-5 h-5 text-blue-200" />
            <h2 className="text-lg font-bold">
              {assignedVehicle
                ? `${assignedVehicle.vehicleNo} (${assignedVehicle.vehicleName})`
                : "No Vehicle Assigned"}
            </h2>
          </div>
          <p className="text-xs text-blue-100 max-w-xl">
            {assignedVehicle
              ? `Vehicle Type: ${assignedVehicle.vehicleType}. Submit your required cylinder count below. Once approved by Manager/Admin, the Godown Keeper will load your vehicle.`
              : "Ask your manager to assign you a delivery vehicle to track loading and fueling accurately."}
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-blue-700 hover:bg-blue-50 font-semibold text-sm rounded-xl transition shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Request Today&apos;s Load
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          onClick={() => setFilterTab("PENDING")}
          className={`p-4 rounded-xl border text-left transition ${
            filterTab === "PENDING"
              ? "bg-amber-50/80 border-amber-300 ring-2 ring-amber-400"
              : "bg-white border-zinc-200 hover:border-amber-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Pending Approval</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 mt-2">{counts.pending}</div>
        </button>

        <button
          onClick={() => setFilterTab("APPROVED")}
          className={`p-4 rounded-xl border text-left transition ${
            filterTab === "APPROVED"
              ? "bg-blue-50/80 border-blue-300 ring-2 ring-blue-400"
              : "bg-white border-zinc-200 hover:border-blue-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Approved by Admin</span>
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 mt-2">{counts.approved}</div>
        </button>

        <button
          onClick={() => setFilterTab("FULFILLED")}
          className={`p-4 rounded-xl border text-left transition ${
            filterTab === "FULFILLED"
              ? "bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-400"
              : "bg-white border-zinc-200 hover:border-emerald-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Loaded by Godown</span>
            <Truck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 mt-2">{counts.fulfilled}</div>
        </button>

        <button
          onClick={() => setFilterTab("REJECTED")}
          className={`p-4 rounded-xl border text-left transition ${
            filterTab === "REJECTED"
              ? "bg-rose-50/80 border-rose-300 ring-2 ring-rose-400"
              : "bg-white border-zinc-200 hover:border-rose-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Rejected</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 mt-2">{counts.rejected}</div>
        </button>
      </div>

      {/* Filter Tabs & Search Header */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 bg-zinc-50/50">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {(["ALL", "PENDING", "APPROVED", "FULFILLED", "REJECTED"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition whitespace-nowrap ${
                  filterTab === tab
                    ? "bg-zinc-900 text-white shadow-xs"
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60"
                }`}
              >
                {tab === "ALL" ? "All Requests" : tab.charAt(0) + tab.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <span className="text-xs text-zinc-500 font-medium">
            Showing {filteredRequests.length} record{filteredRequests.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Requests List */}
        {filteredRequests.length === 0 ? (
          <div className="py-12 text-center text-zinc-500">
            <ClipboardCheck className="w-10 h-10 mx-auto text-zinc-300 mb-3" />
            <p className="text-sm font-medium text-zinc-700">No requests found</p>
            <p className="text-xs text-zinc-400 mt-1">
              {filterTab === "ALL"
                ? "Click 'Request Today\'s Load' above to submit your cylinder count."
                : `No requests with status ${filterTab}.`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200">
            {filteredRequests.map((req) => (
              <div
                key={req.id}
                className="p-4 hover:bg-zinc-50/80 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-semibold text-zinc-900 text-sm">
                      {format(new Date(req.date), "EEE, dd MMM yyyy")}
                    </span>
                    {getStatusBadge(req.status)}
                    <span className="text-xs text-zinc-400">
                      Submitted at {format(new Date(req.createdAt), "hh:mm a")}
                    </span>
                  </div>

                  {/* Products summary badge pills */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-xs font-medium text-zinc-500">Requested:</span>
                    {req.items.map((it, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-zinc-100 text-zinc-800 font-medium border border-zinc-200"
                      >
                        {it.productName}: <strong>{it.requestedQty}</strong>
                      </span>
                    ))}
                    <span className="text-xs text-zinc-600 font-semibold ml-1">
                      (Total: {req.totalRequested} cyl)
                    </span>
                  </div>

                  {/* If fulfilled, show fulfillment pill */}
                  {req.status === "FULFILLED" && (
                    <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium bg-emerald-50/80 px-2.5 py-1 rounded-md border border-emerald-200 w-fit">
                      <Truck className="w-3.5 h-3.5" />
                      Loaded: {req.totalLoaded} cylinders by {req.fulfilledBy || "Godown"}
                      {req.fuelLitres ? ` • Fueled: ${req.fuelLitres}L (${req.fuelType || "Fuel"}) ₹${req.fuelAmount || 0}` : ""}
                    </div>
                  )}

                  {/* If rejected, show reason */}
                  {req.status === "REJECTED" && req.reviewNote && (
                    <p className="text-xs text-rose-600 flex items-center gap-1 font-medium">
                      <XCircle className="w-3.5 h-3.5 shrink-0" /> Reason: {req.reviewNote}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <button
                    onClick={() => setSelectedRequest(req)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white hover:bg-zinc-100 border border-zinc-300 rounded-lg transition shadow-xs"
                  >
                    <Eye className="w-3.5 h-3.5" /> Details
                  </button>

                  {req.status === "PENDING" && (
                    <button
                      onClick={() => handleCancelRequest(req.id)}
                      disabled={isPending}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Create New Request */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => !isPending && setIsCreateOpen(false)}
        title="Request Daily Delivery Load"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Date for Delivery Load <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={requestDate}
              onChange={(e) => setRequestDate(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-zinc-700">
                Products & Cylinder Count <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                <Plus className="w-3.5 h-3.5" /> Add Product
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {requestItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={item.productId}
                    onChange={(e) => handleItemChange(idx, "productId", e.target.value)}
                    className="flex-1 text-sm px-3 py-2 border border-zinc-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>

                  <div className="w-28 relative">
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.requestedQty}
                      onChange={(e) => handleItemChange(idx, "requestedQty", e.target.value)}
                      className="w-full text-sm px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-right pr-6"
                      required
                    />
                    <span className="absolute right-2 top-2.5 text-xs text-zinc-400">cyl</span>
                  </div>

                  {requestItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-2 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-zinc-100 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-2 text-right text-xs font-semibold text-zinc-600">
              Total Requested:{" "}
              <span className="text-blue-600 text-sm font-bold">
                {requestItems.reduce((sum, it) => sum + (Number(it.requestedQty) || 0), 0)} cylinders
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Notes or Special Instructions (Optional)
            </label>
            <textarea
              rows={2}
              value={requestNotes}
              onChange={(e) => setRequestNotes(e.target.value)}
              placeholder="e.g. Extra cylinders for commercial route, morning urgent load..."
              className="w-full text-sm px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {formError && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-1.5 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {formError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200">
            <button
              type="button"
              disabled={isPending}
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <ClipboardCheck className="w-3.5 h-3.5" /> Submit Request
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: View Details */}
      {selectedRequest && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedRequest(null)}
          title="Delivery Load Request Details"
        >
          <div className="space-y-4 text-sm">
            {/* Header info */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <div>
                <span className="text-xs text-zinc-500">Delivery Date</span>
                <p className="font-semibold text-zinc-900">
                  {format(new Date(selectedRequest.date), "EEEE, dd MMMM yyyy")}
                </p>
              </div>
              {getStatusBadge(selectedRequest.status)}
            </div>

            {/* Requested Items */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                Requested Cylinders ({selectedRequest.totalRequested} Total)
              </h4>
              <div className="border border-zinc-200 rounded-lg divide-y divide-zinc-200 overflow-hidden">
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

            {/* Approval Info */}
            <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200 space-y-1.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Approval Status
              </h4>
              <p className="text-xs text-zinc-700">
                Status: <strong>{selectedRequest.status}</strong>
              </p>
              {selectedRequest.reviewedBy && (
                <p className="text-xs text-zinc-600">
                  Reviewed by: <strong>{selectedRequest.reviewedBy}</strong> on{" "}
                  {selectedRequest.reviewedAt ? format(new Date(selectedRequest.reviewedAt), "dd MMM yyyy, hh:mm a") : ""}
                </p>
              )}
              {selectedRequest.reviewNote && (
                <p className="text-xs text-zinc-600">
                  Reviewer Note: <em>{selectedRequest.reviewNote}</em>
                </p>
              )}
            </div>

            {/* Fulfilled / Godown Loading Info */}
            {selectedRequest.status === "FULFILLED" && (
              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5" /> Godown Vehicle Loading
                  </h4>
                  <span className="text-xs font-bold text-emerald-900">
                    Total Loaded: {selectedRequest.totalLoaded} cyl
                  </span>
                </div>

                {selectedRequest.fulfilledItems && (
                  <div className="border border-emerald-200 rounded-md divide-y divide-emerald-200 bg-white">
                    {selectedRequest.fulfilledItems.map((fit, idx) => (
                      <div key={idx} className="flex justify-between items-center px-2.5 py-1.5 text-xs">
                        <span className="text-zinc-700">{fit.productName}</span>
                        <span className="font-bold text-emerald-700">{fit.loadedQty} loaded</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Fuel Info */}
                {(selectedRequest.fuelLitres != null || selectedRequest.fuelAmount != null) && (
                  <div className="flex items-center gap-4 text-xs text-emerald-900 bg-emerald-100/60 p-2 rounded">
                    <div className="flex items-center gap-1">
                      <Fuel className="w-3.5 h-3.5 text-emerald-700" />
                      <span>
                        Fuel: <strong>{selectedRequest.fuelLitres || 0} Litres</strong> ({selectedRequest.fuelType || "Petrol"})
                      </span>
                    </div>
                    {selectedRequest.fuelAmount && (
                      <div>
                        Amount: <strong>₹{selectedRequest.fuelAmount.toFixed(2)}</strong>
                      </div>
                    )}
                  </div>
                )}

                {selectedRequest.fulfilledBy && (
                  <p className="text-xs text-emerald-800">
                    Loaded by: <strong>{selectedRequest.fulfilledBy}</strong> on{" "}
                    {selectedRequest.fulfilledAt ? format(new Date(selectedRequest.fulfilledAt), "dd MMM yyyy, hh:mm a") : ""}
                  </p>
                )}

                {selectedRequest.godownNotes && (
                  <p className="text-xs text-emerald-800">
                    Godown Notes: {selectedRequest.godownNotes}
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
