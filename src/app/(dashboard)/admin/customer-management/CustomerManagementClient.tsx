"use client";

import { useState, useTransition } from "react";
import {
  createCustomer,
  updateCustomer,
  toggleCustomerStatus,
  deleteCustomer,
} from "@/app/actions/customers";
import { Modal } from "@/components/ui/Modal";
import {
  Plus, Search, Edit2, Trash2, Users, Phone, MapPin,
  Building2, User, FileText, CheckCircle, XCircle, Hash,
  Mail, CreditCard, RefreshCw,
} from "lucide-react";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  type: "DOMESTIC" | "COMMERCIAL";
  customerCode: string | null;
  email: string | null;
  gstNumber: string | null;
  contactPerson: string | null;
  businessType: string | null;
  isActive: boolean;
  createdAt: string;
}

interface Props {
  initialCustomers: Customer[];
  canDelete: boolean;
}

const BUSINESS_TYPES = [
  "Hotel", "Restaurant", "Dhaba", "School", "College", "Hospital",
  "Bakery", "Canteen", "Factory", "Caterer", "Other",
];

const inputClass = "input";
const inputStyle = {};
const labelClass = "block text-[12px] font-medium mb-1";
const labelStyle = { color: "var(--color-text-secondary)" };

function EmptyState({ type }: { type: "DOMESTIC" | "COMMERCIAL" }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
        style={{ background: "#F4F4F5" }}
      >
        {type === "DOMESTIC" ? (
          <User className="w-7 h-7" style={{ color: "#A1A1AA" }} />
        ) : (
          <Building2 className="w-7 h-7" style={{ color: "#A1A1AA" }} />
        )}
      </div>
      <p className="text-[14px] font-medium" style={{ color: "#52525B" }}>
        No {type === "DOMESTIC" ? "regular" : "commercial"} customers yet
      </p>
      <p className="text-[12px] mt-1" style={{ color: "#A1A1AA" }}>
        Add your first {type === "DOMESTIC" ? "domestic connection holder" : "commercial establishment"}
      </p>
    </div>
  );
}

