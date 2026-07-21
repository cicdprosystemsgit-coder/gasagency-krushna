"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, FileText, Eye, Trash2, Download, Building2, Phone, MapPin, Receipt, CheckCircle, AlertCircle } from "lucide-react";
import { createGstInvoice } from "@/app/actions/gst-invoicing";
import { generateGstInvoicePDF } from "@/lib/generateGstInvoicePDF";
import type { Customer, Product } from "@/generated/prisma";
import { createCustomer } from "@/app/actions/customers";
import { createProduct } from "@/app/actions/products";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Invoice {
  id: string;
  date: Date | string;
  invoiceNo: string;
  customerId: string;
  items: unknown;
  subtotal: number;
  gstAmount: number;
  total: number;
  status: string;
}

interface InvoiceItem {
  productId: string;
  productName: string;
  qty: number;
  rate: number;
  amount: number;
}

export interface AgencyInfo {
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  gstin: string;
}

interface GstInvoicingClientProps {
  initialInvoices: Invoice[];
  customers: Customer[];
  products: Product[];
  agencyInfo: AgencyInfo;
  stockMap?: Record<string, { officeStock: number; godownStock: number }>;
  readonly?: boolean;
}

const GST_RATE = 0.05;
const CGST_RATE = 0.025;
const SGST_RATE = 0.025;

// ─── Component ────────────────────────────────────────────────────────────────

