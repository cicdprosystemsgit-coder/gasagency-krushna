"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import {
  Truck, CheckCircle2, Clock, AlertCircle, Fuel, Plus, Trash2,
  Eye, RefreshCw, X, ShieldAlert, Sparkles, User, Calendar
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { toast } from "sonner";
import { fulfillDeliveryCountRequest } from "@/app/actions/delivery-count-requests";

interface ProductItem {
  id: string;
  name: string;
  isCylinder: boolean;
}

export interface GodownDeliveryRequest {
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
  deliveryBoy: {
    id: string;
    name: string;
    phone: string | null;
    vehicle: {
      id: string;
      vehicleNo: string;
      vehicleName: string;
      vehicleType: string;
    } | null;
  };
}

interface DeliveryRequestsClientProps {
  initialRequests: GodownDeliveryRequest[];
  products: ProductItem[];
  userId: string;
  userRole: string;
}

export function DeliveryRequestsClient({
  initialRequests,
  products,
  userId,
  userRole,
}: DeliveryRequestsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Active Tab: "APPROVED" (Ready to Load), "FULFILLED" (Completed), "PENDING" (Awaiting Admin)
  const [activeTab, setActiveTab] = useState<"APPROVED" | "FULFILLED" | "PENDING">("APPROVED");

  // Modals
  const [loadingModalRequest, setLoadingModalRequest] = useState<GodownDeliveryRequest | null>(null);
  const [viewDetailsRequest, setViewDetailsRequest] = useState<GodownDeliveryRequest | null>(null);

  // Loading Form State
  const [loadItems, setLoadItems] = useState<Array<{ productId: string; productName: string; loadedQty: number }>>([]);
  const [fuelLitres, setFuelLitres] = useState<string>("");
  const [fuelAmount, setFuelAmount] = useState<string>("");
  const [fuelType, setFuelType] = useState<string>("Petrol");
  const [godownNotes, setGodownNotes] = useState<string>("");
  const [formError, setFormError] = useState<string>("");

  const approvedList = initialRequests.filter((r) => r.status === "APPROVED");
  const fulfilledList = initialRequests.filter((r) => r.status === "FULFILLED");
  const pendingList = initialRequests.filter((r) => r.status === "PENDING");

  const displayedRequests =
    activeTab === "APPROVED"
      ? approvedList
      : activeTab === "FULFILLED"
      ? fulfilledList
      : pendingList;

  // Open the vehicle loading modal
  const openLoadModal = (req: GodownDeliveryRequest) => {
    setLoadingModalRequest(req);
    // Pre-populate items matching the requested quantities
    setLoadItems(
      req.items.map((it) => ({
        productId: it.productId,
        productName: it.productName,
        loadedQty: it.requestedQty,
      }))
    );
    setFuelLitres("");
    setFuelAmount("");
    setFuelType(req.deliveryBoy.vehicle?.vehicleType === "Two-Wheeler" ? "Petrol" : "Diesel");
    setGodownNotes("");
    setFormError("");
  };

  const handleLoadedQtyChange = (idx: number, val: number) => {
    const updated = [...loadItems];
    updated[idx] = { ...updated[idx], loadedQty: Math.max(0, val) };
    setLoadItems(updated);
  };

  const handleAddExtraProduct = () => {
    const available = products.find((p) => !loadItems.some((li) => li.productId === p.id));
    const target = available || products[0];
    if (target) {
      setLoadItems([...loadItems, { productId: target.id, productName: target.name, loadedQty: 1 }]);
    }
  };

  const handleRemoveLoadItem = (idx: number) => {
    if (loadItems.length <= 1) return;
    setLoadItems(loadItems.filter((_, i) => i !== idx));
  };

  const handleFulfillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loadingModalRequest) return;
    setFormError("");

    const validItems = loadItems.filter((it) => Number(it.loadedQty) > 0);
    if (validItems.length === 0) {
      setFormError("At least one product must have loaded quantity > 0");
      return;
    }

    startTransition(async () => {
      const res = await fulfillDeliveryCountRequest(loadingModalRequest.id, {
        fulfilledItems: validItems,
        fuelLitres: fuelLitres ? Number(fuelLitres) : undefined,
        fuelAmount: fuelAmount ? Number(fuelAmount) : undefined,
        fuelType: fuelLitres ? fuelType : undefined,
        godownNotes,
      });

      if (res.error) {
        setFormError(res.error);
        toast.error(res.error);
      } else {
        toast.success(`Vehicle successfully loaded & filled for ${loadingModalRequest.deliveryBoy.name}!`);
        setLoadingModalRequest(null);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 rounded-2xl p-6 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Truck className="w-6 h-6 text-emerald-200" />
            <h2 className="text-xl font-bold">Godown Vehicle Loading Dispatch</h2>
          </div>
          <p className="text-xs text-emerald-100 max-w-xl">
            When delivery boys submit their daily cylinder request and admin approves it, load their vehicles with the required cylinders, fill fuel, and confirm dispatch here.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/20 text-center">
            <div className="text-2xl font-bold">{approvedList.length}</div>
            <div className="text-[11px] text-emerald-100 font-medium">Ready to Load</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-2 flex-wrap gap-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("APPROVED")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition ${
              activeTab === "APPROVED"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50"
            }`}
          >
            <Truck className="w-4 h-4" />
            Ready to Load ({approvedList.length})
          </button>

          <button
            onClick={() => setActiveTab("FULFILLED")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition ${
              activeTab === "FULFILLED"
                ? "bg-zinc-900 text-white shadow-sm"
                : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Loaded History ({fulfilledList.length})
          </button>

          <button
            onClick={() => setActiveTab("PENDING")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition ${
              activeTab === "PENDING"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50"
            }`}
          >
            <Clock className="w-4 h-4" />
            Pending Admin Approval ({pendingList.length})
          </button>
        </div>

        <span className="text-xs text-zinc-500 font-medium">
          Showing {displayedRequests.length} record{displayedRequests.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Requests List */}
      {displayedRequests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center text-zinc-500 shadow-sm">
          <Truck className="w-12 h-12 mx-auto text-zinc-300 mb-3" />
          <h3 className="text-sm font-bold text-zinc-800">
            {activeTab === "APPROVED"
              ? "No vehicles waiting to be loaded"
              : activeTab === "FULFILLED"
              ? "No loaded vehicle history found"
              : "No pending requests from delivery boys"}
          </h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
            {activeTab === "APPROVED"
              ? "All approved delivery count requests have been fulfilled! When admin approves new requests, they will show up here."
              : "Switch tabs to view other records."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedRequests.map((req) => {
            const isApproved = req.status === "APPROVED";
            const isFulfilled = req.status === "FULFILLED";

            return (
              <div
                key={req.id}
                className={`bg-white rounded-2xl border p-5 transition flex flex-col justify-between shadow-xs hover:shadow-md ${
                  isApproved
                    ? "border-blue-300 ring-2 ring-blue-100"
                    : isFulfilled
                    ? "border-emerald-200"
                    : "border-zinc-200"
                }`}
              >
                <div className="space-y-3.5">
                  {/* Header: Delivery Boy & Vehicle */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-700 shrink-0 font-bold text-sm">
                        {req.deliveryBoy.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-zinc-900 text-sm leading-tight">
                          {req.deliveryBoy.name}
                        </h4>
                        <p className="text-xs text-zinc-500 font-mono">
                          {req.deliveryBoy.vehicle
                            ? `${req.deliveryBoy.vehicle.vehicleNo} (${req.deliveryBoy.vehicle.vehicleName})`
                            : "No vehicle assigned"}
                        </p>
                      </div>
                    </div>

                    {isApproved && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        <CheckCircle2 className="w-3 h-3" /> Ready
                      </span>
                    )}
                    {isFulfilled && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Truck className="w-3 h-3" /> Loaded
                      </span>
                    )}
                    {req.status === "PENDING" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="w-3 h-3 animate-pulse" /> Awaiting Admin
                      </span>
                    )}
                  </div>

                  {/* Delivery Date */}
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 bg-zinc-50 px-2.5 py-1.5 rounded-lg border border-zinc-200">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                    <span>For Date: <strong>{format(parseISO(req.date), "dd MMM yyyy")}</strong></span>
                  </div>

                  {/* Cylinders Requested Breakdown */}
                  <div>
                    <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
                      Requested Load ({req.totalRequested} Total Cylinders)
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {req.items.map((it, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-zinc-100 text-zinc-800 border border-zinc-200"
                        >
                          {it.productName}: <strong className="ml-1 text-zinc-900">{it.requestedQty}</strong>
                        </span>
                      ))}
                    </div>
                    {req.notes && (
                      <p className="text-[11px] text-zinc-500 mt-2 bg-zinc-50 p-2 rounded border border-zinc-200">
                        <strong>Delivery Boy Note:</strong> {req.notes}
                      </p>
                    )}
                  </div>

                  {/* Fulfillment / Loaded details if fulfilled */}
                  {isFulfilled && (
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs space-y-1">
                      <div className="flex justify-between font-semibold text-emerald-900">
                        <span>Total Loaded:</span>
                        <span>{req.totalLoaded} cylinders</span>
                      </div>
                      {req.fuelLitres != null && (
                        <div className="flex items-center gap-1 text-emerald-800">
                          <Fuel className="w-3.5 h-3.5 text-emerald-600" />
                          <span>
                            Fueled: <strong>{req.fuelLitres}L</strong> ({req.fuelType || "Fuel"}) ₹{req.fuelAmount || 0}
                          </span>
                        </div>
                      )}
                      {req.fulfilledBy && (
                        <p className="text-[11px] text-emerald-700">
                          By {req.fulfilledBy} on {req.fulfilledAt ? format(parseISO(req.fulfilledAt), "dd MMM, hh:mm a") : ""}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Approval info */}
                  {req.reviewedBy && (
                    <p className="text-[11px] text-zinc-400">
                      Approved by {req.reviewedBy}
                    </p>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="pt-4 mt-4 border-t border-zinc-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setViewDetailsRequest(req)}
                    className="p-2 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg transition border border-zinc-200"
                    title="View Request Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {isApproved && (
                    <button
                      onClick={() => openLoadModal(req)}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-xs"
                    >
                      <Truck className="w-4 h-4" />
                      Fill / Load Vehicle
                    </button>
                  )}

                  {isFulfilled && (
                    <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Completed
                    </span>
                  )}

                  {req.status === "PENDING" && (
                    <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                      <Clock className="w-4 h-4" /> Needs Admin Approval
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Fulfill / Vehicle Loading */}
      {loadingModalRequest && (
        <Modal
          isOpen={true}
          onClose={() => !isPending && setLoadingModalRequest(null)}
          title="Vehicle Loading & Fueling"
        >
          <form onSubmit={handleFulfillSubmit} className="space-y-4 text-sm">
            {/* Delivery Boy & Vehicle Summary */}
            <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase font-semibold text-blue-700">Delivery Boy</span>
                <p className="font-bold text-zinc-900">{loadingModalRequest.deliveryBoy.name}</p>
                <p className="text-xs text-zinc-600 font-mono mt-0.5">
                  {loadingModalRequest.deliveryBoy.vehicle
                    ? `${loadingModalRequest.deliveryBoy.vehicle.vehicleNo} · ${loadingModalRequest.deliveryBoy.vehicle.vehicleName}`
                    : "No vehicle assigned"}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[11px] uppercase font-semibold text-blue-700">Requested Date</span>
                <p className="font-bold text-zinc-900">
                  {format(parseISO(loadingModalRequest.date), "dd MMM yyyy")}
                </p>
              </div>
            </div>

            {/* Cylinder Loading section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-zinc-800 uppercase tracking-wide">
                  Cylinders Loaded onto Vehicle <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleAddExtraProduct}
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Product
                </button>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {loadItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <select
                      value={item.productId}
                      onChange={(e) => {
                        const prod = products.find((p) => p.id === e.target.value);
                        const updated = [...loadItems];
                        updated[idx] = {
                          ...updated[idx],
                          productId: e.target.value,
                          productName: prod?.name || "Product",
                        };
                        setLoadItems(updated);
                      }}
                      className="flex-1 text-xs px-3 py-2 border border-zinc-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                        min="0"
                        placeholder="Loaded"
                        value={item.loadedQty}
                        onChange={(e) => handleLoadedQtyChange(idx, Number(e.target.value))}
                        className="w-full text-xs px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-right pr-6 font-bold text-zinc-900"
                        required
                      />
                      <span className="absolute right-2 top-2 text-xs text-zinc-400">cyl</span>
                    </div>

                    {loadItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLoadItem(idx)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-2 text-right text-xs font-semibold text-zinc-600">
                Total Loaded:{" "}
                <span className="text-emerald-700 text-sm font-bold">
                  {loadItems.reduce((sum, it) => sum + (Number(it.loadedQty) || 0), 0)} cylinders
                </span>
              </div>
            </div>

            {/* Vehicle Fuel Section */}
            <div className="border border-purple-200 bg-purple-50/50 p-3.5 rounded-xl space-y-2.5">
              <div className="flex items-center gap-1.5 text-purple-900 font-bold text-xs">
                <Fuel className="w-4 h-4 text-purple-600" />
                <span>Vehicle Fuel Filling (Optional)</span>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Fuel Type</label>
                  <select
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-zinc-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    <option value="Petrol">Petrol</option>
                    <option value="Diesel">Diesel</option>
                    <option value="CNG">CNG</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Litres</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 5.5"
                    value={fuelLitres}
                    onChange={(e) => setFuelLitres(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 550"
                    value={fuelAmount}
                    onChange={(e) => setFuelAmount(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Godown Loading Remarks (Optional)
              </label>
              <textarea
                rows={2}
                value={godownNotes}
                onChange={(e) => setGodownNotes(e.target.value)}
                placeholder="e.g. Full load loaded, vehicle tire pressure checked..."
                className="w-full text-xs px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {formError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-1.5 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {formError}
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setLoadingModalRequest(null)}
                className="px-3.5 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Confirming...
                  </>
                ) : (
                  <>
                    <Truck className="w-3.5 h-3.5" /> Confirm Vehicle Loaded & Dispatched
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: View Details */}
      {viewDetailsRequest && (
        <Modal
          isOpen={true}
          onClose={() => setViewDetailsRequest(null)}
          title="Delivery Load Details"
        >
          <div className="space-y-4 text-sm">
            <div className="flex justify-between items-start pb-3 border-b border-zinc-200">
              <div>
                <p className="font-bold text-zinc-900">{viewDetailsRequest.deliveryBoy.name}</p>
                <p className="text-xs text-zinc-500">
                  {viewDetailsRequest.deliveryBoy.vehicle
                    ? `${viewDetailsRequest.deliveryBoy.vehicle.vehicleNo} (${viewDetailsRequest.deliveryBoy.vehicle.vehicleName})`
                    : "No vehicle assigned"}
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Requested Date: {format(parseISO(viewDetailsRequest.date), "dd MMMM yyyy")}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-800">
                {viewDetailsRequest.status}
              </span>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase text-zinc-500 mb-2">
                Requested Products ({viewDetailsRequest.totalRequested} Total)
              </h4>
              <div className="border border-zinc-200 rounded-lg divide-y divide-zinc-200">
                {viewDetailsRequest.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between px-3 py-2 text-xs">
                    <span className="font-medium text-zinc-800">{it.productName}</span>
                    <span className="font-bold text-zinc-900">{it.requestedQty} cyl</span>
                  </div>
                ))}
              </div>
            </div>

            {viewDetailsRequest.status === "FULFILLED" && (
              <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 space-y-2 text-xs">
                <div className="flex justify-between font-bold text-emerald-900">
                  <span>Actual Cylinders Loaded</span>
                  <span>{viewDetailsRequest.totalLoaded} cylinders</span>
                </div>

                {viewDetailsRequest.fulfilledItems && (
                  <div className="bg-white rounded border border-emerald-200 divide-y divide-emerald-200">
                    {viewDetailsRequest.fulfilledItems.map((fit, idx) => (
                      <div key={idx} className="flex justify-between px-2.5 py-1.5">
                        <span>{fit.productName}</span>
                        <strong className="text-emerald-700">{fit.loadedQty} loaded</strong>
                      </div>
                    ))}
                  </div>
                )}

                {viewDetailsRequest.fuelLitres != null && (
                  <p className="text-emerald-900">
                    Vehicle Fuel: <strong>{viewDetailsRequest.fuelLitres} Litres</strong> ({viewDetailsRequest.fuelType || "Fuel"}) - ₹{viewDetailsRequest.fuelAmount || 0}
                  </p>
                )}

                {viewDetailsRequest.fulfilledBy && (
                  <p className="text-emerald-800">
                    Loaded by: <strong>{viewDetailsRequest.fulfilledBy}</strong> on{" "}
                    {viewDetailsRequest.fulfilledAt ? format(parseISO(viewDetailsRequest.fulfilledAt), "dd MMM yyyy, hh:mm a") : ""}
                  </p>
                )}

                {viewDetailsRequest.godownNotes && (
                  <p className="text-emerald-800">
                    Godown Notes: {viewDetailsRequest.godownNotes}
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewDetailsRequest(null)}
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
