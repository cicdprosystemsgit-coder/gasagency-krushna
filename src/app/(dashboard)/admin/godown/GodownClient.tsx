"use client";

import { useState, useTransition, useCallback, useMemo, Fragment } from "react";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StatsCard } from "@/components/ui/StatsCard";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { formatDateTime } from "@/lib/utils";
import {
  Plus,
  Minus,
  Truck,
  Package,
  ArrowUpDown,
  CheckCircle2,
  LogIn,
  LogOut,
  X,
  Trash2,
  Search,
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  FileText,
  AlertCircle,
  HelpCircle,
  Check,
} from "lucide-react";
import { createGodownEntry, recordGodownExit, approveGodownRecord, addCylinderType } from "@/app/actions/godown";

/* â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

interface CylinderItem {
  id: string;
  productId: string;
  productName: string;
  qty: number;
}
interface Product {
  id: string;
  name: string;
}

interface GodownRecord {
  id: string;
  vehicleNo: string;
  entryDate: Date | string;
  filledCylindersReceived: number;
  emptyCylindersReturned: number;
  items: unknown;
  notes: string | null;
  status: string;
  submittedBy: { name: string };
}

interface GodownClientProps {
  initialRecords: GodownRecord[];
  totalFilled: number;
  totalEmpty: number;
  isAdmin: boolean;
  userId: string;
  cylinderTypes: Product[];
}

/* â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function hasExited(r: GodownRecord): boolean {
  const it = r.items as any;
  // Only consider exited if there is an explicit exitDate stored in the JSON
  // (emptyCylindersReturned alone is unreliable for legacy records)
  if (it && !Array.isArray(it) && it.exitDate) return true;
  return false;
}

function getExitDate(r: GodownRecord): string | null {
  const it = r.items as any;
  if (it && !Array.isArray(it) && it.exitDate) return it.exitDate;
  return null;
}

function getExitNotes(r: GodownRecord): string | null {
  const it = r.items as any;
  if (it && !Array.isArray(it) && it.exitNotes) return it.exitNotes;
  return null;
}

function getEntryItems(r: GodownRecord): CylinderItem[] {
  const it = r.items as any;
  if (it && !Array.isArray(it) && Array.isArray(it.entryItems)) return it.entryItems;
  return [];
}

function getExitItems(r: GodownRecord): CylinderItem[] {
  const it = r.items as any;
  if (it && !Array.isArray(it) && Array.isArray(it.exitItems)) return it.exitItems;
  return [];
}

function makeId() {
  return Math.random().toString(36).slice(2);
}

function newRow(products: Product[]): CylinderItem {
  const p = products[0];
  return { id: makeId(), productId: p?.id ?? "", productName: p?.name ?? "", qty: 10 }; // Default qty to 10 for convenience
}

/* â”€â”€ Cylinders Mini-Table Editor (Professional Grid) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function CylinderRows({
  items,
  products,
  onChange,
  onAddType,
  label,
}: {
  items: CylinderItem[];
  products: Product[];
  onChange: (rows: CylinderItem[]) => void;
  onAddType: (cb: (p: Product) => void) => void;
  label: string;
}) {
  function updateRow(id: string, field: keyof CylinderItem, value: string | number) {
    onChange(
      items.map((r) => {
        if (r.id !== id) return r;
        if (field === "productId") {
          const p = products.find((x) => x.id === value);
          return { ...r, productId: p?.id ?? "", productName: p?.name ?? "" };
        }
        return { ...r, [field]: field === "qty" ? Math.max(0, Number(value)) : value };
      })
    );
  }

  const total = items.reduce((s, r) => s + r.qty, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b pb-2">
        <label className="text-[12px] font-bold tracking-wider uppercase text-slate-500 flex items-center gap-1.5">
          {label && (
            <>
              <span>{label}</span>
              <span title="Add all products that need to be tracked on this vehicle log">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              </span>
            </>
          )}
        </label>
        <button
          type="button"
          onClick={() => onChange([...items, newRow(products)])}
          className="flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all border shadow-sm cursor-pointer"
          style={{ background: "#EFF6FF", color: "#2563EB", borderColor: "#BFDBFE" }}
        >
          <Plus className="w-3.5 h-3.5" /> Add Cylinder Type
        </button>
      </div>

      {items.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center p-8 rounded-xl border border-dashed text-center"
          style={{ borderColor: "#E2E8F0", background: "#F8FAFC" }}
        >
          <AlertCircle className="w-6 h-6 mb-2 text-slate-400 animate-pulse" />
          <p className="text-[13px] font-medium text-slate-500">No cylinder types added yet</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Click the "Add Cylinder Type" button to register cylinders to this vehicle.</p>
        </div>
      ) : (
        <div className="border rounded-xl overflow-visible shadow-xs bg-white">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b" style={{ borderColor: "#E2E8F0" }}>
                <th className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Cylinder Product Type</th>
                <th className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center w-36">Quantity</th>
                <th className="py-2.5 px-3 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-2.5">
                    <CustomSelect
                      value={row.productId}
                      onChange={(val) => {
                        updateRow(row.id, "productId", val);
                      }}
                      options={products.map((p) => ({ value: p.id, label: p.name }))}
                      placeholder="Select Type..."
                      onAddClick={() => {
                        onAddType((p) => {
                          onChange(
                            items.map((r) =>
                              r.id === row.id ? { ...r, productId: p.id, productName: p.name } : r
                            )
                          );
                        });
                      }}
                      addLabel="+ Add New Type..."
                    />
                  </td>
                  <td className="p-2.5">
                    <div className="flex items-center gap-1.5 justify-center">
                      <button
                        type="button"
                        onClick={() => updateRow(row.id, "qty", Math.max(0, row.qty - 1))}
                        className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors text-slate-600 bg-white"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={row.qty}
                        onChange={(e) => updateRow(row.id, "qty", e.target.value)}
                        className="input text-center font-extrabold text-slate-800 text-[13px] w-14 p-1 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => updateRow(row.id, "qty", row.qty + 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors text-slate-600 bg-white"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="p-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => onChange(items.filter((r) => r.id !== row.id))}
                      className="btn-action btn-action-danger w-8 h-8 rounded-lg"
                      title="Remove Row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {items.length > 0 && (
        <div
          className="flex items-center justify-between px-4 py-3 rounded-xl border shadow-xs"
          style={{ background: "#F8FAFC", borderColor: "#E2E8F0" }}
        >
          <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Total Cylinders</span>
          <span className="text-[18px] font-extrabold text-slate-800 px-3 py-0.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
            {total} <span className="text-[11px] font-medium text-slate-400 lowercase">units</span>
          </span>
        </div>
      )}
    </div>
  );
}

/* â”€â”€ Add New Type Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function AddTypeModal({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: (p: Product) => void;
}) {
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [pending, startT] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setErr("Cylinder type name is required");
      return;
    }
    startT(async () => {
      const res = await addCylinderType(name.trim());
      if (res.error) {
        setErr(res.error);
        return;
      }
      if (res.product) {
        onAdded(res.product);
        setName("");
        setErr("");
        onClose();
      }
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Cylinder Type"
      size="sm"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button form="add-type-form" type="submit" disabled={pending} className="btn btn-primary shadow-sm px-5">
            {pending ? "Saving..." : "Add Cylinder"}
          </button>
        </>
      }
    >
      <form id="add-type-form" onSubmit={handleSubmit} className="space-y-4">
        {err && (
          <div
            className="text-[13px] px-3.5 py-2.5 rounded-xl border flex items-center gap-2"
            style={{ background: "#FEF2F2", color: "#B91C1C", borderColor: "#FCA5A5" }}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{err}</span>
          </div>
        )}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cylinder Product Details</p>
          </div>
          <div className="p-4">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1.5">Type Name *</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 19kg Commercial, 14.2kg Domestic"
              className="input text-[13px] focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}

/* â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export function GodownClient({
  initialRecords,
  totalFilled,
  totalEmpty,
  isAdmin,
  userId,
  cylinderTypes,
}: GodownClientProps) {
  const [records, setRecords] = useState(initialRecords);
  const [products, setProducts] = useState<Product[]>(cylinderTypes);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "PENDING_EXIT">("ALL");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  // Modals state
  const [entryOpen, setEntryOpen] = useState(false);
  const [entryVehicleNo, setEntryVehicleNo] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 16));
  const [entryItems, setEntryItems] = useState<CylinderItem[]>([]);
  const [entryNotes, setEntryNotes] = useState("");

  const [exitOpen, setExitOpen] = useState(false);
  const [exitRecordId, setExitRecordId] = useState("");
  const [exitDate, setExitDate] = useState(new Date().toISOString().slice(0, 16));
  const [exitItems, setExitItems] = useState<CylinderItem[]>([]);
  const [exitNotes, setExitNotes] = useState("");

  const [addTypeOpen, setAddTypeOpen] = useState(false);
  const [addTypeCallback, setAddTypeCallback] = useState<((p: Product) => void) | null>(null);

  // Toggle row expansion
  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const pendingExitRecords = useMemo(() => {
    return records.filter((r) => !hasExited(r));
  }, [records]);

  const selectedRecord = useMemo(() => {
    return records.find((r) => r.id === exitRecordId);
  }, [records, exitRecordId]);

  // â”€â”€ Entry submit â”€â”€
  function handleEntrySubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!entryVehicleNo.trim()) {
      setError("Vehicle number is required");
      return;
    }
    if (entryItems.length === 0) {
      setError("Please add at least one cylinder type");
      return;
    }

    const fd = new FormData();
    fd.append("vehicleNo", entryVehicleNo);
    fd.append("entryDate", entryDate);
    fd.append(
      "entryItems",
      JSON.stringify(
        entryItems.map(({ productId, productName, qty }) => ({
          productId,
          productName,
          qty,
        }))
      )
    );
    fd.append("notes", entryNotes);
    fd.append("submittedById", userId);

    startTransition(async () => {
      const res = await createGodownEntry(fd);
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.record) {
        setRecords((prev) => [res.record!, ...prev]);
        setEntryOpen(false);
        setEntryVehicleNo("");
        setEntryDate(new Date().toISOString().slice(0, 16));
        setEntryItems([]);
        setEntryNotes("");
      }
    });
  }

  // â”€â”€ Exit submit â”€â”€
  function handleExitSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!exitRecordId) {
      setError("Please select a vehicle entry to record its exit");
      return;
    }
    if (exitItems.length === 0) {
      setError("Please add at least one cylinder type");
      return;
    }

    const fd = new FormData();
    fd.append("recordId", exitRecordId);
    fd.append("exitDate", exitDate);
    fd.append(
      "exitItems",
      JSON.stringify(
        exitItems.map(({ productId, productName, qty }) => ({
          productId,
          productName,
          qty,
        }))
      )
    );
    fd.append("exitNotes", exitNotes);

    startTransition(async () => {
      const res = await recordGodownExit(fd);
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.record) {
        setRecords((prev) => prev.map((r) => (r.id === res.record!.id ? res.record! : r)));
        setExitOpen(false);
        setExitRecordId("");
        setExitDate(new Date().toISOString().slice(0, 16));
        setExitItems([]);
        setExitNotes("");
      }
    });
  }

  // â”€â”€ Approve â”€â”€
  function handleApprove(id: string) {
    startTransition(async () => {
      const res = await approveGodownRecord(id);
      if (res.success) {
        setRecords((prev) => {
          const updated = prev.map((r) => (r.id === id ? { ...r, status: "APPROVED" } : r));
          const r = updated.find((x) => x.id === id);
          if (r) {
            setError("");
            setExitRecordId(r.id);
            const eItems = getEntryItems(r);
            if (eItems.length > 0) {
              setExitItems(eItems.map((it) => ({ id: makeId(), productId: it.productId, productName: it.productName, qty: it.qty })));
            } else if (products.length > 0) {
              setExitItems([newRow(products)]);
            }
            setExitOpen(true);
          }
          return updated;
        });
      }
    });
  }

  // â”€â”€ Add type â”€â”€
  const openAddType = useCallback((cb: (p: Product) => void) => {
    setAddTypeCallback(() => cb);
    setAddTypeOpen(true);
  }, []);

  function handleTypeAdded(p: Product) {
    setProducts((prev) => [...prev, p]);
    addTypeCallback?.(p);
    setAddTypeCallback(null);
  }

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch = r.vehicleNo.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (statusFilter === "PENDING") return r.status === "PENDING";
      if (statusFilter === "APPROVED") return r.status === "APPROVED";
      if (statusFilter === "PENDING_EXIT") return !hasExited(r);
      return true;
    });
  }, [records, searchQuery, statusFilter]);

  const todayCount = records.filter(
    (r) => new Date(r.entryDate).toDateString() === new Date().toDateString()
  ).length;
  const pendingCount = records.filter((r) => r.status === "PENDING").length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Filled Received" value={totalFilled} subtitle="All time approved" icon={<Package className="w-5 h-5 text-blue-600" />} color="blue" />
        <StatsCard title="Total Empty Returned" value={totalEmpty} subtitle="All time approved" icon={<ArrowUpDown className="w-5 h-5 text-amber-600" />} color="orange" />
        <StatsCard title="Today's Arrivals" value={todayCount} subtitle="Supply vehicles today" icon={<Truck className="w-5 h-5 text-green-600" />} color="green" />
        <StatsCard title="Awaiting Review" value={pendingCount} subtitle="Pending approvals" icon={<CheckCircle2 className="w-5 h-5 text-rose-600" />} color={pendingCount > 0 ? "orange" : "green"} />
      </div>

      {/* Control Panel */}
      <div className="p-4 rounded-xl border flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center shadow-sm bg-white" style={{ borderColor: "var(--color-border)" }}>
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-xs">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Search className="w-4 h-4" /></span>
            <input type="text" placeholder="Search vehicle number..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input pl-9 text-[13px]" />
          </div>
          <div className="flex items-center gap-1 p-1 rounded-lg border self-start" style={{ background: "var(--color-bg)", borderColor: "var(--color-border)" }}>
            {(["ALL", "PENDING", "APPROVED", "PENDING_EXIT"] as const).map((tab) => {
              const label = tab === "ALL" ? "All" : tab === "PENDING" ? "Pending" : tab === "APPROVED" ? "Approved" : "In Godown";
              const active = statusFilter === tab;
              return (
                <button key={tab} onClick={() => setStatusFilter(tab)} className="px-3 py-1 rounded-md text-[12px] font-semibold transition-all whitespace-nowrap"
                  style={active ? { background: "#FFFFFF", color: "var(--color-text-primary)", boxShadow: "var(--shadow-sm)" } : { color: "var(--color-text-secondary)" }}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setError(""); if (products.length > 0) setEntryItems([newRow(products)]); setEntryOpen(true); }} className="btn btn-primary py-2 px-4 shadow-sm">
            <LogIn className="w-4 h-4" /> Record Entry
          </button>
          <button onClick={() => { setError(""); if (products.length > 0) setExitItems([newRow(products)]); setExitOpen(true); }} className="btn py-2 px-4 shadow-sm hover:opacity-95 font-semibold text-[13px]" style={{ background: "#F59E0B", color: "#FFFFFF" }}>
            <LogOut className="w-4 h-4" /> Record Exit
          </button>
        </div>
      </div>

      {/* Records Table */}
      <div className="rounded-xl border shadow-sm overflow-hidden bg-white" style={{ borderColor: "var(--color-border)" }}>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="w-8 text-center"></th>
                <th>Vehicle No.</th>
                <th>Entry Date &amp; Time</th>
                <th>Exit Date &amp; Time</th>
                <th className="text-center">Filled In</th>
                <th className="text-center">Empty Out</th>
                <th>Submitted By</th>
                <th>Status</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <Truck className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-[14px] font-semibold text-slate-700">No records found</p>
                    <p className="text-[12px] text-slate-400 mt-1">Try adjusting your filters or search terms.</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const exited = hasExited(r);
                  const exitDt = getExitDate(r);
                  const isExpanded = !!expandedRows[r.id];
                  const entryCylinders = getEntryItems(r);
                  const exitCylinders = getExitItems(r);
                  return (
                    <Fragment key={r.id}>
                      <tr className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => toggleRow(r.id)}>
                        <td className="text-center py-4">
                          <button type="button" className="p-1 rounded hover:bg-slate-100 transition-colors text-slate-500">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="py-4">
                          <span className="font-mono text-[13px] font-bold text-slate-800 px-2.5 py-1 rounded bg-slate-100 border">{r.vehicleNo}</span>
                        </td>
                        <td className="text-[12px] text-slate-600 font-medium">{formatDateTime(r.entryDate)}</td>
                        <td className="text-[12px]">
                          {exitDt ? (
                            <span className="font-semibold text-emerald-600">{formatDateTime(exitDt)}</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold animate-pulse" style={{ background: "#FEF9C3", color: "#854D0E" }}>In Godown</span>
                          )}
                        </td>
                        <td className="text-center font-bold text-[14px] text-blue-600">{r.filledCylindersReceived}</td>
                        <td className="text-center font-bold text-[14px] text-amber-600">{r.emptyCylindersReturned}</td>
                        <td className="text-slate-600 font-medium text-[13px]">{r.submittedBy.name}</td>
                        <td className="py-4"><StatusBadge status={r.status} /></td>
                        <td className="text-center py-4" onClick={(e) => e.stopPropagation()}>
                          {r.status === "PENDING" && isAdmin && (
                            <button onClick={() => handleApprove(r.id)} disabled={isPending} className="btn btn-secondary text-[12px] py-1 px-3 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 font-bold">
                              Approve
                            </button>
                          )}
                          {r.status === "PENDING" && !isAdmin && (
                            <span className="text-[12px] text-slate-400 italic">Awaiting Approval</span>
                          )}
                          {r.status === "APPROVED" && !exited && (
                            <button
                              onClick={() => {
                                setError("");
                                setExitRecordId(r.id);
                                const eItems = getEntryItems(r);
                                if (eItems.length > 0) {
                                  setExitItems(eItems.map((it) => ({ id: makeId(), productId: it.productId, productName: it.productName, qty: it.qty })));
                                } else if (products.length > 0) {
                                  setExitItems([newRow(products)]);
                                }
                                setExitOpen(true);
                              }}
                              className="btn text-[12px] py-1 px-3 font-bold text-white shadow-xs hover:opacity-95"
                              style={{ background: "#F59E0B" }}
                            >
                              Record Exit
                            </button>
                          )}
                          {r.status === "APPROVED" && exited && (
                            <span className="text-[12px] font-semibold text-slate-400 flex items-center justify-center gap-1">
                              <Check className="w-3.5 h-3.5 text-emerald-500" /> Completed
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* Expandable row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/30">
                          <td colSpan={9} className="p-4 border-t">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                              {/* Entry details */}
                              <div className="bg-white p-4 rounded-xl border">
                                <div className="flex items-center gap-2 pb-2 mb-3 border-b">
                                  <LogIn className="w-4 h-4 text-blue-600" />
                                  <h4 className="text-[12px] font-bold text-slate-800 uppercase tracking-wider">Entry Summary (Filled In)</h4>
                                </div>
                                {entryCylinders.length === 0 ? (
                                  <p className="text-[12px] text-slate-400 italic">No entry details available.</p>
                                ) : (
                                  <div className="space-y-2">
                                    {entryCylinders.map((item, idx) => (
                                      <div key={idx} className="flex justify-between items-center text-[13px] py-1 border-b border-dashed last:border-b-0">
                                        <span className="text-slate-600 font-medium">{item.productName}</span>
                                        <span className="font-bold text-slate-800">{item.qty} units</span>
                                      </div>
                                    ))}
                                    <div className="flex justify-between items-center text-[13px] font-bold pt-2 border-t text-slate-800">
                                      <span>Total Received</span>
                                      <span>{r.filledCylindersReceived} units</span>
                                    </div>
                                  </div>
                                )}
                                {r.notes && (
                                  <div className="mt-4 p-3 rounded bg-slate-50 border text-[12px] text-slate-600">
                                    <span className="font-semibold block mb-0.5 text-slate-700">Entry Notes:</span>
                                    {r.notes}
                                  </div>
                                )}
                              </div>

                              {/* Exit details */}
                              <div className="bg-white p-4 rounded-xl border">
                                <div className="flex items-center gap-2 pb-2 mb-3 border-b">
                                  <LogOut className="w-4 h-4 text-emerald-600" />
                                  <h4 className="text-[12px] font-bold text-slate-800 uppercase tracking-wider">Exit Summary (Empty Out)</h4>
                                </div>
                                {!exited ? (
                                  <div className="flex flex-col items-center justify-center py-6">
                                    <p className="text-[12px] text-slate-400 italic">Vehicle has not exited yet.</p>
                                    <button onClick={(e) => { e.stopPropagation(); setError(""); setExitRecordId(r.id); if (products.length > 0) setExitItems([newRow(products)]); setExitOpen(true); }} className="btn btn-secondary mt-3 text-[11px] py-1.5 px-3 flex items-center gap-1.5">
                                      <LogOut className="w-3.5 h-3.5" /> Record Exit Now
                                    </button>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {exitCylinders.length === 0 ? (
                                      <p className="text-[12px] text-slate-400 italic">No exit details available.</p>
                                    ) : (
                                      exitCylinders.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-[13px] py-1 border-b border-dashed last:border-b-0">
                                          <span className="text-slate-600 font-medium">{item.productName}</span>
                                          <span className="font-bold text-slate-800">{item.qty} units</span>
                                        </div>
                                      ))
                                    )}
                                    <div className="flex justify-between items-center text-[13px] font-bold pt-2 border-t text-slate-800">
                                      <span>Total Returned</span>
                                      <span>{r.emptyCylindersReturned} units</span>
                                    </div>
                                    {getExitNotes(r) && (
                                      <div className="mt-4 p-3 rounded bg-slate-50 border text-[12px] text-slate-600">
                                        <span className="font-semibold block mb-0.5 text-slate-700">Exit Notes:</span>
                                        {getExitNotes(r)}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* â”€â”€ Entry Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Modal
        open={entryOpen}
        onClose={() => setEntryOpen(false)}
        title="Record Vehicle Entry"
        subtitle="Log a new company supply vehicle arrival"
        size="lg"
        footer={
          <>
            <button type="button" onClick={() => setEntryOpen(false)} className="btn btn-secondary">Cancel</button>
            <button form="entry-form" type="submit" disabled={isPending} className="btn btn-primary shadow-sm px-5">
              {isPending ? "Submitting..." : "Record Entry"}
            </button>
          </>
        }
      >
        <form id="entry-form" onSubmit={handleEntrySubmit} className="space-y-4">
          {error && (
            <div className="text-[13px] px-3.5 py-2.5 rounded-xl border flex items-center gap-2" style={{ background: "#FEF2F2", borderColor: "#FCA5A5", color: "#B91C1C" }}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Vehicle &amp; Schedule</p>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1.5">Vehicle Number *</label>
                <div className="relative">
                  <input value={entryVehicleNo} onChange={(e) => setEntryVehicleNo(e.target.value.toUpperCase())} placeholder="MH12AB1234" className="input font-mono text-[13px] font-bold tracking-widest" style={{ textTransform: "uppercase" }} />
                  {entryVehicleNo && (
                    <span className="absolute inset-y-0 right-2 flex items-center">
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">âœ“ OK</span>
                    </span>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1.5">Entry Date &amp; Time *</label>
                <input type="datetime-local" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="input text-[13px]" />
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 overflow-visible">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 rounded-t-xl">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cylinders Received</p>
            </div>
            <div className="p-4">
              <CylinderRows items={entryItems} products={products} onChange={setEntryItems} onAddType={openAddType} label="" />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Remarks (Optional)</p>
            </div>
            <div className="p-4">
              <textarea value={entryNotes} onChange={(e) => setEntryNotes(e.target.value)} rows={2} placeholder="Driver details, invoice / challan numbers, supply company remarks..." className="input text-[13px] resize-none" />
            </div>
          </div>
        </form>
      </Modal>

      {/* â”€â”€ Exit Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Modal
        open={exitOpen}
        onClose={() => setExitOpen(false)}
        title="Record Vehicle Exit"
        subtitle="Log empty cylinder returns for an in-godown vehicle"
        size="lg"
        footer={
          <>
            <button type="button" onClick={() => setExitOpen(false)} className="btn btn-secondary">Cancel</button>
            <button form="exit-form" type="submit" disabled={isPending || !exitRecordId} className="btn font-semibold text-[13px] px-5 shadow-sm" style={{ background: "#F59E0B", color: "#FFFFFF" }}>
              {isPending ? "Saving..." : "Record Exit"}
            </button>
          </>
        }
      >
        <form id="exit-form" onSubmit={handleExitSubmit} className="space-y-4">
          {error && (
            <div className="text-[13px] px-3.5 py-2.5 rounded-xl border flex items-center gap-2" style={{ background: "#FEF2F2", borderColor: "#FCA5A5", color: "#B91C1C" }}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}
          <div className="rounded-xl border border-slate-200 overflow-visible">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 rounded-t-xl">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Select Active Vehicle</p>
            </div>
            <div className="p-4">
              {pendingExitRecords.length === 0 ? (
                <div className="p-4 rounded-xl border flex flex-col items-center text-center" style={{ background: "#FFFBEB", borderColor: "#FDE68A" }}>
                  <Truck className="w-7 h-7 text-amber-500 mb-2" />
                  <p className="text-[13px] font-bold text-amber-800">No vehicles currently in Godown</p>
                  <p className="text-[11px] text-amber-600 mt-0.5">Record a vehicle entry first, then approve it to log an exit.</p>
                </div>
              ) : (
                <CustomSelect
                  value={exitRecordId}
                  onChange={(val) => {
                    setExitRecordId(val);
                    const rec = records.find((r) => r.id === val);
                    if (rec) {
                      const eItems = getEntryItems(rec);
                      if (eItems.length > 0) {
                        setExitItems(eItems.map((it) => ({ id: makeId(), productId: it.productId, productName: it.productName, qty: it.qty })));
                      }
                    }
                  }}
                  options={pendingExitRecords.map((r) => ({
                    value: r.id,
                    label: `${r.vehicleNo} - Entered ${formatDateTime(r.entryDate)}`
                  }))}
                  placeholder="- Choose a vehicle -"
                />
              )}
            </div>
          </div>
          {selectedRecord && (
            <div className="px-4 py-3 rounded-xl border flex items-center justify-between" style={{ background: "#F0FDF4", borderColor: "#BBF7D0" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[13px] font-bold font-mono text-emerald-800">{selectedRecord.vehicleNo}</p>
                  <p className="text-[11px] text-emerald-600">Entered: {formatDateTime(selectedRecord.entryDate)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Filled In</p>
                <p className="text-[16px] font-extrabold text-emerald-800">{selectedRecord.filledCylindersReceived} <span className="text-[11px] font-normal">pcs</span></p>
              </div>
            </div>
          )}
          {selectedRecord && (
            <>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Exit Date &amp; Time</p>
                </div>
                <div className="p-4">
                  <input type="datetime-local" value={exitDate} onChange={(e) => setExitDate(e.target.value)} className="input text-[13px]" />
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 overflow-visible">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 rounded-t-xl">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cylinders Returned (Empty Out)</p>
                </div>
                <div className="p-4">
                  <CylinderRows items={exitItems} products={products} onChange={setExitItems} onAddType={openAddType} label="" />
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Exit Notes (Optional)</p>
                </div>
                <div className="p-4">
                  <textarea value={exitNotes} onChange={(e) => setExitNotes(e.target.value)} rows={2} placeholder="Driver status, cylinder condition notes..." className="input text-[13px] resize-none" />
                </div>
              </div>
            </>
          )}
        </form>
      </Modal>

      <AddTypeModal open={addTypeOpen} onClose={() => setAddTypeOpen(false)} onAdded={handleTypeAdded} />
    </div>
  );
}