export function GstInvoicingClient({
  initialInvoices,
  customers,
  products,
  agencyInfo,
  stockMap = {},
  readonly = false,
}: GstInvoicingClientProps) {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ customerId: "", date: new Date().toISOString().slice(0, 10) });
  const [customerSearch, setCustomerSearch] = useState("");
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [items, setItems] = useState<InvoiceItem[]>([
    { productId: "", productName: "", qty: 1, rate: 0, amount: 0 },
  ]);

  const [localCustomers, setLocalCustomers] = useState(customers);
  const [localProducts, setLocalProducts] = useState(products);

  const [quickCustomerModal, setQuickCustomerModal] = useState(false);
  const [quickProductModal, setQuickProductModal] = useState(false);
  const [quickCustomerForm, setQuickCustomerForm] = useState({ name: "", phone: "", address: "", type: "DOMESTIC", email: "", customerCode: "" });
  const [quickProductForm, setQuickProductForm] = useState({ name: "", unitCost: "", saleRate: "", margin: "", isCylinder: "false" });
  const [quickError, setQuickError] = useState("");
  const [pendingItemIndex, setPendingItemIndex] = useState<number | null>(null);

  const searchWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target as Node)) {
        setIsSearchDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const cost = parseFloat(quickProductForm.unitCost) || 0;
    const rate = parseFloat(quickProductForm.saleRate) || 0;
    const computed = rate - cost;
    const computedStr = computed > 0 ? String(Number(computed.toFixed(2))) : "0";
    if (quickProductForm.margin !== computedStr) {
      setQuickProductForm((prev) => ({ ...prev, margin: computedStr }));
    }
  }, [quickProductForm.unitCost, quickProductForm.saleRate]);


  function handleQuickCustomerSubmit(e: React.FormEvent) {
    e.preventDefault();
    setQuickError("");
    if (!quickCustomerForm.name.trim()) { setQuickError("Name is required"); return; }
    if (!quickCustomerForm.phone.trim()) { setQuickError("Phone is required"); return; }

    const fd = new FormData();
    fd.append("name", quickCustomerForm.name);
    fd.append("phone", quickCustomerForm.phone);
    if (quickCustomerForm.address) fd.append("address", quickCustomerForm.address);
    fd.append("type", quickCustomerForm.type);
    if (quickCustomerForm.email) fd.append("email", quickCustomerForm.email);
    if (quickCustomerForm.customerCode) fd.append("customerCode", quickCustomerForm.customerCode);

    startTransition(async () => {
      const res = await createCustomer(fd);
      if (res.error) { setQuickError(res.error); return; }
      if (res.customer) {
        const newCust = res.customer as any;
        setLocalCustomers(prev => [...prev, newCust]);
        setForm(prev => ({ ...prev, customerId: newCust.id }));
        setQuickCustomerModal(false);
        setQuickCustomerForm({ name: "", phone: "", address: "", type: "DOMESTIC", email: "", customerCode: "" });
      }
    });
  }

  function handleQuickProductSubmit(e: React.FormEvent) {
    e.preventDefault();
    setQuickError("");
    if (!quickProductForm.name.trim()) { setQuickError("Product name is required"); return; }

    const fd = new FormData();
    fd.append("name", quickProductForm.name);
    fd.append("unitCost", quickProductForm.unitCost || "0");
    fd.append("saleRate", quickProductForm.saleRate || "0");
    fd.append("margin", quickProductForm.margin || "0");
    fd.append("isCylinder", quickProductForm.isCylinder);

    startTransition(async () => {
      const res = await createProduct(fd);
      if (res.error) { setQuickError(res.error); return; }
      if (res.product) {
        const newProd = res.product as any;
        setLocalProducts(prev => [...prev, newProd]);
        if (pendingItemIndex !== null) {
          setItems((prev) => {
            const updated = [...prev];
            updated[pendingItemIndex] = {
              ...updated[pendingItemIndex],
              productId: newProd.id,
              productName: newProd.name,
              rate: newProd.saleRate,
              amount: updated[pendingItemIndex].qty * newProd.saleRate,
            };
            return updated;
          });
        }
        setQuickProductModal(false);
        setQuickProductForm({ name: "", unitCost: "", saleRate: "", margin: "", isCylinder: "false" });
        setPendingItemIndex(null);
      }
    });
  }

  function updateItem(index: number, field: keyof InvoiceItem, value: string | number) {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === "productId") {
        const p = localProducts.find((p) => p.id === value);
        if (p) {
          updated[index].productName = p.name;
          updated[index].rate = p.saleRate;
          updated[index].amount = updated[index].qty * p.saleRate;
        }
      }
      if (field === "qty" || field === "rate") {
        updated[index].amount = Number(updated[index].qty) * Number(updated[index].rate);
      }
      return updated;
    });
  }

  function addItem() {
    setItems((prev) => [...prev, { productId: "", productName: "", qty: 1, rate: 0, amount: 0 }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const subtotal  = items.reduce((a, i) => a + i.amount, 0);
  const gstAmount = subtotal * GST_RATE;
  const total     = subtotal + gstAmount;

  // Check if any item exceeds available office stock
  const hasStockError = items.some((item) => {
    if (!item.productId) return false;
    const officeStock = stockMap[item.productId]?.officeStock ?? null;
    return officeStock !== null && item.qty > officeStock;
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customerId) { setError("Please select a customer"); return; }
    if (items.some((i) => !i.productId || i.qty <= 0)) {
      setError("Please fill all item details");
      return;
    }
    if (hasStockError) {
      setError("One or more items exceed available office stock. Please reduce quantities.");
      return;
    }
    const fd = new FormData();
    fd.append("customerId", form.customerId);
    fd.append("date", form.date);
    fd.append("items", JSON.stringify(items));
    fd.append("subtotal", String(subtotal));
    fd.append("gstAmount", String(gstAmount));
    fd.append("total", String(total));

    startTransition(async () => {
      const result = await createGstInvoice(fd);
      if (result.error) { setError(result.error); return; }
      if (result.invoice) {
        setInvoices((prev) => [result.invoice!, ...prev]);
        setModalOpen(false);
        setItems([{ productId: "", productName: "", qty: 1, rate: 0, amount: 0 }]);
        setForm({ customerId: "", date: new Date().toISOString().slice(0, 10) });
      }
    });
  }

  async function handleDownload(inv: Invoice) {
    setIsDownloading(true);
    try {
      const customer = customers.find((c) => c.id === inv.customerId);
      const invItems = inv.items as InvoiceItem[];
      const cgst = inv.subtotal * CGST_RATE;
      const sgst = inv.subtotal * SGST_RATE;

      await generateGstInvoicePDF({
        invoiceNo:       inv.invoiceNo,
        invoiceDate:     formatDate(inv.date),
        agencyName:      agencyInfo.name,
        agencyAddress:   agencyInfo.address,
        agencyCity:      agencyInfo.city,
        agencyState:     agencyInfo.state,
        agencyPhone:     agencyInfo.phone,
        agencyGstin:     agencyInfo.gstin,
        customerName:    customer?.name ?? "—",
        customerPhone:   customer?.phone ?? "",
        customerAddress: customer?.address ?? "",
        customerCode:    customer?.customerCode ?? "",
        items:           invItems.map((it) => ({
          productName: it.productName,
          qty:         it.qty,
          rate:        it.rate,
          amount:      it.amount,
        })),
        subtotal:    inv.subtotal,
        cgst,
        sgst,
        totalTax:    cgst + sgst,
        grandTotal:  inv.total,
      });
    } finally {
      setIsDownloading(false);
    }
  }

  const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? "—";

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-slate-500">{invoices.length} invoices · GST Rate: 5% (CGST 2.5% + SGST 2.5%)</span>
        {!readonly && (
          <button
            onClick={() => { setError(""); setModalOpen(true); }}
            className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-800 transition"
          >
            <Plus className="w-4 h-4" /> New GST Invoice
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-5 py-3 text-left font-semibold text-slate-600">Invoice No.</th>
                <th className="px-5 py-3 text-left font-semibold text-slate-600">Date</th>
                <th className="px-5 py-3 text-left font-semibold text-slate-600">Customer</th>
                <th className="px-5 py-3 text-right font-semibold text-slate-600">Subtotal</th>
                <th className="px-5 py-3 text-right font-semibold text-slate-600">GST (5%)</th>
                <th className="px-5 py-3 text-right font-semibold text-slate-600">Total</th>
                <th className="px-5 py-3 text-center font-semibold text-slate-600">Status</th>
                <th className="px-5 py-3 text-center font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-14 text-center">
                    <FileText className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                    <p className="text-slate-400 font-medium">No invoices yet</p>
                    {!readonly && (
                      <button onClick={() => setModalOpen(true)} className="text-blue-600 text-sm underline mt-2">
                        Create first invoice
                      </button>
                    )}
                  </td>
                </tr>
              ) : invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3 font-mono font-bold text-blue-700">{inv.invoiceNo}</td>
                  <td className="px-5 py-3 text-slate-500">{formatDate(inv.date)}</td>
                  <td className="px-5 py-3 font-medium text-slate-800">{customerName(inv.customerId)}</td>
                  <td className="px-5 py-3 text-right text-slate-700">{formatCurrency(inv.subtotal)}</td>
                  <td className="px-5 py-3 text-right text-orange-600">{formatCurrency(inv.gstAmount)}</td>
                  <td className="px-5 py-3 text-right font-bold text-slate-800">{formatCurrency(inv.total)}</td>
                  <td className="px-5 py-3 text-center">
                    <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-green-100 text-green-700">
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      {/* View button */}
                      <button
                        onClick={() => setViewInvoice(inv)}
                        title="View invoice"
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {/* Download PDF button */}
                      <button
                        onClick={() => handleDownload(inv)}
                        disabled={isDownloading}
                        title="Download PDF"
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors disabled:opacity-50"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Create Invoice Modal ─────────────────────────────────── */}
      {!readonly && (
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New GST Invoice" size="xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Customer *</label>
                <div ref={searchWrapperRef} className="relative">
                  {form.customerId && localCustomers.find((c) => c.id === form.customerId) ? (
                    (() => {
                      const cust = localCustomers.find((c) => c.id === form.customerId)!;
                      return (
                        <div className="bg-emerald-50 border-2 border-emerald-500 rounded-xl p-3.5 flex justify-between items-start transition-all shadow-sm">
                          <div className="space-y-1">
                            <p className="font-bold text-emerald-950 text-sm flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                              <span>{cust.name}</span>
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-200 text-emerald-800 uppercase tracking-wider">
                                {cust.type}
                              </span>
                            </p>
                            <div className="text-[11px] text-emerald-800 space-y-0.5 font-medium">
                              <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-emerald-600" /> {cust.phone}</p>
                              {cust.customerCode && <p className="flex items-center gap-1.5"><strong>Consumer No:</strong> {cust.customerCode}</p>}
                              {cust.address && <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-emerald-600" /> {cust.address}</p>}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setForm({ ...form, customerId: "" });
                              setCustomerSearch("");
                            }}
                            className="text-xs text-emerald-700 hover:text-emerald-950 font-bold bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg transition-colors border border-emerald-200"
                          >
                            Change Customer
                          </button>
                        </div>
                      );
                    })()
                  ) : (
                    <div>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={customerSearch}
                            onChange={(e) => {
                              setCustomerSearch(e.target.value);
                              setIsSearchDropdownOpen(true);
                              
                              const query = e.target.value.toLowerCase().trim();
                              if (query) {
                                const exactMatches = localCustomers.filter(
                                  (c) =>
                                    c.name.toLowerCase() === query ||
                                    c.phone === query ||
                                    (c.customerCode && c.customerCode.toLowerCase() === query)
                                );
                                if (exactMatches.length === 1) {
                                  setForm((prev) => ({ ...prev, customerId: exactMatches[0].id }));
                                  setCustomerSearch(exactMatches[0].name);
                                }
                              }
                            }}
                            onFocus={() => setIsSearchDropdownOpen(true)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const q = customerSearch.toLowerCase().trim();
                                if (q) {
                                  const matches = localCustomers.filter((c) =>
                                    c.name.toLowerCase().includes(q) ||
                                    c.phone.includes(q) ||
                                    (c.customerCode ?? "").toLowerCase().includes(q)
                                  );
                                  if (matches.length > 0) {
                                    setForm((prev) => ({ ...prev, customerId: matches[0].id }));
                                    setCustomerSearch(matches[0].name);
                                    setIsSearchDropdownOpen(false);
                                  }
                                }
                              }
                            }}
                            placeholder="Search by Name, Mobile, or Consumer Number..."
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          {customerSearch && (
                            <button
                              type="button"
                              onClick={() => setCustomerSearch("")}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-semibold"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setQuickError("");
                            setQuickCustomerModal(true);
                          }}
                          className="px-4 bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 rounded-xl flex items-center justify-center transition-colors font-bold text-sm"
                          title="Add new customer"
                        >
                          + Add New
                        </button>
                      </div>

                      {customerSearch && localCustomers.filter((c) => {
                        const q = customerSearch.toLowerCase().trim();
                        return (
                          c.name.toLowerCase().includes(q) ||
                          c.phone.includes(q) ||
                          (c.customerCode ?? "").toLowerCase().includes(q)
                        );
                      }).length === 0 && (
                        <div className="mt-2 text-xs text-red-600 flex items-center gap-1.5 bg-red-50 border border-red-100 p-2.5 rounded-lg">
                          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                          <span>No customer matches this search query. Please check Consumer Number, Name, or Mobile.</span>
                        </div>
                      )}

                      {isSearchDropdownOpen && (
                        <div className="absolute left-0 right-0 mt-1.5 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-20 divide-y divide-slate-100">
                          {localCustomers
                            .filter((c) => {
                              const q = customerSearch.toLowerCase().trim();
                              if (!q) return true;
                              return (
                                c.name.toLowerCase().includes(q) ||
                                c.phone.includes(q) ||
                                (c.customerCode ?? "").toLowerCase().includes(q)
                              );
                            })
                            .slice(0, 10)
                            .map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onMouseDown={(e) => {
                                  // Prevent blur or click-outside from closing before select is registered
                                  e.preventDefault();
                                  setForm({ ...form, customerId: c.id });
                                  setCustomerSearch(c.name);
                                  setIsSearchDropdownOpen(false);
                                }}
                                className="w-full px-4 py-2.5 text-left hover:bg-slate-50 flex items-center justify-between transition-colors"
                              >
                                <div>
                                  <p className="font-semibold text-slate-800 text-sm">{c.name}</p>
                                  <p className="text-[11px] text-slate-500 flex items-center gap-3">
                                    <span>{c.phone}</span>
                                    {c.customerCode && <span>Consumer No: {c.customerCode}</span>}
                                  </p>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                                  {c.type}
                                </span>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Invoice Date *</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>


            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-slate-700">Invoice Items *</label>
                <button type="button" onClick={addItem} className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add Row
                </button>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-3 py-2 text-left font-semibold text-slate-600">Product</th>
                      <th className="px-3 py-2 text-center font-semibold text-slate-600 w-20">Qty</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-600 w-28">Rate (₹)</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-600 w-28">Amount</th>
                      <th className="px-3 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => {
                      const officeStock = item.productId ? (stockMap[item.productId]?.officeStock ?? null) : null;
                      const godownStock = item.productId ? (stockMap[item.productId]?.godownStock ?? 0) : 0;
                      const isOverStock = officeStock !== null && item.qty > officeStock;
                      return (
                        <tr key={i} className={`border-t border-slate-100 ${isOverStock ? "bg-red-50" : ""}`}>
                          <td className="px-3 py-2">
                            <div className="flex flex-col gap-1">
                              <div className="flex gap-1">
                                <select
                                  value={item.productId}
                                  onChange={(e) => updateItem(i, "productId", e.target.value)}
                                  className={`flex-1 px-2 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                    isOverStock ? "border-red-400" : "border-slate-200"
                                  }`}
                                >
                                  <option value="">Select...</option>
                                  {localProducts.map((p) => {
                                    const pStock = stockMap[p.id]?.officeStock ?? null;
                                    return (
                                      <option key={p.id} value={p.id}>
                                        {p.name}{pStock !== null ? ` (Office: ${pStock})` : ""}
                                      </option>
                                    );
                                  })}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuickError("");
                                    setPendingItemIndex(i);
                                    setQuickProductForm({ name: "", unitCost: "", saleRate: "", margin: "", isCylinder: "false" });
                                    setQuickProductModal(true);
                                  }}
                                  className="px-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg flex items-center justify-center transition-colors font-bold text-xs text-slate-500"
                                  title="Add new product"
                                >
                                  +
                                </button>
                              </div>
                              {/* Stock availability badges */}
                              {item.productId && (
                                <div className="flex items-center gap-2 flex-wrap">
                                  {officeStock !== null && (
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                      officeStock === 0
                                        ? "bg-red-100 text-red-700"
                                        : isOverStock
                                        ? "bg-orange-100 text-orange-700"
                                        : "bg-emerald-100 text-emerald-700"
                                    }`}>
                                      🏪 Office: {officeStock} units
                                    </span>
                                  )}
                                  {godownStock > 0 && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                                      🏭 Godown: {godownStock} units
                                    </span>
                                  )}
                                  {isOverStock && (
                                    <span className="text-[10px] font-bold text-red-600">
                                      ⚠ Insufficient stock!
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number" min="1" value={item.qty}
                              onChange={(e) => updateItem(i, "qty", Number(e.target.value))}
                              className={`w-full px-2 py-1.5 border rounded-lg text-xs text-center focus:outline-none focus:ring-1 ${
                                isOverStock
                                  ? "border-red-400 bg-red-50 focus:ring-red-400 text-red-700 font-bold"
                                  : "border-slate-200 focus:ring-blue-500"
                              }`}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number" min="0" value={item.rate}
                              onChange={(e) => updateItem(i, "rate", Number(e.target.value))}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-800 text-xs">{formatCurrency(item.amount)}</td>
                          <td className="px-3 py-2 text-center">
                            {items.length > 1 && (
                              <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals preview */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Taxable Value</span>
                <span className="font-semibold text-slate-800">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">CGST @ 2.5%</span>
                <span className="font-semibold text-orange-600">{formatCurrency(subtotal * CGST_RATE)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">SGST @ 2.5%</span>
                <span className="font-semibold text-orange-600">{formatCurrency(subtotal * SGST_RATE)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5 mt-1">
                <span className="font-bold text-slate-800">Grand Total</span>
                <span className="font-bold text-blue-700 text-base">{formatCurrency(total)}</span>
              </div>
            </div>

            {hasStockError && (
              <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>One or more items exceed available office stock. Adjust quantities to proceed.</span>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => setModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">
                Cancel
              </button>
              <button type="submit" disabled={isPending || hasStockError}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed transition">
                {isPending ? "Creating..." : "Create Invoice"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── View Invoice Modal (Preview) ─────────────────────────── */}
      <Modal open={!!viewInvoice} onClose={() => setViewInvoice(null)} title="Invoice Preview" size="lg">
        {viewInvoice && (() => {
          const customer = customers.find((c) => c.id === viewInvoice.customerId);
          const invItems = viewInvoice.items as InvoiceItem[];
          const cgst = viewInvoice.subtotal * CGST_RATE;
          const sgst = viewInvoice.subtotal * SGST_RATE;

          return (
            <div>
              {/* Invoice preview card */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">

                {/* Header band */}
                <div className="bg-blue-700 px-6 py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white font-bold text-[15px] leading-tight">{agencyInfo.name || "Gas Agency"}</p>
                      {agencyInfo.address && (
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3 text-blue-300 flex-shrink-0" />
                          <p className="text-blue-200 text-[11px]">
                            {[agencyInfo.address, agencyInfo.city, agencyInfo.state].filter(Boolean).join(", ")}
                          </p>
                        </div>
                      )}
                      {agencyInfo.phone && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-blue-300 flex-shrink-0" />
                          <p className="text-blue-200 text-[11px]">{agencyInfo.phone}</p>
                        </div>
                      )}
                      {agencyInfo.gstin && (
                        <p className="text-blue-200 text-[11px] mt-0.5">GSTIN: {agencyInfo.gstin}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-white font-black text-[13px] tracking-widest uppercase opacity-80">Tax Invoice</p>
                      <p className="text-white font-bold text-[17px] mt-1 font-mono">{viewInvoice.invoiceNo}</p>
                      <p className="text-blue-200 text-[11px] mt-0.5">{formatDate(viewInvoice.date)}</p>
                    </div>
                  </div>
                </div>

                {/* Bill To */}
                <div className="px-6 py-3 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-start gap-2">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Bill To</p>
                      <p className="font-bold text-slate-800 text-[13px]">{customer?.name ?? "—"}</p>
                      {customer?.customerCode && (
                        <p className="text-blue-700 font-bold text-[11px] mt-0.5">
                          Consumer No: {customer.customerCode}
                        </p>
                      )}
                      {customer?.address && <p className="text-slate-500 text-[11px] mt-0.5">{customer.address}</p>}
                      {customer?.phone && <p className="text-slate-500 text-[11px]">Ph: {customer.phone}</p>}
                    </div>
                  </div>
                </div>

                {/* Items table */}
                <div className="px-6 py-3">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="border-b-2 border-slate-200">
                        <th className="py-2 text-left font-semibold text-slate-500 text-[10px] uppercase tracking-wide">#</th>
                        <th className="py-2 text-left font-semibold text-slate-500 text-[10px] uppercase tracking-wide">Description</th>
                        <th className="py-2 text-center font-semibold text-slate-500 text-[10px] uppercase tracking-wide">Qty</th>
                        <th className="py-2 text-right font-semibold text-slate-500 text-[10px] uppercase tracking-wide">Rate</th>
                        <th className="py-2 text-right font-semibold text-slate-500 text-[10px] uppercase tracking-wide">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invItems.map((item, i) => (
                        <tr key={i} className="border-b border-slate-100 last:border-0">
                          <td className="py-2.5 text-slate-400">{i + 1}</td>
                          <td className="py-2.5 font-medium text-slate-800">{item.productName}</td>
                          <td className="py-2.5 text-center text-slate-600">{item.qty}</td>
                          <td className="py-2.5 text-right text-slate-600">{formatCurrency(item.rate)}</td>
                          <td className="py-2.5 text-right font-semibold text-slate-800">{formatCurrency(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Tax summary */}
                <div className="px-6 pb-4">
                  <div className="ml-auto w-64 space-y-1.5 text-[12px]">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Taxable Value</span>
                      <span className="font-medium text-slate-700">{formatCurrency(viewInvoice.subtotal)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">CGST @ 2.5%</span>
                      <span className="font-medium text-orange-600">{formatCurrency(cgst)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">SGST @ 2.5%</span>
                      <span className="font-medium text-orange-600">{formatCurrency(sgst)}</span>
                    </div>
                    <div className="flex justify-between py-2 bg-blue-700 rounded-lg px-3 mt-2">
                      <span className="font-bold text-white text-[13px]">Grand Total</span>
                      <span className="font-bold text-white text-[13px]">{formatCurrency(viewInvoice.total)}</span>
                    </div>
                  </div>
                </div>

                {/* Terms footer */}
                <div className="px-6 py-3 bg-slate-50 border-t border-slate-200">
                  <p className="text-[10px] text-slate-400 font-medium">Terms & Conditions</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Goods once sold will not be taken back. Subject to local jurisdiction. This is a computer-generated invoice.
                  </p>
                </div>
              </div>

              {/* Download PDF button */}
              <button
                onClick={() => handleDownload(viewInvoice)}
                disabled={isDownloading}
                className="mt-4 w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: isDownloading ? "#94A3B8" : "#1D4ED8", cursor: isDownloading ? "not-allowed" : "pointer" }}
              >
                <Download className="w-4 h-4" />
                {isDownloading ? "Generating PDF…" : "Download PDF"}
              </button>

              {/* Info line */}
              <p className="text-center text-[11px] text-slate-400 mt-2 flex items-center justify-center gap-1">
                <Receipt className="w-3 h-3" />
                PDF downloads as &quot;GST_Invoice_{viewInvoice.invoiceNo}.pdf&quot;
              </p>
            </div>
          );
        })()}
      </Modal>

      {/* Quick Add Customer Modal */}
      <Modal open={quickCustomerModal} onClose={() => setQuickCustomerModal(false)} title="Quick Add Customer" size="sm">
        <form onSubmit={handleQuickCustomerSubmit} className="space-y-4">
          {quickError && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{quickError}</div>}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Name *</label>
            <input
              type="text"
              required
              value={quickCustomerForm.name}
              onChange={(e) => setQuickCustomerForm({ ...quickCustomerForm, name: e.target.value })}
              placeholder="e.g. John Doe"
              className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone Number *</label>
            <input
              type="tel"
              required
              value={quickCustomerForm.phone}
              onChange={(e) => setQuickCustomerForm({ ...quickCustomerForm, phone: e.target.value })}
              placeholder="e.g. 9876543210"
              className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Customer Type</label>
              <select
                value={quickCustomerForm.type}
                onChange={(e) => setQuickCustomerForm({ ...quickCustomerForm, type: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="DOMESTIC">Domestic</option>
                <option value="COMMERCIAL">Commercial</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Customer Code</label>
              <input
                type="text"
                value={quickCustomerForm.customerCode}
                onChange={(e) => setQuickCustomerForm({ ...quickCustomerForm, customerCode: e.target.value })}
                placeholder="Optional"
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Address</label>
            <textarea
              value={quickCustomerForm.address}
              onChange={(e) => setQuickCustomerForm({ ...quickCustomerForm, address: e.target.value })}
              placeholder="Optional address details"
              rows={2}
              className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setQuickCustomerModal(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 transition"
            >
              {isPending ? "Adding..." : "Add Customer"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Quick Add Product Modal */}
      <Modal open={quickProductModal} onClose={() => setQuickProductModal(false)} title="Quick Add Product" size="sm">
        <form onSubmit={handleQuickProductSubmit} className="space-y-4">
          {quickError && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{quickError}</div>}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Product Name *</label>
            <input
              type="text"
              required
              value={quickProductForm.name}
              onChange={(e) => setQuickProductForm({ ...quickProductForm, name: e.target.value })}
              placeholder="e.g. 14.2kg Cylinder"
              className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Unit Cost (₹)</label>
              <input
                type="number"
                min="0"
                value={quickProductForm.unitCost}
                onChange={(e) => setQuickProductForm({ ...quickProductForm, unitCost: e.target.value })}
                placeholder="0.00"
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Sale Rate (₹)</label>
              <input
                type="number"
                min="0"
                value={quickProductForm.saleRate}
                onChange={(e) => setQuickProductForm({ ...quickProductForm, saleRate: e.target.value })}
                placeholder="0.00"
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Margin (₹)</label>
              <input
                type="number"
                min="0"
                value={quickProductForm.margin}
                onChange={(e) => setQuickProductForm({ ...quickProductForm, margin: e.target.value })}
                placeholder="0.00"
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 cursor-not-allowed opacity-75 font-semibold text-slate-500"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Is Cylinder?</label>
              <select
                value={quickProductForm.isCylinder}
                onChange={(e) => setQuickProductForm({ ...quickProductForm, isCylinder: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setQuickProductModal(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 transition"
            >
              {isPending ? "Adding..." : "Add Product"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
