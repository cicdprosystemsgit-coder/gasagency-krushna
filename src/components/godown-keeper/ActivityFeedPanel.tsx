"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Truck,
  RotateCcw,
  ArrowUpRight,
  ArrowDownLeft,
  ClipboardCheck,
  CheckCircle2,
  Clock,
  ChevronRight,
  Filter,
  MessageSquare,
  Sparkles,
  Layers,
  ArrowRight,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export interface FeedGodownRecord {
  id: string;
  vehicleNo: string;
  driverName?: string | null;
  status: string;
  entryDate: string | Date;
  filledCylindersReceived: number;
  emptyCylindersReturned: number;
  items?: any;
  ervNo?: string | null;
  submittedBy?: { name: string } | null;
}

export interface FeedTripLog {
  id: string;
  cylindersLoaded: number;
  cylindersDelivered: number;
  cylindersReturned: number;
  tripStatus: string;
  departureTime?: string | Date | null;
  returnTime?: string | Date | null;
  createdAt: string | Date;
  items?: any;
  notes?: string | null;
  vehicle: {
    vehicleNo: string;
    vehicleName: string;
    assignedTo?: { name: string } | null;
  };
}

export interface FeedDeliveryRequest {
  id: string;
  date: string | Date;
  totalRequested: number;
  totalLoaded: number;
  status: string;
  createdAt: string | Date;
  requestedBy: {
    name: string;
    assignedVehicle?: { vehicleNo: string; vehicleName: string } | null;
  };
  notes?: string | null;
  fulfilledBy?: { name: string } | null;
}

interface ActivityFeedPanelProps {
  recentRecords: FeedGodownRecord[];
  todayTrips: FeedTripLog[];
  deliveryRequests: FeedDeliveryRequest[];
}

type ActivityType = "ALL" | "PLANT" | "LOADING" | "RETURN" | "REQUEST";

interface FeedItem {
  id: string;
  type: "PLANT" | "LOADING" | "RETURN" | "REQUEST";
  timestamp: Date;
  actorName: string;
  actorRole: string;
  title: string;
  message: string;
  statusBadge: { label: string; bg: string; text: string };
  pills: { label: string; val: number | string; variant: "blue" | "emerald" | "amber" | "purple" }[];
  stockImpact?: string;
  linkHref?: string;
  linkText?: string;
}

