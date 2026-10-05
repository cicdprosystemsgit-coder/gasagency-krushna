"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import {
  createCustomer,
  updateCustomer,
  toggleCustomerStatus,
  deleteCustomer,
  deleteSelectedCustomers,
  deleteAllCustomers,
  recoverCustomer,
  recoverSelectedCustomers,
  permanentDeleteCustomer,
  permanentDeleteSelectedCustomers,
  getCustomerLinkedHistory,
  unlinkCustomerRecord,
  unlinkAllCustomerRecords,
  getCustomersPaginated,
} from "@/app/actions/customers";
import { Modal } from "@/components/ui/Modal";
import { BulkImportModal } from "@/components/customers/BulkImportModal";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { toast } from "sonner";
import {
  Plus, Search, Edit2, Trash2, Users, Phone, MapPin,
  Building2, User, FileText, CheckCircle, XCircle, Hash,
  Mail, CreditCard, RefreshCw, FileSpreadsheet, RotateCcw,
  ChevronLeft, ChevronRight, Loader2, AlertTriangle, CheckSquare, Square,
  Unlink, Link2, ExternalLink, ShieldAlert, Clock, AlertCircle,
} from "lucide-react";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  areaRoute?: string | null;
  type: "DOMESTIC" | "COMMERCIAL";
  customerCode: string | null;
  email: string | null;
  gstNumber: string | null;
  contactPerson: string | null;
  businessType: string | null;
  isActive: boolean;
  isDeleted?: boolean;
  deletedAt?: string | null;
  createdAt: string;
}

interface Props {
  initialCustomers: Customer[];
  canDelete: boolean;
  initialCounts?: {
    domestic: number;
    commercial: number;
    active: number;
    inactive: number;
    deleted?: number;
  };
}

const BUSINESS_TYPES = [
  "Hotel", "Restaurant", "Dhaba", "School", "College", "Hospital",
  "Bakery", "Canteen", "Factory", "Caterer", "Other",
];

const inputClass = "input";
const labelClass = "block text-[12px] font-medium mb-1";
const labelStyle = { color: "var(--color-text-secondary)" };

function EmptyState({ tab }: { tab: "DOMESTIC" | "COMMERCIAL" | "DELETED" }) {
  if (tab === "DELETED") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4 bg-zinc-100">
          <Trash2 className="w-7 h-7 text-zinc-400" />
        </div>
        <p className="text-[14px] font-medium text-zinc-700">Trash is empty</p>
        <p className="text-[12px] mt-1 text-zinc-400">
          No soft-deleted customers found. Deleted customers will appear here for recovery or unlinking.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
        style={{ background: "#F4F4F5" }}
      >
        {tab === "DOMESTIC" ? (
          <User className="w-7 h-7" style={{ color: "#A1A1AA" }} />
        ) : (
          <Building2 className="w-7 h-7" style={{ color: "#A1A1AA" }} />
        )}
      </div>
      <p className="text-[14px] font-medium" style={{ color: "#52525B" }}>
        No {tab === "DOMESTIC" ? "regular" : "commercial"} customers yet
      </p>
      <p className="text-[12px] mt-1" style={{ color: "#A1A1AA" }}>
        Add your first {tab === "DOMESTIC" ? "domestic connection holder" : "commercial establishment"}
      </p>
    </div>
  );
}