export function CustomerManagementClient({ initialCustomers, canDelete }: Props) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [activeTab, setActiveTab] = useState<"DOMESTIC" | "COMMERCIAL">("DOMESTIC");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Modal states
  const [addOpen, setAddOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);

  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [, startTransition] = useTransition();

  const domestic = customers.filter((c) => c.type === "DOMESTIC");
  const commercial = customers.filter((c) => c.type === "COMMERCIAL");
  const activeCount = customers.filter((c) => c.isActive).length;
  const inactiveCount = customers.filter((c) => !c.isActive).length;

  const filtered = customers.filter((c) => {
    if (c.type !== activeTab) return false;
    if (statusFilter !== "ALL") {
      if (statusFilter === "ACTIVE" && !c.isActive) return false;
      if (statusFilter === "INACTIVE" && c.isActive) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.customerCode ?? "").toLowerCase().includes(q) ||
        (c.contactPerson ?? "").toLowerCase().includes(q) ||
        (c.businessType ?? "").toLowerCase().includes(q) ||
        (c.gstNumber ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  // ── Add customer ──────────────────────────────────────────────────────────
  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);
    const fd = new FormData(e.currentTarget);
    fd.set("type", activeTab);
    startTransition(async () => {
      const res = await createCustomer(fd);
      setFormLoading(false);
      if ("error" in res) { setFormError(res.error ?? "Something went wrong"); return; }
      setCustomers((prev) => [res.customer as unknown as Customer, ...prev]);
      setAddOpen(false);
    });
  }

  // ── Edit customer ─────────────────────────────────────────────────────────
  function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editCustomer) return;
    setFormError("");
    setFormLoading(true);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateCustomer(editCustomer.id, fd);
      setFormLoading(false);
      if ("error" in res) { setFormError(res.error ?? "Something went wrong"); return; }
      setCustomers((prev) =>
        prev.map((c) => (c.id === editCustomer.id ? { ...c, ...(res.customer as unknown as Customer) } : c))
      );
      setEditCustomer(null);
    });
  }

  // ── Toggle status ─────────────────────────────────────────────────────────
  function handleToggle(id: string) {
    startTransition(async () => {
      const res = await toggleCustomerStatus(id);
      if ("error" in res) return;
      setCustomers((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isActive: !c.isActive } : c))
      );
    });
  }

  // ── Delete customer ───────────────────────────────────────────────────────
  function handleDelete() {
    if (!deleteTarget) return;
    setFormLoading(true);
    startTransition(async () => {
      const res = await deleteCustomer(deleteTarget.id);
      setFormLoading(false);
      if ("error" in res) { setFormError(res.error ?? "Something went wrong"); return; }
      setCustomers((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    });
  }

  const addTypeLabel = activeTab === "DOMESTIC" ? "Regular Customer" : "Commercial Customer";

  return (
    <div>
      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-3 mb-5 sm:grid-cols-4">
        {[
          { label: "Regular Customers", value: domestic.length, color: "#2563EB", icon: <User className="w-4 h-4" /> },
          { label: "Commercial Customers", value: commercial.length, color: "#7C3AED", icon: <Building2 className="w-4 h-4" /> },
          { label: "Active", value: activeCount, color: "#16A34A", icon: <CheckCircle className="w-4 h-4" /> },
          { label: "Inactive", value: inactiveCount, color: "#DC2626", icon: <XCircle className="w-4 h-4" /> },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl px-4 py-3 flex items-center gap-3"
            style={{ background: "#F8F8F8", border: "1px solid #E4E4E7" }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: s.color + "18", color: s.color }}>
              {s.icon}
            </div>
            <div>
              <p className="text-[20px] font-bold leading-none" style={{ color: "#18181B" }}>{s.value}</p>
              <p className="text-[11px] mt-0.5" style={{ color: "#71717A" }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 p-1 rounded-xl w-fit" style={{ background: "#F4F4F5" }}>
        {(["DOMESTIC", "COMMERCIAL"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[13px] font-medium transition-all"
            style={
              activeTab === tab
                ? { background: "#FFFFFF", color: "#18181B", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }
                : { color: "#71717A" }
            }
          >
            {tab === "DOMESTIC" ? <User className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
            {tab === "DOMESTIC" ? "Regular Customers" : "Commercial Customers"}
            <span
              className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ background: activeTab === tab ? "#EFF6FF" : "#E4E4E7", color: activeTab === tab ? "#2563EB" : "#71717A" }}
            >
              {tab === "DOMESTIC" ? domestic.length : commercial.length}
            </span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#A1A1AA" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={activeTab === "DOMESTIC" ? "Search by name, phone, connection no..." : "Search by name, phone, GST, reg no..."}
            className="w-full pl-9 pr-3 py-2 rounded-lg text-[13px] border outline-none focus:border-blue-400"
            style={{ borderColor: "#D4D4D8", background: "#FAFAFA" }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="px-3 py-2 rounded-lg text-[13px] border outline-none"
          style={{ borderColor: "#D4D4D8", background: "#FAFAFA", color: "#18181B" }}
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <button
          onClick={() => { setFormError(""); setAddOpen(true); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium text-white transition-colors hover:opacity-90"
          style={{ background: "#2563EB" }}
        >
          <Plus className="w-4 h-4" />
          Add {addTypeLabel}
        </button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState type={activeTab} />
      ) : activeTab === "DOMESTIC" ? (
        <DomesticTable
          customers={filtered}
          onEdit={(c) => { setFormError(""); setEditCustomer(c); }}
          onToggle={handleToggle}
          onDelete={canDelete ? (c) => { setFormError(""); setDeleteTarget(c); } : undefined}
          onView={setViewCustomer}
        />
      ) : (
        <CommercialTable
          customers={filtered}
          onEdit={(c) => { setFormError(""); setEditCustomer(c); }}
          onToggle={handleToggle}
          onDelete={canDelete ? (c) => { setFormError(""); setDeleteTarget(c); } : undefined}
          onView={setViewCustomer}
        />
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
            <div className="px-3 py-2 rounded-lg text-[12px]" style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FCA5A5" }}>
              {formError}
            </div>
          )}
          {activeTab === "DOMESTIC" ? (
            <DomesticForm />
          ) : (
            <CommercialForm />
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setAddOpen(false)}
              className="flex-1 py-2 rounded-lg text-[13px] font-medium border transition-colors hover:bg-zinc-50"
              style={{ borderColor: "#D4D4D8", color: "#52525B" }}>
              Cancel
            </button>
            <button type="submit" disabled={formLoading}
              className="flex-1 py-2 rounded-lg text-[13px] font-medium text-white transition-colors disabled:opacity-60"
              style={{ background: "#2563EB" }}>
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
              <div className="px-3 py-2 rounded-lg text-[12px]" style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FCA5A5" }}>
                {formError}
              </div>
            )}
            {editCustomer.type === "DOMESTIC" ? (
              <DomesticForm defaults={editCustomer} />
            ) : (
              <CommercialForm defaults={editCustomer} />
            )}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setEditCustomer(null)}
                className="flex-1 py-2 rounded-lg text-[13px] font-medium border transition-colors hover:bg-zinc-50"
                style={{ borderColor: "#D4D4D8", color: "#52525B" }}>
                Cancel
              </button>
              <button type="submit" disabled={formLoading}
                className="flex-1 py-2 rounded-lg text-[13px] font-medium text-white transition-colors disabled:opacity-60"
                style={{ background: "#2563EB" }}>
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

      {/* ── Delete Confirm ─────────────────────────────────────────────────── */}
      <Modal
        open={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setFormError(""); }}
        title="Delete Customer"
        size="sm"
      >
        {deleteTarget && (
          <div>
            {formError && (
              <div className="mb-3 px-3 py-2 rounded-lg text-[12px]" style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FCA5A5" }}>
                {formError}
              </div>
            )}
            <p className="text-[13px] mb-4" style={{ color: "#52525B" }}>
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This cannot be undone. Customers with existing records cannot be deleted.
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 rounded-lg text-[13px] font-medium border"
                style={{ borderColor: "#D4D4D8", color: "#52525B" }}>
                Cancel
              </button>
              <button type="button" onClick={handleDelete} disabled={formLoading}
                className="flex-1 py-2 rounded-lg text-[13px] font-medium text-white disabled:opacity-60"
                style={{ background: "#DC2626" }}>
                {formLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── Domestic table ────────────────────────────────────────────────────────────
function DomesticTable({
  customers, onEdit, onToggle, onDelete, onView,
}: {
  customers: Customer[];
  onEdit: (c: Customer) => void;
  onToggle: (id: string) => void;
  onDelete?: (c: Customer) => void;
  onView: (c: Customer) => void;
}) {
  return (
    <div>
      {/* MOBILE STACKED CARDS (<768px) */}
      <div className="block md:hidden space-y-3">
        {customers.map((c) => (
          <div
            key={`mob-dom-${c.id}`}
            className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <button
                  onClick={() => onView(c)}
                  className="font-bold text-zinc-900 dark:text-zinc-100 text-sm text-left hover:underline"
                >
                  {c.name}
                </button>
                <div className="flex items-center gap-1 text-xs text-zinc-500 mt-0.5">
                  <Phone className="w-3 h-3 text-zinc-400" />
                  <a href={`tel:${c.phone}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                    {c.phone}
                  </a>
                </div>
              </div>
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={c.isActive
                  ? { background: "#DCFCE7", color: "#16A34A" }
                  : { background: "#FEE2E2", color: "#DC2626" }}
              >
                {c.isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                {c.isActive ? "Active" : "Inactive"}
              </span>
            </div>

            {c.address && (
              <div className="flex items-start gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                <MapPin className="w-3.5 h-3.5 mt-0.5 text-zinc-400 shrink-0" />
                <span>{c.address}</span>
              </div>
            )}

            {c.customerCode && (
              <div className="flex items-center gap-1.5 text-xs font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 p-2 rounded-lg border border-blue-100 dark:border-blue-900/40">
                <Hash className="w-3.5 h-3.5 text-blue-500" />
                <span>Connection: {c.customerCode}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={() => onEdit(c)}
                title="Edit"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200"
              >
                <Edit2 className="w-3.5 h-3.5 inline mr-1" /> Edit
              </button>
              <button
                onClick={() => onToggle(c.id)}
                title={c.isActive ? "Deactivate" : "Activate"}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200"
              >
                <RefreshCw className="w-3.5 h-3.5 inline mr-1" /> {c.isActive ? "Deactivate" : "Activate"}
              </button>
              {onDelete && (
                <button
                  onClick={() => onDelete(c)}
                  title="Delete"
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* DESKTOP TABLE (>=768px) */}
      <div className="hidden md:block rounded-xl overflow-hidden" style={{ border: "1px solid #E4E4E7" }}>
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ background: "#F8F8F8", borderBottom: "1px solid #E4E4E7" }}>
              {["Name & Phone", "Address", "Connection No.", "Status", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium" style={{ color: "#71717A" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {customers.map((c, i) => (
              <tr
                key={c.id}
                style={{ background: i % 2 === 0 ? "#FFFFFF" : "#FAFAFA", borderBottom: "1px solid #F4F4F5" }}
              >
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
                  {c.address ? (
                    <div className="flex items-start gap-1 max-w-[180px]">
                      <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: "#A1A1AA" }} />
                      <span className="text-[12px] line-clamp-2" style={{ color: "#52525B" }}>{c.address}</span>
                    </div>
                  ) : <span style={{ color: "#A1A1AA" }}>—</span>}
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
                      className="btn-action btn-action-primary"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onToggle(c.id)}
                      title={c.isActive ? "Deactivate" : "Activate"}
                      className="btn-action"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    {onDelete && (
                      <button
                        onClick={() => onDelete(c)}
                        title="Delete"
                        className="btn-action btn-action-danger"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Commercial table ──────────────────────────────────────────────────────────
function CommercialTable({
  customers, onEdit, onToggle, onDelete, onView,
}: {
  customers: Customer[];
  onEdit: (c: Customer) => void;
  onToggle: (id: string) => void;
  onDelete?: (c: Customer) => void;
  onView: (c: Customer) => void;
}) {
  return (
    <div>
      {/* MOBILE STACKED CARDS (<768px) */}
      <div className="block md:hidden space-y-3">
        {customers.map((c) => (
          <div
            key={`mob-com-${c.id}`}
            className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <button
                  onClick={() => onView(c)}
                  className="font-bold text-zinc-900 dark:text-zinc-100 text-sm text-left hover:underline"
                >
                  {c.name}
                </button>
                {c.businessType && (
                  <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700">
                    {c.businessType}
                  </span>
                )}
              </div>
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={c.isActive
                  ? { background: "#DCFCE7", color: "#16A34A" }
                  : { background: "#FEE2E2", color: "#DC2626" }}
              >
                {c.isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                {c.isActive ? "Active" : "Inactive"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-zinc-600 dark:text-zinc-400">
              {c.contactPerson && (
                <div>
                  <span className="text-[10px] text-zinc-400 block font-semibold uppercase">Contact</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">{c.contactPerson}</span>
                </div>
              )}
              <div>
                <span className="text-[10px] text-zinc-400 block font-semibold uppercase">Phone</span>
                <a href={`tel:${c.phone}`} className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
                  {c.phone}
                </a>
              </div>
            </div>

            {(c.gstNumber || c.customerCode) && (
              <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded-lg">
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

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={() => onEdit(c)}
                title="Edit"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200"
              >
                <Edit2 className="w-3.5 h-3.5 inline mr-1" /> Edit
              </button>
              <button
                onClick={() => onToggle(c.id)}
                title={c.isActive ? "Deactivate" : "Activate"}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200"
              >
                <RefreshCw className="w-3.5 h-3.5 inline mr-1" /> {c.isActive ? "Deactivate" : "Activate"}
              </button>
              {onDelete && (
                <button
                  onClick={() => onDelete(c)}
                  title="Delete"
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* DESKTOP TABLE (>=768px) */}
      <div className="hidden md:block rounded-xl overflow-hidden" style={{ border: "1px solid #E4E4E7" }}>
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ background: "#F8F8F8", borderBottom: "1px solid #E4E4E7" }}>
              {["Firm / Business", "Contact", "GST Number", "Reg. Number", "Type", "Status", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium" style={{ color: "#71717A" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {customers.map((c, i) => (
              <tr
                key={c.id}
                style={{ background: i % 2 === 0 ? "#FFFFFF" : "#FAFAFA", borderBottom: "1px solid #F4F4F5" }}
              >
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
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                      style={{ background: "#F3F4F6", color: "#374151" }}>
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
                      className="btn-action btn-action-primary"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onToggle(c.id)}
                      title={c.isActive ? "Deactivate" : "Activate"}
                      className="btn-action"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    {onDelete && (
                      <button
                        onClick={() => onDelete(c)}
                        title="Delete"
                        className="btn-action btn-action-danger"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Domestic form ─────────────────────────────────────────────────────────────
function DomesticForm({ defaults }: { defaults?: Partial<Customer> }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass} style={labelStyle}>
            Customer Name <span style={{ color: "#DC2626" }}>*</span>
          </label>
          <input name="name" defaultValue={defaults?.name ?? ""} required
            className={inputClass} style={inputStyle} placeholder="Full name" />
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>
            Phone Number <span style={{ color: "#DC2626" }}>*</span>
          </label>
          <input name="phone" defaultValue={defaults?.phone ?? ""} required
            className={inputClass} style={inputStyle} placeholder="Mobile number" />
        </div>
      </div>
      <div>
        <label className={labelClass} style={labelStyle}>
          Address <span style={{ color: "#DC2626" }}>*</span>
        </label>
        <textarea name="address" defaultValue={defaults?.address ?? ""} rows={2} required
          className={inputClass} style={inputStyle} placeholder="Full address (area, street, landmark)" />
      </div>
      <div>
        <label className={labelClass} style={labelStyle}>
          Consumer Number  <span style={{ color: "#DC2626" }}>*</span>
          <span className="ml-1 text-[11px] font-normal" style={{ color: "#A1A1AA" }}>
            (Number provided by gas company on registration paper)
          </span>
        </label>
        <div className="relative">
          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#A1A1AA" }} />
          <input name="customerCode" defaultValue={defaults?.customerCode ?? ""} required
            className={inputClass} style={{ ...inputStyle, paddingLeft: "2rem" }}
            placeholder="e.g. 1234567890" />
        </div>
        <p className="text-[11px] mt-1" style={{ color: "#A1A1AA" }}>
          This is the unique consumer/connection number issued by the gas company to this household.
        </p>
      </div>
    </div>
  );
}

// ── Commercial form ───────────────────────────────────────────────────────────
function CommercialForm({ defaults }: { defaults?: Partial<Customer> }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass} style={labelStyle}>
            Firm / Business Name <span style={{ color: "#DC2626" }}>*</span>
          </label>
          <input name="name" defaultValue={defaults?.name ?? ""} required
            className={inputClass} style={inputStyle} placeholder="Hotel / Restaurant / School name" />
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>
            Business Type <span style={{ color: "#DC2626" }}>*</span>
          </label>
          <select name="businessType" defaultValue={defaults?.businessType ?? ""} required
            className={inputClass} style={inputStyle}>
            <option value="">Select type</option>
            {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass} style={labelStyle}>
            Contact Person <span style={{ color: "#DC2626" }}>*</span>
          </label>
          <input name="contactPerson" defaultValue={defaults?.contactPerson ?? ""} required
            className={inputClass} style={inputStyle} placeholder="Owner / Manager name" />
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>
            Phone Number <span style={{ color: "#DC2626" }}>*</span>
          </label>
          <input name="phone" defaultValue={defaults?.phone ?? ""} required
            className={inputClass} style={inputStyle} placeholder="Mobile number" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass} style={labelStyle}>Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#A1A1AA" }} />
            <input name="email" type="email" defaultValue={defaults?.email ?? ""}
              className={inputClass} style={{ ...inputStyle, paddingLeft: "2rem" }}
              placeholder="business@email.com" />
          </div>
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>GST Number</label>
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#A1A1AA" }} />
            <input name="gstNumber" defaultValue={defaults?.gstNumber ?? ""}
              className={inputClass} style={{ ...inputStyle, paddingLeft: "2rem" }}
              placeholder="e.g. 22AAAAA0000A1Z5" />
          </div>
        </div>
      </div>
      <div>
        <label className={labelClass} style={labelStyle}>
          Address <span style={{ color: "#DC2626" }}>*</span>
        </label>
        <textarea name="address" defaultValue={defaults?.address ?? ""} rows={2} required
          className={inputClass} style={inputStyle} placeholder="Full business address" />
      </div>
      <div>
        <label className={labelClass} style={labelStyle}>
          Consumer Number <span style={{ color: "#DC2626" }}>*</span>
          <span className="ml-1 text-[11px] font-normal" style={{ color: "#A1A1AA" }}>
            (Number on agency paper provided by gas company)
          </span>
        </label>
        <div className="relative">
          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#A1A1AA" }} />
          <input name="customerCode" defaultValue={defaults?.customerCode ?? ""} required
            className={inputClass} style={{ ...inputStyle, paddingLeft: "2rem" }}
            placeholder="Commercial account / registration number" />
        </div>
        <p className="text-[11px] mt-1" style={{ color: "#A1A1AA" }}>
          This number appears on the agency paper / registration document issued by the gas company for commercial accounts.
        </p>
      </div>
    </div>
  );
}

// ── Detail view ───────────────────────────────────────────────────────────────
function CustomerDetailView({ customer: c }: { customer: Customer }) {
  const isDomestic = c.type === "DOMESTIC";
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-[15px] font-bold text-white"
          style={{ background: isDomestic ? "#2563EB" : "#7C3AED" }}>
          {c.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-[15px]" style={{ color: "#18181B" }}>{c.name}</p>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium mt-1"
            style={isDomestic ? { background: "#EFF6FF", color: "#2563EB" } : { background: "#F5F3FF", color: "#7C3AED" }}>
            {isDomestic ? <User className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
            {isDomestic ? "Regular Customer" : "Commercial Customer"}
          </span>
        </div>
        <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
          style={c.isActive ? { background: "#DCFCE7", color: "#16A34A" } : { background: "#FEE2E2", color: "#DC2626" }}>
          {c.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #E4E4E7" }}>
        {[
          { icon: <Phone className="w-3.5 h-3.5" />, label: "Phone", value: c.phone },
          c.address ? { icon: <MapPin className="w-3.5 h-3.5" />, label: "Address", value: c.address } : null,
          c.customerCode ? {
            icon: <Hash className="w-3.5 h-3.5" />,
            label: isDomestic ? "Connection Number" : "Registration Number",
            value: c.customerCode,
            mono: true,
          } : null,
          !isDomestic && c.contactPerson ? { icon: <User className="w-3.5 h-3.5" />, label: "Contact Person", value: c.contactPerson } : null,
          !isDomestic && c.businessType ? { icon: <Building2 className="w-3.5 h-3.5" />, label: "Business Type", value: c.businessType } : null,
          !isDomestic && c.email ? { icon: <Mail className="w-3.5 h-3.5" />, label: "Email", value: c.email } : null,
          !isDomestic && c.gstNumber ? { icon: <CreditCard className="w-3.5 h-3.5" />, label: "GST Number", value: c.gstNumber, mono: true } : null,
        ].filter(Boolean).map((row, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-2.5"
            style={{ borderBottom: "1px solid #F4F4F5", background: i % 2 === 0 ? "#FAFAFA" : "#FFFFFF" }}>
            <span className="mt-0.5 flex-shrink-0" style={{ color: "#A1A1AA" }}>{row!.icon}</span>
            <span className="text-[12px] w-32 flex-shrink-0" style={{ color: "#71717A" }}>{row!.label}</span>
            <span className={`text-[13px] font-medium ${row!.mono ? "font-mono" : ""}`} style={{ color: "#18181B" }}>
              {row!.value}
            </span>
          </div>
        ))}
      </div>

      <p className="text-[11px]" style={{ color: "#A1A1AA" }}>
        Registered: {new Date(c.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
      </p>
    </div>
  );
}