export function ActivityFeedPanel({
  recentRecords,
  todayTrips,
  deliveryRequests,
}: ActivityFeedPanelProps) {
  const [activeTab, setActiveTab] = useState<ActivityType>("ALL");

  // Format all activity events into a single unified chronological timeline
  const feedItems = useMemo<FeedItem[]>(() => {
    const list: FeedItem[] = [];

    // 1. Plant / Company Supply Records
    recentRecords.forEach((r) => {
      const isApproved = r.status === "APPROVED";
      const isPending = r.status === "PENDING";
      const ts = new Date(r.entryDate);

      list.push({
        id: `plant-${r.id}`,
        type: "PLANT",
        timestamp: ts,
        actorName: r.driverName ? `Driver ${r.driverName}` : `Plant Truck`,
        actorRole: "Company Supply Vehicle",
        title: `Plant Delivery: ${r.vehicleNo}`,
        message: `${r.vehicleNo} arrived with ${r.filledCylindersReceived} filled cylinders${
          r.emptyCylindersReturned > 0 ? ` and returned ${r.emptyCylindersReturned} empty cylinders to plant` : ""
        }.${r.ervNo ? ` (ERV #${r.ervNo})` : ""}`,
        statusBadge: isApproved
          ? { label: "Approved & In Stock", bg: "#ECFDF5", text: "#047857" }
          : isPending
          ? { label: "Pending Approval", bg: "#FFFBEB", text: "#B45309" }
          : { label: r.status, bg: "#FEF2F2", text: "#B91C1C" },
        pills: [
          { label: "Filled Received", val: `+${r.filledCylindersReceived}`, variant: "blue" },
          ...(r.emptyCylindersReturned > 0
            ? [{ label: "Empties Returned", val: `-${r.emptyCylindersReturned}`, variant: "amber" as const }]
            : []),
        ],
        stockImpact: isApproved
          ? `+${r.filledCylindersReceived} Filled Stock`
          : `Awaiting admin approval to add stock`,
        linkHref: "/godown-keeper/godown",
        linkText: "View Gate Pass",
      });
    });

    // 2. Vehicle Trip Logs (Departures & Returns)
    todayTrips.forEach((t) => {
      const vehicleName = t.vehicle.vehicleNo;
      const agentName = t.vehicle.assignedTo?.name || "Delivery Boy";

      // If returned or partial return
      if (t.tripStatus === "RETURNED" || t.tripStatus === "PARTIAL_RETURN") {
        const ts = t.returnTime ? new Date(t.returnTime) : new Date(t.createdAt);
        list.push({
          id: `trip-return-${t.id}`,
          type: "RETURN",
          timestamp: ts,
          actorName: agentName,
          actorRole: `Vehicle ${vehicleName}`,
          title: `Trip Returned: ${agentName}`,
          message: `${agentName} completed route. Reconciled: ${t.cylindersDelivered} cylinders delivered to customers, ${t.cylindersReturned} unsold filled returned, and ${t.cylindersDelivered} empties returned to godown.`,
          statusBadge: { label: "Returned & Reconciled", bg: "#ECFDF5", text: "#047857" },
          pills: [
            { label: "Delivered", val: t.cylindersDelivered, variant: "emerald" },
            { label: "Unsold Returned", val: `+${t.cylindersReturned}`, variant: "blue" },
            { label: "Empties Added", val: `+${t.cylindersDelivered}`, variant: "purple" },
          ],
          stockImpact: `Godown: +${t.cylindersReturned} Filled, +${t.cylindersDelivered} Empties`,
          linkHref: "/godown-keeper/stock",
          linkText: "View Stock Tally",
        });
      } else {
        // Loaded or Out for Delivery
        const ts = t.departureTime ? new Date(t.departureTime) : new Date(t.createdAt);
        list.push({
          id: `trip-load-${t.id}`,
          type: "LOADING",
          timestamp: ts,
          actorName: agentName,
          actorRole: `Vehicle ${vehicleName}`,
          title: `Loaded & Dispatched: ${agentName}`,
          message: `${agentName} departed on vehicle ${vehicleName} with ${t.cylindersLoaded} loaded cylinders. Stock deducted from godown floor.`,
          statusBadge:
            t.tripStatus === "OUT_FOR_DELIVERY"
              ? { label: "Out for Delivery", bg: "#EFF6FF", text: "#1D4ED8" }
              : { label: "Loaded at Godown", bg: "#F0FDF4", text: "#15803D" },
          pills: [
            { label: "Cylinders Loaded", val: t.cylindersLoaded, variant: "blue" },
          ],
          stockImpact: `Godown: -${t.cylindersLoaded} Filled Stock`,
          linkHref: "/godown-keeper/godown",
          linkText: "View Vehicle Trip",
        });
      }
    });

    // 3. Delivery Count Requests
    deliveryRequests.forEach((req) => {
      if (req.status === "PENDING" || req.status === "APPROVED") {
        const ts = new Date(req.createdAt || req.date);
        list.push({
          id: `req-${req.id}`,
          type: "REQUEST",
          timestamp: ts,
          actorName: req.requestedBy.name,
          actorRole: req.requestedBy.assignedVehicle?.vehicleNo || "Delivery Agent",
          title: `Load Request: ${req.requestedBy.name}`,
          message: `${req.requestedBy.name} requested loading of ${req.totalRequested} cylinders. ${
            req.status === "APPROVED"
              ? "Approved by manager! Ready for godown keeper to load."
              : "Pending administrative approval."
          }`,
          statusBadge:
            req.status === "APPROVED"
              ? { label: "Approved • Ready to Load", bg: "#EFF6FF", text: "#1D4ED8" }
              : { label: "Pending Approval", bg: "#FFFBEB", text: "#B45309" },
          pills: [
            { label: "Requested", val: req.totalRequested, variant: "amber" },
          ],
          stockImpact: "Pending Vehicle Filling",
          linkHref: "/godown-keeper/delivery-requests",
          linkText: req.status === "APPROVED" ? "Load Vehicle Now" : "Review Request",
        });
      }
    });

    // Sort newest first
    return list.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [recentRecords, todayTrips, deliveryRequests]);

  const filteredItems = useMemo(() => {
    if (activeTab === "ALL") return feedItems;
    return feedItems.filter((i) => i.type === activeTab);
  }, [feedItems, activeTab]);

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-100 bg-gradient-to-r from-zinc-50 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600 shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-bold text-zinc-800">Godown Operations Activity Feed</h3>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Stream
              </span>
            </div>
            <p className="text-[12px] text-zinc-400">
              Real-time chronological events of plant arrivals, vehicle loadings, and cylinder returns
            </p>
          </div>
        </div>

        <Link
          href="/godown-keeper/godown"
          className="text-xs font-bold text-blue-600 hover:text-blue-500 flex items-center gap-1 shrink-0 self-start sm:self-auto"
        >
          View Full Log <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 px-6 py-2.5 border-b border-zinc-100 bg-zinc-50/60 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab("ALL")}
          className={`px-3 py-1.5 rounded-lg transition-all ${
            activeTab === "ALL"
              ? "bg-white text-zinc-900 shadow-xs border border-zinc-200 font-bold"
              : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100/60"
          }`}
        >
          All Activity ({feedItems.length})
        </button>
        <button
          onClick={() => setActiveTab("PLANT")}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
            activeTab === "PLANT"
              ? "bg-white text-emerald-700 shadow-xs border border-zinc-200 font-bold"
              : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100/60"
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          Plant Supplies
        </button>
        <button
          onClick={() => setActiveTab("LOADING")}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
            activeTab === "LOADING"
              ? "bg-white text-blue-700 shadow-xs border border-zinc-200 font-bold"
              : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100/60"
          }`}
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          Vehicle Loads
        </button>
        <button
          onClick={() => setActiveTab("RETURN")}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
            activeTab === "RETURN"
              ? "bg-white text-purple-700 shadow-xs border border-zinc-200 font-bold"
              : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100/60"
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Returns & Empties
        </button>
        <button
          onClick={() => setActiveTab("REQUEST")}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
            activeTab === "REQUEST"
              ? "bg-white text-amber-700 shadow-xs border border-zinc-200 font-bold"
              : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100/60"
          }`}
        >
          <ClipboardCheck className="w-3.5 h-3.5" />
          Load Requests
        </button>
      </div>

      {/* Chat Timeline Stream */}
      <div className="p-6 space-y-4 max-h-[580px] overflow-y-auto">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 text-zinc-400 space-y-2">
            <MessageSquare className="w-8 h-8 mx-auto text-zinc-300" />
            <p className="text-xs italic">No activity logged under this category today.</p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isPlant = item.type === "PLANT";
            const isLoad = item.type === "LOADING";
            const isReturn = item.type === "RETURN";
            const isRequest = item.type === "REQUEST";

            return (
              <div key={item.id} className="flex items-start gap-3.5 group">
                {/* Chat Avatar with Event Indicator */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs text-xs font-bold ${
                    isPlant
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : isLoad
                      ? "bg-blue-100 text-blue-800 border border-blue-200"
                      : isReturn
                      ? "bg-purple-100 text-purple-800 border border-purple-200"
                      : "bg-amber-100 text-amber-800 border border-amber-200"
                  }`}
                >
                  {isPlant && <Truck className="w-4 h-4" />}
                  {isLoad && <ArrowUpRight className="w-4 h-4" />}
                  {isReturn && <RotateCcw className="w-4 h-4" />}
                  {isRequest && <ClipboardCheck className="w-4 h-4" />}
                </div>

                {/* Chat Message Bubble */}
                <div className="flex-1 bg-zinc-50/70 border border-zinc-100 rounded-2xl p-4 space-y-2.5 transition-all hover:border-zinc-200 hover:bg-white hover:shadow-xs">
                  {/* Bubble Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold text-zinc-900">{item.actorName}</span>
                      <span className="text-[11px] text-zinc-400 font-medium">({item.actorRole})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: item.statusBadge.bg, color: item.statusBadge.text }}
                      >
                        {item.statusBadge.label}
                      </span>
                      <span className="text-[11px] text-zinc-400 font-medium">
                        {formatDateTime(item.timestamp)}
                      </span>
                    </div>
                  </div>

                  {/* Bubble Message */}
                  <p className="text-[12px] text-zinc-700 leading-relaxed font-normal">
                    {item.message}
                  </p>

                  {/* Stock Impact and Detail Pills */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-zinc-100">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {item.pills.map((pill, idx) => (
                        <span
                          key={idx}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                            pill.variant === "blue"
                              ? "bg-blue-50 text-blue-700 border border-blue-100"
                              : pill.variant === "emerald"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : pill.variant === "purple"
                              ? "bg-purple-50 text-purple-700 border border-purple-100"
                              : "bg-amber-50 text-amber-700 border border-amber-100"
                          }`}
                        >
                          <span className="text-zinc-500 font-normal">{pill.label}:</span>
                          <strong>{pill.val}</strong>
                        </span>
                      ))}

                      {item.stockImpact && (
                        <span className="text-[11px] font-medium text-zinc-500 flex items-center gap-1 bg-white border border-zinc-200 px-2 py-0.5 rounded-md">
                          <Layers className="w-3 h-3 text-zinc-400" />
                          {item.stockImpact}
                        </span>
                      )}
                    </div>

                    {item.linkHref && (
                      <Link
                        href={item.linkHref}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-500 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform"
                      >
                        {item.linkText || "View Details"} <ChevronRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
