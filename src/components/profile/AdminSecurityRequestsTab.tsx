"use client";

import { useState, useTransition, useEffect } from "react";
import {
  adminGetSecurityRequests,
  adminApproveSecurityRequest,
  adminRejectSecurityRequest,
} from "@/app/actions/security-requests";
import {
  KeyRound,
  Hash,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Loader2,
  Search,
  Filter,
  User,
  AlertCircle,
  X,
} from "lucide-react";

interface RequestItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string | null;
  userRole: string;
  userAvatarUrl: string | null;
  userHasMFA: boolean;
  type: "CHANGE_PASSWORD" | "CHANGE_PIN";
  status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED" | "EXPIRED";
  userNote: string | null;
  adminResponseNote: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  expiresAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export function AdminSecurityRequestsTab() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
  const [search, setSearch] = useState("");

  // Modals for Approve / Reject
  const [activeModal, setActiveModal] = useState<"approve" | "reject" | null>(null);
  const [selectedReq, setSelectedReq] = useState<RequestItem | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadRequests = () => {
    setIsLoading(true);
    adminGetSecurityRequests().then((res) => {
      setIsLoading(false);
      if (res.requests) {
        setRequests(res.requests as RequestItem[]);
      }
    });
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = () => {
    if (!selectedReq) return;
    setErrorMsg(null);
    startTransition(async () => {
      const res = await adminApproveSecurityRequest(selectedReq.id, adminNote);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(`Approved ${selectedReq.type === "CHANGE_PASSWORD" ? "Password" : "PIN"} change request for ${selectedReq.userName}.`);
        setActiveModal(null);
        setSelectedReq(null);
        setAdminNote("");
        loadRequests();
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    });
  };

  const handleReject = () => {
    if (!selectedReq) return;
    if (!adminNote.trim()) {
      setErrorMsg("Please provide a reason for the rejection so the user understands why.");
      return;
    }
    setErrorMsg(null);
    startTransition(async () => {
      const res = await adminRejectSecurityRequest(selectedReq.id, adminNote);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(`Rejected ${selectedReq.type === "CHANGE_PASSWORD" ? "Password" : "PIN"} request for ${selectedReq.userName}.`);
        setActiveModal(null);
        setSelectedReq(null);
        setAdminNote("");
        loadRequests();
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    });
  };

  const filteredRequests = requests.filter((r) => {
    const matchesStatus = filterStatus === "ALL" ? true : r.status === filterStatus;
    const matchesSearch =
      r.userName.toLowerCase().includes(search.toLowerCase()) ||
      r.userEmail.toLowerCase().includes(search.toLowerCase()) ||
      (r.userPhone && r.userPhone.includes(search));
    return matchesStatus && matchesSearch;
  });

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  return (
    <div className="space-y-4">
      {/* Alert Banners */}
      {errorMsg && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search employee name, email or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8.5 pl-8.5 pr-3 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                filterStatus === st
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
              }`}
            >
              {st === "ALL" ? "All Requests" : st.charAt(0) + st.slice(1).toLowerCase()}
              {st === "PENDING" && pendingCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Requests List */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-2 text-zinc-400 text-xs">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span>Loading security requests...</span>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center text-zinc-400 text-xs">
            No credential change requests found.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {filteredRequests.map((req) => (
              <div
                key={req.id}
                className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors"
              >
                {/* User & Request info */}
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex items-center justify-center flex-shrink-0 text-zinc-600 font-bold text-sm">
                    {req.userAvatarUrl ? (
                      <img src={req.userAvatarUrl} alt={req.userName} className="w-full h-full object-cover" />
                    ) : (
                      req.userName.charAt(0).toUpperCase()
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-900 dark:text-white text-xs">{req.userName}</span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                        {req.userRole}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          req.type === "CHANGE_PASSWORD"
                            ? "bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300"
                            : "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                        }`}
                      >
                        {req.type === "CHANGE_PASSWORD" ? <KeyRound className="w-3 h-3" /> : <Hash className="w-3 h-3" />}
                        {req.type === "CHANGE_PASSWORD" ? "Password Change" : "PIN Change"}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-500">
                      {req.userEmail} {req.userPhone && `• ${req.userPhone}`}
                    </p>

                    {req.userNote && (
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-950 p-2 rounded-lg border border-zinc-200/80 dark:border-zinc-800 mt-1">
                        &ldquo;{req.userNote}&rdquo;
                      </p>
                    )}

                    {req.adminResponseNote && (
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">Admin Response:</span> &ldquo;{req.adminResponseNote}&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                {/* Status & Actions */}
                <div className="flex sm:flex-col items-end gap-2 w-full sm:w-auto justify-between sm:justify-center flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        req.status === "PENDING"
                          ? "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
                          : req.status === "APPROVED"
                          ? "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                          : req.status === "COMPLETED"
                          ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                          : "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300"
                      }`}
                    >
                      {req.status}
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {req.status === "PENDING" && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedReq(req);
                          setAdminNote("");
                          setActiveModal("reject");
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors border border-red-200 dark:border-red-900/60"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedReq(req);
                          setAdminNote("");
                          setActiveModal("approve");
                        }}
                        className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
                      >
                        Approve
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── MODAL: APPROVE CONFIRMATION ── */}
      {activeModal === "approve" && selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Approve Credential Change</h3>
                <p className="text-[11px] text-zinc-400">{selectedReq.userName} ({selectedReq.userRole})</p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              This will grant {selectedReq.userName} a secure 24-hour authorization window to set a new{" "}
              <strong>{selectedReq.type === "CHANGE_PASSWORD" ? "Password" : "PIN"}</strong>.
            </p>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Optional Admin Note / Instructions
              </label>
              <input
                type="text"
                placeholder="e.g. Identity verified by phone. Approved."
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                className="w-full h-9 px-3 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-3.5 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={isPending}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: REJECT CONFIRMATION ── */}
      {activeModal === "reject" && selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center flex-shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Reject Credential Change</h3>
                <p className="text-[11px] text-zinc-400">{selectedReq.userName} ({selectedReq.userRole})</p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              Please enter a reason for rejecting this request. This reason will be displayed directly on the employee&apos;s profile page.
            </p>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Reason for Rejection <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Identity could not be verified. Please visit the agency manager in person."
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                className="w-full p-2.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-3.5 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={isPending || !adminNote.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all flex items-center gap-1.5"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