export function CustomerManagementClient({ initialCustomers, canDelete, initialCounts }: Props) {
  const confirm = useConfirm();
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [activeTab, setActiveTab] = useState<"DOMESTIC" | "COMMERCIAL" | "DELETED">("DOMESTIC");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState<number>(
    initialCounts
      ? (activeTab === "DOMESTIC"
          ? initialCounts.domestic
          : activeTab === "COMMERCIAL"
          ? initialCounts.commercial
          : initialCounts.deleted || 0)
      : initialCustomers.length
  );
  const [totalPages, setTotalPages] = useState<number>(
    Math.ceil(
      (initialCounts
        ? (activeTab === "DOMESTIC"
            ? initialCounts.domestic
            : activeTab === "COMMERCIAL"
            ? initialCounts.commercial
            : initialCounts.deleted || 0)
        : initialCustomers.length) / 50
    ) || 1
  );
  const [isFetching, setIsFetching] = useState(false);
  const [counts, setCounts] = useState({
    domestic: initialCounts?.domestic ?? initialCustomers.filter(c => c.type === "DOMESTIC" && !c.isDeleted).length,
    commercial: initialCounts?.commercial ?? initialCustomers.filter(c => c.type === "COMMERCIAL" && !c.isDeleted).length,
    active: initialCounts?.active ?? initialCustomers.filter(c => c.isActive && !c.isDeleted).length,
    inactive: initialCounts?.inactive ?? initialCustomers.filter(c => !c.isActive && !c.isDeleted).length,
    deleted: initialCounts?.deleted ?? initialCustomers.filter(c => c.isDeleted).length,
  });

  // Modal states
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [, startTransition] = useTransition();

  // Clear selection on tab or page change
  useEffect(() => {
    setSelectedIds([]);
  }, [activeTab, page]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function toggleSelectAllVisible() {
    const visibleIds = customers.map((c) => c.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  }

  function deselectAll() {
    setSelectedIds([]);
  }

  // ── Fetch paginated customers ─────────────────────────────────────────────
  const loadCustomers = useCallback(async () => {
    setIsFetching(true);
    try {
      const isDeletedTab = activeTab === "DELETED";
      const res = await getCustomersPaginated({
        page,
        limit: 50,
        search: debouncedSearch,
        type: isDeletedTab ? "ALL" : activeTab,
        status: statusFilter,
        isDeleted: isDeletedTab,
      });

      if (res && "customers" in res && res.customers) {
        setCustomers(res.customers as unknown as Customer[]);
        setTotalCount(res.total || 0);
        setTotalPages(res.totalPages || 1);
        if (res.counts) {
          setCounts(prev => ({
            ...prev,
            domestic: res.counts?.domestic ?? prev.domestic,
            commercial: res.counts?.commercial ?? prev.commercial,
            deleted: res.counts?.deleted ?? prev.deleted,
          }));
        }
      }
    } catch (err) {
      console.error("Failed to load customers:", err);
    } finally {
      setIsFetching(false);
    }
  }, [page, debouncedSearch, activeTab, statusFilter]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset to page 1 on tab or filter change
  useEffect(() => {
    setPage(1);
  }, [activeTab, statusFilter]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // ── Soft Deletion (1st step delete -> moves to Trash) ─────────────────────
  async function handleDelete(c: Customer) {
    const ok = await confirm({
      title: "Delete Customer (Move to Trash)",
      message: `Are you sure you want to delete customer "${c.name}"? This customer will be deactivated and moved to the "Deleted Customers / Trash" tab. All past delivery records, invoices, and payment histories remain preserved.`,
      confirmText: "Move to Trash",
      cancelText: "Cancel",
      variant: "danger",
    });
    if (!ok) return;

    startTransition(async () => {
      const res = await deleteCustomer(c.id);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`Customer "${c.name}" moved to Trash.`);
      loadCustomers();
    });
  }

  async function handleDeleteSelected() {
    if (selectedIds.length === 0) return;

    const ok = await confirm({
      title: "Move Selected to Trash?",
      message: `Are you sure you want to move the ${selectedIds.length} selected customer(s) to Trash? They can be restored or permanently unlinked later.`,
      confirmText: `Move ${selectedIds.length} to Trash`,
      cancelText: "Cancel",
      variant: "danger",
    });
    if (!ok) return;

    startTransition(async () => {
      const res = await deleteSelectedCustomers(selectedIds);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`Successfully moved ${res.count ?? selectedIds.length} customer(s) to Trash.`);
      setSelectedIds([]);
      loadCustomers();
    });
  }

  async function handleDeleteAll() {
    const label = activeTab === "DOMESTIC" ? "Regular (Domestic)" : "Commercial";
    const ok = await confirm({
      title: `Move ALL ${label} Customers to Trash?`,
      message: `You are about to move all ${totalCount.toLocaleString()} ${label} customers to the Trash tab. Historical invoices and deliveries will stay intact.`,
      confirmText: `Move All (${totalCount.toLocaleString()}) to Trash`,
      cancelText: "Cancel",
      variant: "danger",
    });
    if (!ok) return;

    startTransition(async () => {
      const res = await deleteAllCustomers(activeTab as "DOMESTIC" | "COMMERCIAL");
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`Successfully moved ${res.count ?? totalCount} ${label} customer(s) to Trash.`);
      setSelectedIds([]);
      loadCustomers();
    });
  }

  // ── Restore / Recover Customers ───────────────────────────────────────────
  async function handleRecover(c: Customer) {
    const ok = await confirm({
      title: "Restore Customer",
      message: `Restore customer "${c.name.replace(/\s*\(Deleted\)$/i, "")}" back to the active customer list?`,
      confirmText: "Restore Customer",
      cancelText: "Cancel",
    });
    if (!ok) return;

    startTransition(async () => {
      const res = await recoverCustomer(c.id);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`Customer restored successfully.`);
      loadCustomers();
    });
  }

  async function handleRecoverSelected() {
    if (selectedIds.length === 0) return;

    const ok = await confirm({
      title: "Restore Selected Customers?",
      message: `Restore ${selectedIds.length} selected customer(s) back to active status?`,
      confirmText: `Restore (${selectedIds.length})`,
      cancelText: "Cancel",
    });
    if (!ok) return;

    startTransition(async () => {
      const res = await recoverSelectedCustomers(selectedIds);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`Restored ${res.count ?? selectedIds.length} customer(s).`);
      setSelectedIds([]);
      loadCustomers();
    });
  }

  // ── Permanent Deletion & Unlinking ────────────────────────────────────────
  async function handlePermanentDelete(c: Customer) {
    const ok = await confirm({
      title: "Permanently Delete Customer",
      message: `PERMANENT ACTION: Are you sure you want to permanently delete "${c.name}" from the database? If this customer has linked invoices or delivery history, you will need to unlink those records first to preserve financial audits.`,
      confirmText: "Permanently Delete",
      cancelText: "Cancel",
      variant: "danger",
    });
    if (!ok) return;

    startTransition(async () => {
      const res = await permanentDeleteCustomer(c.id);
      if (!res.success && res.error) {
        toast.error(res.error);
        // Open the linked records history modal automatically so user can review and unlink easily
        setHistoryCustomer(c);
        return;
      }
      toast.success(`Customer "${c.name}" permanently deleted.`);
      loadCustomers();
    });
  }

  async function handlePermanentDeleteSelected() {
    if (selectedIds.length === 0) return;

    const ok = await confirm({
      title: "Permanently Delete Selected Customers?",
      message: `PERMANENT ACTION: Attempting to permanently delete ${selectedIds.length} customer records. Any customers with active linked records will be skipped until unlinked.`,
      confirmText: `Permanently Delete (${selectedIds.length})`,
      cancelText: "Cancel",
      variant: "danger",
    });
    if (!ok) return;

    startTransition(async () => {
      const res = await permanentDeleteSelectedCustomers(selectedIds);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`Permanently deleted ${res.count ?? 0} customer(s).`);
      setSelectedIds([]);
      loadCustomers();
    });
  }

  // ── Add customer form submit ──────────────────────────────────────────────
  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);
    const fd = new FormData(e.currentTarget);
    fd.set("type", activeTab === "COMMERCIAL" ? "COMMERCIAL" : "DOMESTIC");

    startTransition(async () => {
      const res = await createCustomer(fd);
      setFormLoading(false);
      if ("error" in res && res.error) {
        setFormError(res.error);
        return;
      }
      setAddOpen(false);
      toast.success("Customer added successfully.");
      loadCustomers();
    });
  }

  // ── Edit customer form submit ─────────────────────────────────────────────
  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editCustomer) return;
    setFormError("");
    setFormLoading(true);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await updateCustomer(editCustomer.id, fd);
      setFormLoading(false);
      if ("error" in res && res.error) {
        setFormError(res.error);
        return;
      }
      setEditCustomer(null);
      toast.success("Customer updated successfully.");
      loadCustomers();
    });
  }

  // ── Toggle customer status ────────────────────────────────────────────────
  async function handleToggle(id: string) {
    startTransition(async () => {
      const res = await toggleCustomerStatus(id);
      if ("error" in res) return;
      setCustomers((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isActive: !c.isActive } : c))
      );
    });
  }

  const addTypeLabel = activeTab === "COMMERCIAL" ? "Commercial Customer" : "Regular Customer";

  return (
    <div>
      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-3 mb-5 sm:grid-cols-4">
        {[
          { label: "Regular Customers", value: counts.domestic, color: "#2563EB", icon: <User className="w-4 h-4" /> },
          { label: "Commercial Customers", value: counts.commercial, color: "#7C3AED", icon: <Building2 className="w-4 h-4" /> },
          { label: "Active Status", value: counts.active, color: "#16A34A", icon: <CheckCircle className="w-4 h-4" /> },
          { label: "Trash / Deleted", value: counts.deleted, color: "#DC2626", icon: <Trash2 className="w-4 h-4" /> },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl px-4 py-3 flex items-center gap-3 bg-white border border-zinc-200 shadow-xs"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: s.color + "18", color: s.color }}
            >
              {s.icon}
            </div>
            <div>
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">{s.label}</p>
              <p className="text-[18px] font-bold text-zinc-900 leading-tight">
                {s.value.toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 p-1 rounded-xl bg-zinc-100 w-fit">
        <button
          onClick={() => setActiveTab("DOMESTIC")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all cursor-pointer"
          style={
            activeTab === "DOMESTIC"
              ? { background: "#FFFFFF", color: "#18181B", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }
              : { color: "#71717A" }
          }
        >
          <User className="w-3.5 h-3.5" />
          Regular Customers
          <span
            className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
            style={{
              background: activeTab === "DOMESTIC" ? "#EFF6FF" : "#E4E4E7",
              color: activeTab === "DOMESTIC" ? "#2563EB" : "#71717A",
            }}
          >
            {counts.domestic.toLocaleString()}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("COMMERCIAL")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all cursor-pointer"
          style={
            activeTab === "COMMERCIAL"
              ? { background: "#FFFFFF", color: "#18181B", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }
              : { color: "#71717A" }
          }
        >
          <Building2 className="w-3.5 h-3.5" />
          Commercial Customers
          <span
            className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
            style={{
              background: activeTab === "COMMERCIAL" ? "#F5F3FF" : "#E4E4E7",
              color: activeTab === "COMMERCIAL" ? "#7C3AED" : "#71717A",
            }}
          >
            {counts.commercial.toLocaleString()}
          </span>
        </button>

        {canDelete && (
          <button
            onClick={() => setActiveTab("DELETED")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all cursor-pointer"
            style={
              activeTab === "DELETED"
                ? { background: "#FFFFFF", color: "#DC2626", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }
                : { color: "#71717A" }
            }
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
            Deleted / Trash
            <span
              className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
              style={{
                background: activeTab === "DELETED" ? "#FEE2E2" : "#E4E4E7",
                color: activeTab === "DELETED" ? "#DC2626" : "#71717A",
              }}
            >
              {counts.deleted.toLocaleString()}
            </span>
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          {isFetching ? (
            <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-blue-500" />
          ) : (
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          )}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              activeTab === "DELETED"
                ? "Search deleted customers by name, phone, code..."
                : activeTab === "DOMESTIC"
                ? "Search by name, phone, connection no..."
                : "Search by name, phone, GST, reg no..."
            }
            className="w-full pl-9 pr-3 py-2 rounded-lg text-[13px] border border-zinc-300 bg-zinc-50 outline-none focus:border-blue-400"
          />
        </div>

        {activeTab !== "DELETED" && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="px-3 py-2 rounded-lg text-[13px] border border-zinc-300 bg-zinc-50 text-zinc-900 outline-none cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        )}

        {activeTab !== "DELETED" && (
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 transition shadow-xs cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Import Excel
          </button>
        )}

        {canDelete && activeTab !== "DELETED" && totalCount > 0 && (
          <button
            onClick={handleDeleteAll}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition shadow-xs cursor-pointer"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
            Move All {activeTab === "DOMESTIC" ? "Regular" : "Commercial"} to Trash
          </button>
        )}

        {activeTab !== "DELETED" && (
          <button
            onClick={() => { setFormError(""); setAddOpen(true); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium text-white transition-colors hover:opacity-90 shadow-xs cursor-pointer"
            style={{ background: "#2563EB" }}
          >
            <Plus className="w-4 h-4" />
            Add {addTypeLabel}
          </button>
        )}
      </div>

      {/* Selected Action Banner */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 mb-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 animate-fade-in shadow-xs">
          <div className="flex items-center gap-2 text-[13px] font-medium">
            <CheckSquare className="w-4 h-4 text-blue-600" />
            <span>
              <strong>{selectedIds.length}</strong> customer{selectedIds.length > 1 ? "s" : ""} selected
            </span>
            <button
              onClick={deselectAll}
              className="text-xs text-blue-600 underline hover:text-blue-800 ml-2 cursor-pointer"
            >
              Clear Selection
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === "DELETED" ? (
              <>
                <button
                  onClick={handleRecoverSelected}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-xs cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restore Selected ({selectedIds.length})
                </button>
                {canDelete && (
                  <button
                    onClick={handlePermanentDeleteSelected}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition shadow-xs cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Permanently Delete ({selectedIds.length})
                  </button>
                )}
              </>
            ) : (
              canDelete && (
                <button
                  onClick={handleDeleteSelected}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition shadow-xs cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Move Selected ({selectedIds.length}) to Trash
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* Table / List View */}
      {customers.length === 0 ? (
        <EmptyState tab={activeTab} />
      ) : activeTab === "DOMESTIC" ? (
        <DomesticTable
          customers={customers}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAllVisible}
          onEdit={(c) => { setFormError(""); setEditCustomer(c); }}
          onToggle={handleToggle}
          onDelete={canDelete ? handleDelete : undefined}
          onView={setViewCustomer}
        />
      ) : activeTab === "COMMERCIAL" ? (
        <CommercialTable
          customers={customers}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAllVisible}
          onEdit={(c) => { setFormError(""); setEditCustomer(c); }}
          onToggle={handleToggle}
          onDelete={canDelete ? handleDelete : undefined}
          onView={setViewCustomer}
        />
      ) : (
        <DeletedCustomersTable
          customers={customers}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAllVisible}
          onRecover={handleRecover}
          onManageLinks={(c) => setHistoryCustomer(c)}
          onPermanentDelete={canDelete ? handlePermanentDelete : undefined}
          onView={setViewCustomer}
        />
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-zinc-200 text-[13px] text-zinc-600">
          <div>
            Showing <span className="font-semibold text-zinc-900">{((page - 1) * 50) + 1}</span> to{" "}
            <span className="font-semibold text-zinc-900">{Math.min(page * 50, totalCount)}</span> of{" "}
            <span className="font-semibold text-zinc-900">{totalCount.toLocaleString()}</span> customers
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isFetching}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-300 bg-white disabled:opacity-40 hover:bg-zinc-50 transition shadow-xs cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <span className="px-3 py-1.5 font-medium text-zinc-700">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isFetching}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-300 bg-white disabled:opacity-40 hover:bg-zinc-50 transition shadow-xs cursor-pointer"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Add Modal ──────────────────────────────────────────────────────── */}
      <Modal
        open={addOpen}
        onClose={() => { setAddOpen(false); setFormError(""); }}
        title={`Add ${addTypeLabel}`}
        size="lg"
      >
        <form onSubmit={handleAdd} className="space-y-4">
          {formError && (
            <div className="px-3 py-2 rounded-lg text-[12px] bg-red-50 text-red-600 border border-red-200">
              {formError}
            </div>
          )}
          {activeTab === "DOMESTIC" ? (
            <DomesticForm />
          ) : (
            <CommercialForm />
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="flex-1 py-2 rounded-lg text-[13px] font-medium border border-zinc-300 text-zinc-600 transition-colors hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="flex-1 py-2 rounded-lg text-[13px] font-medium text-white transition-colors disabled:opacity-60 bg-blue-600 hover:bg-blue-700"
            >
              {formLoading ? "Saving..." : `Add ${addTypeLabel}`}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Modal ─────────────────────────────────────────────────────── */}
      <Modal
        open={!!editCustomer}
        onClose={() => { setEditCustomer(null); setFormError(""); }}
        title={`Edit ${editCustomer?.type === "DOMESTIC" ? "Regular" : "Commercial"} Customer`}
        size="lg"
      >
        {editCustomer && (
          <form onSubmit={handleEdit} className="space-y-4">
            {formError && (
              <div className="px-3 py-2 rounded-lg text-[12px] bg-red-50 text-red-600 border border-red-200">
                {formError}
              </div>
            )}
            {editCustomer.type === "DOMESTIC" ? (
              <DomesticForm defaults={editCustomer} />
            ) : (
              <CommercialForm defaults={editCustomer} />
            )}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditCustomer(null)}
                className="flex-1 py-2 rounded-lg text-[13px] font-medium border border-zinc-300 text-zinc-600 transition-colors hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formLoading}
                className="flex-1 py-2 rounded-lg text-[13px] font-medium text-white transition-colors disabled:opacity-60 bg-blue-600 hover:bg-blue-700"
              >
                {formLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── View Modal ─────────────────────────────────────────────────────── */}
      <Modal
        open={!!viewCustomer}
        onClose={() => setViewCustomer(null)}
        title="Customer Details"
        size="md"
      >
        {viewCustomer && <CustomerDetailView customer={viewCustomer} />}
      </Modal>

      {/* ── Manage Linked History / Records Modal ──────────────────────────── */}
      {historyCustomer && (
        <LinkedHistoryModal
          customer={historyCustomer}
          onClose={() => setHistoryCustomer(null)}
          onReloadCustomerList={loadCustomers}
        />
      )}

      {/* ── Bulk Import Modal ────────────────────────────────────────────── */}
      <BulkImportModal
        open={importOpen}
        onClose={() => {
          setImportOpen(false);
          loadCustomers();
        }}
      />
    </div>
  );
}

// ── Deleted Customers Table ──────────────────────────────────────────────────
function DeletedCustomersTable({
  customers,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onRecover,
  onManageLinks,
  onPermanentDelete,
  onView,
}: {
  customers: Customer[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onRecover: (c: Customer) => void;
  onManageLinks: (c: Customer) => void;
  onPermanentDelete?: (c: Customer) => void;
  onView: (c: Customer) => void;
}) {
  const allSelected = customers.length > 0 && customers.every((c) => selectedIds.includes(c.id));

  return (
    <div className="rounded-xl overflow-hidden border border-zinc-200 bg-white shadow-xs">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="bg-zinc-50 border-b border-zinc-200">
            <th className="w-10 px-4 py-3 text-center">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleSelectAll}
                className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </th>
            {["Customer Name & Phone", "Address", "Type", "Deleted Date", "Actions"].map((h) => (
              <th key={h} className="px-4 py-3 text-left font-medium text-zinc-500">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {customers.map((c, i) => {
            const isChecked = selectedIds.includes(c.id);
            const displayName = c.name.replace(/\s*\(Deleted\)$/i, "").trim();
            const deletedDateStr = c.deletedAt ? new Date(c.deletedAt).toLocaleDateString("en-IN", {
              day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
            }) : "Recently";

            return (
              <tr
                key={c.id}
                className={`border-b border-zinc-100 transition-colors ${isChecked ? "bg-blue-50/50" : i % 2 === 0 ? "bg-white" : "bg-zinc-50/40"}`}
              >
                <td className="w-10 px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggleSelect(c.id)}
                    className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onView(c)}
                      className="text-left hover:underline font-semibold text-zinc-900"
                    >
                      {displayName}
                    </button>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">
                      Deleted
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 text-zinc-500">
                    <Phone className="w-3 h-3 text-zinc-400" />
                    <span className="text-[12px]">{c.phone}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {c.areaRoute && (
                    <div className="mb-1">
                      <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        Route: {c.areaRoute}
                      </span>
                    </div>
                  )}
                  {c.address ? (
                    <div className="flex items-start gap-1 max-w-[200px]">
                      <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0 text-zinc-400" />
                      <span className="text-[12px] text-zinc-600 line-clamp-2">{c.address}</span>
                    </div>
                  ) : <span className="text-zinc-400">—</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${c.type === "DOMESTIC" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"}`}>
                    {c.type === "DOMESTIC" ? "Regular" : "Commercial"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-zinc-500 text-[12px]">
                    <Clock className="w-3 h-3 text-zinc-400" />
                    <span>{deletedDateStr}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onRecover(c)}
                      title="Restore / Recover Customer"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restore
                    </button>
                    <button
                      onClick={() => onManageLinks(c)}
                      title="Manage Linked Records & Unlink History"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 transition cursor-pointer"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                      Linked Records
                    </button>
                    {onPermanentDelete && (
                      <button
                        onClick={() => onPermanentDelete(c)}
                        title="Permanently Delete from Database"
                        className="p-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Linked History & Unlink Modal ───────────────────────────────────────────
function LinkedHistoryModal({
  customer,
  onClose,
  onReloadCustomerList,
}: {
  customer: Customer;
  onClose: () => void;
  onReloadCustomerList: () => void;
}) {
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [isUnlinkingAll, setIsUnlinkingAll] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    const res = await getCustomerLinkedHistory(customer.id);
    setLoading(false);
    if (res && res.records) {
      setRecords(res.records);
      setTotalCount(res.totalCount);
    }
  }, [customer.id]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  async function handleUnlinkSingle(recordType: any, recordId: string) {
    const ok = await confirm({
      title: "Unlink Record?",
      message: `Unlink this transaction from the customer entity? Its record reference will be archived as "${customer.name.replace(/\s*\(Deleted\)$/i, "").trim()} (Permanently Deleted)" so financial and delivery audits stay 100% accurate while freeing this customer.`,
      confirmText: "Unlink Record",
      cancelText: "Cancel",
    });
    if (!ok) return;

    setUnlinkingId(recordId);
    const res = await unlinkCustomerRecord(recordType, recordId);
    setUnlinkingId(null);

    if (res.success) {
      toast.success("Record unlinked and archived successfully.");
      fetchHistory();
      onReloadCustomerList();
    } else {
      toast.error(res.error || "Failed to unlink record.");
    }
  }

  async function handleUnlinkAll() {
    const cleanName = customer.name.replace(/\s*\(Deleted\)$/i, "").trim();
    const ok = await confirm({
      title: `Unlink All Records for "${cleanName}"?`,
      message: `Are you sure you want to unlink ALL ${totalCount} historical records? Each record will be archived as "${cleanName} (Permanently Deleted)" so all past transactions, invoices, and delivery logs stay preserved. Once unlinked, you can permanently delete this customer.`,
      confirmText: `Unlink All (${totalCount})`,
      cancelText: "Cancel",
      variant: "danger",
    });
    if (!ok) return;

    setIsUnlinkingAll(true);
    const res = await unlinkAllCustomerRecords(customer.id);
    setIsUnlinkingAll(false);

    if (res.success) {
      toast.success(`All ${res.unlinkedCount ?? "historical"} records unlinked successfully! You can now permanently delete this customer.`);
      fetchHistory();
      onReloadCustomerList();
    } else {
      toast.error(res.error || "Failed to unlink records.");
    }
  }

  const cleanCustomerName = customer.name.replace(/\s*\(Deleted\)$/i, "").trim();

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={`Linked Records & History: ${cleanCustomerName}`}
      size="xl"
    >
      <div className="space-y-4">
        {/* Info banner */}
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start justify-between gap-4">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Decouple &amp; Archive System</p>
              <p className="mt-1 text-amber-800">
                This customer is linked to past transactions. Click <strong>&quot;Unlink&quot;</strong> to decouple each record and stamp its name as <em>&quot;{cleanCustomerName} (Permanently Deleted)&quot;</em>. This preserves all financial audits while allowing this customer to be permanently deleted.
              </p>
            </div>
          </div>

          {totalCount > 0 && (
            <button
              onClick={handleUnlinkAll}
              disabled={isUnlinkingAll || loading}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-50 transition shadow-xs flex-shrink-0 cursor-pointer"
            >
              {isUnlinkingAll ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Unlinking All...
                </>
              ) : (
                <>
                  <Unlink className="w-3.5 h-3.5" />
                  Unlink All ({totalCount} Records)
                </>
              )}
            </button>
          )}
        </div>

        {/* Content table */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-zinc-500 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-xs">Loading linked records...</span>
          </div>
        ) : records.length === 0 ? (
          <div className="py-10 text-center rounded-xl bg-emerald-50 border border-emerald-200">
            <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <p className="font-bold text-emerald-900 text-sm">0 Linked Records Remaining</p>
            <p className="text-xs text-emerald-700 mt-1">
              All history has been decoupled. This customer is completely clean and safe to permanently delete!
            </p>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto border border-zinc-200 rounded-xl">
            <table className="w-full text-xs">
              <thead className="bg-zinc-50 sticky top-0 border-b border-zinc-200">
                <tr>
                  <th className="px-3 py-2.5 text-left font-semibold text-zinc-600">Type</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-zinc-600">Date</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-zinc-600">Details</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-zinc-600">Amount / Qty</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-zinc-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {records.map((rec) => (
                  <tr key={`${rec.type}-${rec.id}`} className="hover:bg-zinc-50 transition">
                    <td className="px-3 py-2.5 font-medium text-zinc-800">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">
                        {rec.typeName}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-zinc-500 whitespace-nowrap">
                      {new Date(rec.date).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric"
                      })}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-700 max-w-[280px] truncate" title={rec.details}>
                      {rec.details}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-zinc-900 whitespace-nowrap">
                      {rec.amountOrQty}
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleUnlinkSingle(rec.type, rec.id)}
                        disabled={unlinkingId === rec.id}
                        className="flex items-center gap-1 ml-auto px-2.5 py-1 text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg disabled:opacity-50 transition cursor-pointer"
                      >
                        {unlinkingId === rec.id ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Unlinking...
                          </>
                        ) : (
                          <>
                            <Unlink className="w-3 h-3" />
                            Unlink
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-zinc-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Domestic table ────────────────────────────────────────────────────────────
function DomesticTable({
  customers, selectedIds, onToggleSelect, onToggleSelectAll, onEdit, onToggle, onDelete, onView,
}: {
  customers: Customer[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onEdit: (c: Customer) => void;
  onToggle: (id: string) => void;
  onDelete?: (c: Customer) => void;
  onView: (c: Customer) => void;
}) {
  const allSelected = customers.length > 0 && customers.every((c) => selectedIds.includes(c.id));

  return (
    <div>
      {/* MOBILE STACKED CARDS (<768px) */}
      <div className="block md:hidden space-y-3">
        {customers.map((c) => {
          const isChecked = selectedIds.includes(c.id);
          return (
            <div
              key={`mob-dom-${c.id}`}
              className={`p-4 rounded-xl border transition-all ${
                isChecked
                  ? "border-blue-300 bg-blue-50/40 shadow-xs"
                  : "border-zinc-200 bg-white shadow-xs"
              } space-y-3`}
            >
              <div className="flex items-start gap-3 justify-between">
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggleSelect(c.id)}
                    className="w-4 h-4 mt-0.5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <button
                      onClick={() => onView(c)}
                      className="font-bold text-zinc-900 text-sm text-left hover:underline"
                    >
                      {c.name}
                    </button>
                    {c.customerCode && (
                      <span className="ml-2 font-mono text-[11px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                        #{c.customerCode}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0"
                  style={c.isActive
                    ? { background: "#DCFCE7", color: "#16A34A" }
                    : { background: "#FEE2E2", color: "#DC2626" }}
                >
                  {c.isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  {c.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="space-y-1 text-xs text-zinc-600 pl-6.5">
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-zinc-400" />
                  <a href={`tel:${c.phone}`} className="text-blue-600 hover:underline font-semibold">
                    {c.phone}
                  </a>
                </div>
                {c.areaRoute && (
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                      Route: {c.areaRoute}
                    </span>
                  </div>
                )}
                {c.address && (
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 text-zinc-400 flex-shrink-0" />
                    <span className="line-clamp-2">{c.address}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  onClick={() => onEdit(c)}
                  title="Edit"
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 text-zinc-700 hover:bg-zinc-200 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 inline mr-1" /> Edit
                </button>
                <button
                  onClick={() => onToggle(c.id)}
                  title={c.isActive ? "Deactivate" : "Activate"}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 text-zinc-700 hover:bg-zinc-200 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 inline mr-1" /> {c.isActive ? "Deactivate" : "Activate"}
                </button>
                {onDelete && (
                  <button
                    onClick={() => onDelete(c)}
                    title="Delete"
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* DESKTOP TABLE (>=768px) */}
      <div className="hidden md:block rounded-xl overflow-hidden" style={{ border: "1px solid #E4E4E7" }}>
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ background: "#F8F8F8", borderBottom: "1px solid #E4E4E7" }}>
              <th className="w-10 px-4 py-3 text-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </th>
              {["Name & Phone", "Address & Area", "Connection No.", "Status", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium" style={{ color: "#71717A" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {customers.map((c, i) => {
              const isChecked = selectedIds.includes(c.id);
              return (
                <tr
                  key={c.id}
                  style={{
                    background: isChecked ? "#EFF6FF" : (i % 2 === 0 ? "#FFFFFF" : "#FAFAFA"),
                    borderBottom: "1px solid #F4F4F5",
                  }}
                >
                  <td className="w-10 px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleSelect(c.id)}
                      className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => onView(c)} className="text-left hover:underline font-medium" style={{ color: "#18181B" }}>
                      {c.name}
                    </button>
                    <div className="flex items-center gap-1 mt-0.5" style={{ color: "#71717A" }}>
                      <Phone className="w-3 h-3" />
                      <span className="text-[12px]">{c.phone}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {c.areaRoute && (
                      <div className="mb-1">
                        <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          {c.areaRoute}
                        </span>
                      </div>
                    )}
                    {c.address ? (
                      <div className="flex items-start gap-1 max-w-[200px]">
                        <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0 text-zinc-400" />
                        <span className="text-[12px] line-clamp-2 text-zinc-600">{c.address}</span>
                      </div>
                    ) : <span className="text-zinc-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {c.customerCode ? (
                      <div className="flex items-center gap-1">
                        <Hash className="w-3 h-3" style={{ color: "#A1A1AA" }} />
                        <span className="font-mono text-[12px]" style={{ color: "#2563EB" }}>{c.customerCode}</span>
                      </div>
                    ) : <span style={{ color: "#A1A1AA" }}>Not assigned</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                      style={c.isActive
                        ? { background: "#DCFCE7", color: "#16A34A" }
                        : { background: "#FEE2E2", color: "#DC2626" }}
                    >
                      {c.isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {c.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onEdit(c)}
                        title="Edit"
                        className="btn-action btn-action-primary cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onToggle(c.id)}
                        title={c.isActive ? "Deactivate" : "Activate"}
                        className="btn-action cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      {onDelete && (
                        <button
                          onClick={() => onDelete(c)}
                          title="Delete"
                          className="btn-action btn-action-danger cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Commercial table ──────────────────────────────────────────────────────────
function CommercialTable({
  customers, selectedIds, onToggleSelect, onToggleSelectAll, onEdit, onToggle, onDelete, onView,
}: {
  customers: Customer[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onEdit: (c: Customer) => void;
  onToggle: (id: string) => void;
  onDelete?: (c: Customer) => void;
  onView: (c: Customer) => void;
}) {
  const allSelected = customers.length > 0 && customers.every((c) => selectedIds.includes(c.id));

  return (
    <div>
      {/* MOBILE STACKED CARDS (<768px) */}
      <div className="block md:hidden space-y-3">
        {customers.map((c) => {
          const isChecked = selectedIds.includes(c.id);
          return (
            <div
              key={`mob-com-${c.id}`}
              className={`p-4 rounded-xl border transition-all ${
                isChecked
                  ? "border-blue-300 bg-blue-50/40 shadow-xs"
                  : "border-zinc-200 bg-white shadow-xs"
              } space-y-3`}
            >
              <div className="flex items-start gap-3 justify-between">
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggleSelect(c.id)}
                    className="w-4 h-4 mt-0.5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <button
                      onClick={() => onView(c)}
                      className="font-bold text-zinc-900 text-sm text-left hover:underline"
                    >
                      {c.name}
                    </button>
                    {c.businessType && (
                      <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700">
                        {c.businessType}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0"
                  style={c.isActive
                    ? { background: "#DCFCE7", color: "#16A34A" }
                    : { background: "#FEE2E2", color: "#DC2626" }}
                >
                  {c.isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  {c.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-zinc-600 pl-6.5">
                {c.contactPerson && (
                  <div>
                    <span className="text-[10px] text-zinc-400 block font-semibold uppercase">Contact</span>
                    <span className="font-semibold text-zinc-800">{c.contactPerson}</span>
                  </div>
                )}
                <div>
                  <span className="text-[10px] text-zinc-400 block font-semibold uppercase">Phone</span>
                  <a href={`tel:${c.phone}`} className="text-blue-600 hover:underline font-semibold">
                    {c.phone}
                  </a>
                </div>
              </div>

              {c.areaRoute && (
                <div className="pl-6.5">
                  <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                    Route: {c.areaRoute}
                  </span>
                </div>
              )}

              {(c.gstNumber || c.customerCode) && (
                <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-zinc-50 p-2 rounded-lg ml-6.5">
                  {c.gstNumber && (
                    <div>
                      <span className="text-[10px] text-purple-600 font-sans block">GSTIN</span>
                      <span className="font-semibold">{c.gstNumber}</span>
                    </div>
                  )}
                  {c.customerCode && (
                    <div>
                      <span className="text-[10px] text-blue-600 font-sans block">Reg No</span>
                      <span className="font-semibold">{c.customerCode}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  onClick={() => onEdit(c)}
                  title="Edit"
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 text-zinc-700 hover:bg-zinc-200 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 inline mr-1" /> Edit
                </button>
                <button
                  onClick={() => onToggle(c.id)}
                  title={c.isActive ? "Deactivate" : "Activate"}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 text-zinc-700 hover:bg-zinc-200 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 inline mr-1" /> {c.isActive ? "Deactivate" : "Activate"}
                </button>
                {onDelete && (
                  <button
                    onClick={() => onDelete(c)}
                    title="Delete"
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* DESKTOP TABLE (>=768px) */}
      <div className="hidden md:block rounded-xl overflow-hidden" style={{ border: "1px solid #E4E4E7" }}>
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ background: "#F8F8F8", borderBottom: "1px solid #E4E4E7" }}>
              <th className="w-10 px-4 py-3 text-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </th>
              {["Firm / Business", "Contact", "Area / Route", "GST Number", "Reg. Number", "Type", "Status", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium" style={{ color: "#71717A" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {customers.map((c, i) => {
              const isChecked = selectedIds.includes(c.id);
              return (
                <tr
                  key={c.id}
                  style={{
                    background: isChecked ? "#EFF6FF" : (i % 2 === 0 ? "#FFFFFF" : "#FAFAFA"),
                    borderBottom: "1px solid #F4F4F5",
                  }}
                >
                  <td className="w-10 px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleSelect(c.id)}
                      className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => onView(c)} className="text-left hover:underline font-medium" style={{ color: "#18181B" }}>
                      {c.name}
                    </button>
                    {c.address && (
                      <div className="flex items-center gap-1 mt-0.5" style={{ color: "#71717A" }}>
                        <MapPin className="w-3 h-3" />
                        <span className="text-[12px] truncate max-w-[160px]">{c.address}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      {c.contactPerson && (
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" style={{ color: "#A1A1AA" }} />
                          <span style={{ color: "#52525B" }}>{c.contactPerson}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" style={{ color: "#A1A1AA" }} />
                        <span className="text-[12px]" style={{ color: "#71717A" }}>{c.phone}</span>
                      </div>
                      {c.email && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3" style={{ color: "#A1A1AA" }} />
                          <span className="text-[12px]" style={{ color: "#71717A" }}>{c.email}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {c.areaRoute ? (
                      <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        {c.areaRoute}
                      </span>
                    ) : <span style={{ color: "#A1A1AA" }}>—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {c.gstNumber ? (
                      <span className="font-mono text-[12px]" style={{ color: "#7C3AED" }}>{c.gstNumber}</span>
                    ) : <span style={{ color: "#A1A1AA" }}>—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {c.customerCode ? (
                      <div className="flex items-center gap-1">
                        <Hash className="w-3 h-3" style={{ color: "#A1A1AA" }} />
                        <span className="font-mono text-[12px]" style={{ color: "#2563EB" }}>{c.customerCode}</span>
                      </div>
                    ) : <span style={{ color: "#A1A1AA" }}>—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {c.businessType ? (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-700">
                        {c.businessType}
                      </span>
                    ) : <span style={{ color: "#A1A1AA" }}>—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                      style={c.isActive
                        ? { background: "#DCFCE7", color: "#16A34A" }
                        : { background: "#FEE2E2", color: "#DC2626" }}
                    >
                      {c.isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {c.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onEdit(c)}
                        title="Edit"
                        className="btn-action btn-action-primary cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onToggle(c.id)}
                        title={c.isActive ? "Deactivate" : "Activate"}
                        className="btn-action cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      {onDelete && (
                        <button
                          onClick={() => onDelete(c)}
                          title="Delete"
                          className="btn-action btn-action-danger cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Domestic Form ─────────────────────────────────────────────────────────────
function DomesticForm({ defaults }: { defaults?: Customer }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} style={labelStyle}>Full Name *</label>
          <input
            type="text"
            name="name"
            defaultValue={defaults?.name || ""}
            required
            placeholder="e.g. Ramesh Kumar"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>Phone / Mobile Number *</label>
          <input
            type="tel"
            name="phone"
            defaultValue={defaults?.phone || ""}
            required
            placeholder="e.g. 9876543210"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} style={labelStyle}>Consumer Number *</label>
          <input
            type="text"
            name="customerCode"
            defaultValue={defaults?.customerCode || ""}
            required
            placeholder="e.g. 20111815"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>Area / Route (optional)</label>
          <input
            type="text"
            name="areaRoute"
            defaultValue={defaults?.areaRoute || ""}
            placeholder="e.g. 41-Shirpur Harshal, 72-ABG 22"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass} style={labelStyle}>Email (optional)</label>
        <input
          type="email"
          name="email"
          defaultValue={defaults?.email || ""}
          placeholder="e.g. ramesh@example.com"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass} style={labelStyle}>Delivery Address *</label>
        <textarea
          name="address"
          defaultValue={defaults?.address || ""}
          required
          rows={2}
          placeholder="House no., Street, Area, Landmark..."
          className={`${inputClass} resize-none`}
        />
      </div>
    </div>
  );
}

// ── Commercial Form ───────────────────────────────────────────────────────────
function CommercialForm({ defaults }: { defaults?: Customer }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} style={labelStyle}>Business / Firm Name *</label>
          <input
            type="text"
            name="name"
            defaultValue={defaults?.name || ""}
            required
            placeholder="e.g. Hotel Grand Plaza"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>Business Type *</label>
          <select
            name="businessType"
            defaultValue={defaults?.businessType || ""}
            required
            className={inputClass}
          >
            <option value="">Select type...</option>
            {BUSINESS_TYPES.map((bt) => (
              <option key={bt} value={bt}>{bt}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} style={labelStyle}>Contact Person</label>
          <input
            type="text"
            name="contactPerson"
            defaultValue={defaults?.contactPerson || ""}
            placeholder="e.g. Manager Name"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>Phone / Mobile Number *</label>
          <input
            type="tel"
            name="phone"
            defaultValue={defaults?.phone || ""}
            required
            placeholder="e.g. 9876543210"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} style={labelStyle}>Commercial Registration Number *</label>
          <input
            type="text"
            name="customerCode"
            defaultValue={defaults?.customerCode || ""}
            required
            placeholder="e.g. 20111815 / COM-0012"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>Area / Route (optional)</label>
          <input
            type="text"
            name="areaRoute"
            defaultValue={defaults?.areaRoute || ""}
            placeholder="e.g. 41-Shirpur Harshal, 72-ABG 22"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} style={labelStyle}>GST Number (optional)</label>
          <input
            type="text"
            name="gstNumber"
            defaultValue={defaults?.gstNumber || ""}
            placeholder="e.g. 27AAAAA0000A1Z5"
            className={`${inputClass} uppercase`}
          />
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>Email (optional)</label>
          <input
            type="email"
            name="email"
            defaultValue={defaults?.email || ""}
            placeholder="e.g. firm@example.com"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass} style={labelStyle}>Business Address *</label>
        <textarea
          name="address"
          defaultValue={defaults?.address || ""}
          required
          rows={2}
          placeholder="Shop / Plot no., Street, Area..."
          className={`${inputClass} resize-none`}
        />
      </div>
    </div>
  );
}

// ── Customer Detail View ──────────────────────────────────────────────────────
function CustomerDetailView({ customer }: { customer: Customer }) {
  const isDomestic = customer.type === "DOMESTIC";
  const displayName = customer.name.replace(/\s*\(Deleted\)$/i, "").trim();

  return (
    <div className="space-y-4 text-[13px]">
      <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 border border-zinc-200">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-base flex-shrink-0"
          style={{ background: isDomestic ? "#2563EB" : "#7C3AED" }}
        >
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-bold text-zinc-900 text-sm">{displayName}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${isDomestic ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}`}>
              {isDomestic ? "Regular Customer" : `Commercial (${customer.businessType || "Business"})`}
            </span>
            {customer.areaRoute && (
              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                Route: {customer.areaRoute}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-100">
          <p className="text-[11px] text-zinc-400 font-medium">Mobile / Phone</p>
          <a href={`tel:${customer.phone}`} className="font-semibold text-blue-600 hover:underline">{customer.phone}</a>
        </div>
        <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-100">
          <p className="text-[11px] text-zinc-400 font-medium">{isDomestic ? "Consumer No." : "Reg. Number"}</p>
          <p className="font-mono font-semibold text-zinc-900">{customer.customerCode || "—"}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-100">
          <p className="text-[11px] text-zinc-400 font-medium">Area / Route</p>
          <p className="font-semibold text-zinc-800">{customer.areaRoute || "—"}</p>
        </div>
        {!isDomestic && customer.gstNumber ? (
          <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-100">
            <p className="text-[11px] text-zinc-400 font-medium">GSTIN</p>
            <p className="font-mono font-semibold text-purple-700">{customer.gstNumber}</p>
          </div>
        ) : (
          <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-100">
            <p className="text-[11px] text-zinc-400 font-medium">Status</p>
            <p className="font-semibold text-zinc-800">{customer.isActive ? "Active" : "Inactive"}</p>
          </div>
        )}
      </div>

      {customer.address && (
        <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-100">
          <p className="text-[11px] text-zinc-400 font-medium">Delivery Address</p>
          <p className="text-zinc-800">{customer.address}</p>
        </div>
      )}
    </div>
  );
}
