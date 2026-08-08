"use client";

import { useState, useTransition, useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Plus,
  ShoppingCart,
  Trash2,
  BookOpen,
  Calendar,
  Filter,
  Search,
  User,
  UserPlus,
  Hash,
  Phone,
  MapPin,
  ArrowUpCircle,
  ArrowDownCircle,
  AlertCircle,
  FileText,
  Download,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Users,
} from "lucide-react";
import { createCommercialSale, deleteCommercialSale } from "@/app/actions/commercial-sales";
import type { Customer, Product } from "@/generated/prisma";
import { CalendarPicker } from "@/components/ui/CalendarPicker";

interface Sale {
  id: string;
  date: Date | string;
  qty: number;
  rate: number;
  amount: number;
  cashCollected: number;
  udhariNew: number;
  udhariPrev: number;
  balance: number;
  customer: { name: string; type: string };
  product: { name: string };
  addedBy: { name: string };
  deliveredBy?: { name: string } | null;
}

interface CustomerWithDeliveries extends Customer {
  deliveries: Array<{
    id: string;
    date: Date | string;
    productId: string;
    product: { name: string };
    deliveredQty: number;
    returnedQty: number;
    pendingQty: number;
    paymentMode: string;
    creditAmount: number;
    status: string;
    notes: string | null;
    deliveredBy: { name: string };
  }>;
}

interface CommercialDelivery {
  id: string;
  date: Date | string;
  deliveredQty: number;
  cashCollected: number;
  creditAmount: number;
  paymentMode: string;
  customer: { name: string; type: string };
  product: { name: string; saleRate: number };
  deliveredBy: { name: string } | null;
}

interface CommercialSalesClientProps {
  initialSales: Sale[];
  customers: CustomerWithDeliveries[];
  products: Product[];
  deliveryBoys: Array<{ id: string; name: string }>;
  commercialDeliveries?: CommercialDelivery[];
  canEdit: boolean;
  userId: string;
}

type TabType = "sales" | "cylinders";

export function CommercialSalesClient({
  initialSales,
  customers,
  products,
  deliveryBoys,
  commercialDeliveries = [],
  canEdit,
  userId,
}: CommercialSalesClientProps) {
  // Tabs state
  const [activeTab, setActiveTab] = useState<TabType>("sales");

  // Sales tab states
  const [sales, setSales] = useState(initialSales);
  const [modalOpen, setModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [form, setForm] = useState({
    customerId: "",
    productId: "",
    qty: "1",
    rate: "",
    cashCollected: "",
    udhariPrev: "0",
    remarks: "",
    deliveredById: "",
  });

  // Cylinder tab states
  const [cylinderSearch, setCylinderSearch] = useState("");
  const [cylinderFilterStatus, setCylinderFilterStatus] = useState<"ALL" | "PENDING">("ALL");
  const [selectedCylCustomer, setSelectedCylCustomer] = useState<CustomerWithDeliveries | null>(
    customers[0] || null
  );
  const [cylDateFrom, setCylDateFrom] = useState("");
  const [cylDateTo, setCylDateTo] = useState("");

  // Combine CommercialSale and DeliveryRecord
  const combinedSales = useMemo(() => {
    const saleItems = sales.map((s) => ({
      ...s,
      isOfficeSale: true,
      entrySource: "Office Log",
    }));

    const deliveryItems = (commercialDeliveries || []).map((d) => {
      const qty = d.deliveredQty;
      const rate = d.product?.saleRate || 0;
      const amount = qty * rate;
      const cashCollected = d.cashCollected || 0;
      const udhariNew = d.creditAmount || 0;
      const balance = udhariNew;

      return {
        id: d.id,
        date: d.date,
        qty,
        rate,
        amount,
        cashCollected,
        udhariNew,
        udhariPrev: 0,
        balance,
        customer: { name: d.customer.name, type: d.customer.type },
        product: { name: d.product.name },
        addedBy: { name: d.deliveredBy?.name || "Delivery Boy" },
        deliveredBy: d.deliveredBy,
        isOfficeSale: false,
        entrySource: "Delivery Boy",
      };
    });

    return [...saleItems, ...deliveryItems].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [sales, commercialDeliveries]);

  // Day total calculation for sales log
  const dayTotal = useMemo(() => {
    return combinedSales
      .filter((s) => new Date(s.date).toDateString() === new Date(selectedDate).toDateString())
      .reduce((a, s) => a + s.amount, 0);
  }, [combinedSales, selectedDate]);

  function handleRateFromProduct(productId: string) {
    const p = products.find((p) => p.id === productId);
    if (p) setForm((f) => ({ ...f, productId, rate: String(p.saleRate) }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customerId) {
      setError("Please select a customer");
      return;
    }
    if (!form.productId) {
      setError("Please select a product");
      return;
    }
    if (!form.qty || Number(form.qty) <= 0) {
      setError("Quantity must be greater than 0");
      return;
    }
    if (!form.rate || Number(form.rate) <= 0) {
      setError("Rate must be greater than 0");
      return;
    }

    const qty = Number(form.qty);
    const rate = Number(form.rate);
    const amount = qty * rate;
    const cashCollected = Number(form.cashCollected) || 0;
    const udhariPrev = Number(form.udhariPrev) || 0;
    const udhariNew = amount - cashCollected;
    const balance = udhariPrev + udhariNew;

    const fd = new FormData();
    fd.append("customerId", form.customerId);
    fd.append("productId", form.productId);
    fd.append("qty", String(qty));
    fd.append("rate", String(rate));
    fd.append("amount", String(amount));
    fd.append("cashCollected", String(cashCollected));
    fd.append("udhariNew", String(udhariNew));
    fd.append("udhariPrev", String(udhariPrev));
    fd.append("balance", String(balance));
    fd.append("date", selectedDate);
    fd.append("addedById", userId);
    fd.append("deliveredById", form.deliveredById);

    startTransition(async () => {
      const result = await createCommercialSale(fd);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.sale) {
        setSales((prev) => [result.sale!, ...prev]);
        setModalOpen(false);
        setForm({
          customerId: "",
          productId: "",
          qty: "1",
          rate: "",
          cashCollected: "",
          udhariPrev: "0",
          remarks: "",
          deliveredById: "",
        });
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Remove this entry?")) return;
    const fd = new FormData();
    fd.append("id", id);
    startTransition(async () => {
      const result = await deleteCommercialSale(fd);
      if (result.success) setSales((prev) => prev.filter((s) => s.id !== id));
    });
  }

  const filteredSales = useMemo(() => {
    return combinedSales.filter(
      (s) => new Date(s.date).toDateString() === new Date(selectedDate).toDateString()
    );
  }, [combinedSales, selectedDate]);

  // Cylinder Filtering Logic
  const filteredCylCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(cylinderSearch.toLowerCase()) ||
        (c.customerCode && c.customerCode.toLowerCase().includes(cylinderSearch.toLowerCase()));

      if (!matchSearch) return false;

      if (cylinderFilterStatus === "PENDING") {
        const totalDelivered = c.deliveries?.reduce((acc, d) => acc + d.deliveredQty, 0) || 0;
        const totalReturned = c.deliveries?.reduce((acc, d) => acc + d.returnedQty, 0) || 0;
        return totalDelivered - totalReturned > 0;
      }
      return true;
    });
  }, [customers, cylinderSearch, cylinderFilterStatus]);

  // If selected Customer is not in filtered list, auto-select first from filtered list
  useMemo(() => {
    if (selectedCylCustomer && !filteredCylCustomers.some((c) => c.id === selectedCylCustomer.id)) {
      setSelectedCylCustomer(filteredCylCustomers[0] || null);
    }
  }, [filteredCylCustomers, selectedCylCustomer]);

  // Selected customer deliveries filtered by Date Range
  const filteredCylDeliveries = useMemo(() => {
    if (!selectedCylCustomer) return [];
    let list = selectedCylCustomer.deliveries || [];

    if (cylDateFrom) {
      const fromTime = new Date(cylDateFrom).getTime();
      list = list.filter((d) => new Date(d.date).getTime() >= fromTime);
    }
    if (cylDateTo) {
      const toTime = new Date(cylDateTo).getTime() + 86400000;
      list = list.filter((d) => new Date(d.date).getTime() <= toTime);
    }

    return list;
  }, [selectedCylCustomer, cylDateFrom, cylDateTo]);

  // Selected Customer Cylinder stats
  const selectedCylStats = useMemo(() => {
    let delivered = 0;
    let returned = 0;
    filteredCylDeliveries.forEach((d) => {
      delivered += d.deliveredQty;
      returned += d.returnedQty;
    });
    return {
      delivered,
      returned,
      pending: Math.max(0, delivered - returned),
    };
  }, [filteredCylDeliveries]);

  // Overall Cylinder stats across ALL commercial accounts matching Date filters
  const overallCylStats = useMemo(() => {
    let delivered = 0;
    let returned = 0;
    customers.forEach((c) => {
      c.deliveries?.forEach((d) => {
        const dDate = new Date(d.date).toISOString().split("T")[0];
        if (cylDateFrom && dDate < cylDateFrom) return;
        if (cylDateTo && dDate > cylDateTo) return;
        delivered += d.deliveredQty;
        returned += d.returnedQty;
      });
    });
    return {
      delivered,
      returned,
      pending: Math.max(0, delivered - returned),
    };
  }, [customers, cylDateFrom, cylDateTo]);

  // Chronological running balance helper
  const deliveriesWithRunningBalance = useMemo(() => {
    if (filteredCylDeliveries.length === 0) return [];
    // Sort chronologically ascending to calculate running balance correctly
    const sorted = [...filteredCylDeliveries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let running = 0;
    const mapped = sorted.map((d) => {
      running += d.deliveredQty - d.returnedQty;
      return { ...d, runningPending: running };
    });

    // Return descending for UI presentation
    return mapped.reverse();
  }, [filteredCylDeliveries]);

  // PDF Export logic for Customer Cylinders Statement
  async function handleExportCylinderPDF() {
    if (!selectedCylCustomer) return;
    try {
      const { jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const width = doc.internal.pageSize.width;

      // Header Brand
      doc.setFillColor(15, 23, 42); // Dark slate
      doc.rect(0, 0, width, 35, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.text("CUSTOMER CYLINDER STATEMENT", 14, 15);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(156, 163, 175);
      doc.text(`Generated on: ${new Date().toLocaleDateString("en-IN")}`, 14, 22);

      // Customer Info Panel
      doc.setFillColor(248, 250, 252);
      doc.rect(14, 42, width - 28, 25, "F");
      doc.setDrawColor(226, 232, 240);
      doc.rect(14, 42, width - 28, 25, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(selectedCylCustomer.name, 18, 48);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Consumer No: ${selectedCylCustomer.customerCode ?? "N/A"}`, 18, 54);
      doc.text(`Mobile: ${selectedCylCustomer.phone}`, 18, 60);

      doc.text(`Address: ${selectedCylCustomer.address ?? "No address recorded"}`, 100, 48);
      doc.text(`Type: ${selectedCylCustomer.type}`, 100, 54);

      // Summary Stats
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("CYLINDER SUMMARY", 14, 76);

      const statsHeaders = [["Total Refills Delivered", "Total Empty Returned", "Pending Empty Liability"]];
      const statsRows = [
        [
          String(selectedCylStats.delivered) + " pcs",
          String(selectedCylStats.returned) + " pcs",
          String(selectedCylStats.pending) + " pcs",
        ],
      ];

      autoTable(doc, {
        startY: 80,
        head: statsHeaders,
        body: statsRows,
        theme: "striped",
        headStyles: { fillColor: [79, 70, 229], fontSize: 9 }, // Indigo
        bodyStyles: { fontSize: 9.5, fontStyle: "bold" },
        styles: { cellPadding: 3 },
      });

      // Ledger Entries
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("DELIVERY LOG", 14, 104);

      const tableHeaders = [
        [
          "Date",
          "Product",
          "Delivered Qty",
          "Returned Qty",
          "Pending Change",
          "Delivery Boy",
          "Status/Notes",
        ],
      ];

      const pdfTableRows = [...deliveriesWithRunningBalance].map((d) => [
        new Date(d.date).toLocaleDateString("en-IN"),
        d.product?.name ?? "Cylinder",
        String(d.deliveredQty),
        String(d.returnedQty),
        String(d.deliveredQty - d.returnedQty),
        d.deliveredBy?.name ?? "—",
        d.notes || d.status || "DELIVERED",
      ]);

      autoTable(doc, {
        startY: 108,
        head: tableHeaders,
        body: pdfTableRows,
        theme: "grid",
        headStyles: { fillColor: [15, 23, 42], fontSize: 9 },
        bodyStyles: { fontSize: 8.5 },
        styles: { cellPadding: 2.5 },
        columnStyles: {
          2: { halign: "center" },
          3: { halign: "center" },
          4: { halign: "center" },
        },
      });

      doc.save(`cylinders_${selectedCylCustomer.name.replace(/\s+/g, "_")}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
    }
  }

  return (
    <>
      {/* Premium Segmented Tab Selector */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit mb-6 border border-slate-200/40">
        <button
          onClick={() => setActiveTab("sales")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
            activeTab === "sales"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          Sales Operations
        </button>
        <button
          onClick={() => setActiveTab("cylinders")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
            activeTab === "cylinders"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users className="w-4 h-4" />
          Customer Cylinder Info
        </button>
      </div>

      {activeTab === "sales" ? (
        <>
          {/* Date + Totals bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between bg-white rounded-3xl border border-slate-100 shadow-sm px-6 py-5 mb-6 gap-4 hover:shadow-md transition duration-300">
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex flex-col gap-1.5">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Select Sale Date
                </label>
                <CalendarPicker value={selectedDate} onChange={setSelectedDate} />
              </div>
              <div className="pl-6 border-l border-slate-100">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Deliveries Logged
                </p>
                <p className="text-2xl font-black text-slate-800 mt-1">{filteredSales.length}</p>
              </div>
              <div className="pl-6 border-l border-slate-100">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Total Day Sales
                </p>
                <p className="text-2xl font-black text-green-700 mt-1">{formatCurrency(dayTotal)}</p>
              </div>
            </div>
            {canEdit && (
              <button
                onClick={() => {
                  setError("");
                  setModalOpen(true);
                }}
                className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-blue-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 self-stretch md:self-auto text-center justify-center"
              >
                <Plus className="w-4 h-4" /> Log Commercial Sale
              </button>
            )}
          </div>

          {/* Sales Table / Cards */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition duration-300">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/20">
              <h3 className="font-extrabold text-slate-800 text-base tracking-tight">
                Sales Ledger Statement — {formatDate(selectedDate)}
              </h3>
            </div>

            {/* MOBILE STACKED CARDS (<768px) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredSales.length === 0 ? (
                <div className="px-6 py-12 text-center text-slate-400">
                  <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="font-extrabold text-slate-700 text-xs">No Sales Documented</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    No commercial invoices recorded for chosen date.
                  </p>
                </div>
              ) : (
                filteredSales.map((s: any) => (
                  <div key={`mob-sale-${s.id}`} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-extrabold text-slate-800 text-sm">{s.customer.name}</p>
                        <span className={`inline-flex items-center text-[9px] font-extrabold px-2 py-0.5 rounded-full mt-1 ${
                          s.isOfficeSale 
                            ? "bg-slate-100 text-slate-600 border border-slate-200" 
                            : "bg-indigo-50 text-indigo-600 border border-indigo-100"
                        }`}>
                          {s.isOfficeSale ? "Office Invoice" : "Mobile Delivery"}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-slate-900 text-sm block">{formatCurrency(s.amount)}</span>
                        <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 font-extrabold px-2 py-0.5 rounded-lg inline-block mt-0.5">
                          {s.qty} {s.product.name} @ ₹{s.rate}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center text-xs">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Cash</span>
                        <span className="font-bold text-emerald-600">{formatCurrency(s.cashCollected)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">New Udhari</span>
                        <span className="font-bold text-orange-600">{formatCurrency(s.udhariNew)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Balance</span>
                        <span className="font-bold text-rose-600">{formatCurrency(s.balance)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                      <span>Delivered By: {s.deliveredBy?.name || "Office/Staff"}</span>
                      {canEdit && s.isOfficeSale && (
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="text-rose-600 font-bold hover:underline flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* DESKTOP TABLE VIEW (>=768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-500 font-extrabold">
                    <th className="px-6 py-4 text-left">Customer</th>
                    <th className="px-6 py-4 text-left">Product</th>
                    <th className="px-6 py-4 text-left">Delivered By</th>
                    <th className="px-6 py-4 text-center">Qty</th>
                    <th className="px-6 py-4 text-right">Rate</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                    <th className="px-6 py-4 text-right">Cash Collected</th>
                    <th className="px-6 py-4 text-right">Udhari (NEW)</th>
                    <th className="px-6 py-4 text-right">Udhari (PRE)</th>
                    <th className="px-6 py-4 text-right">Balance</th>
                    {canEdit && <th className="px-6 py-4 text-center">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                  {filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={canEdit ? 11 : 10} className="px-6 py-20 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                          <ShoppingCart className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="font-extrabold text-slate-700">No Sales Documented</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          There are no commercial invoices recorded for the chosen date. Use the button above to log one.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map((s: any) => (
                      <tr key={s.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-6 py-4">
                          <div className="font-extrabold text-slate-800">{s.customer.name}</div>
                          <span className={`inline-flex items-center text-[9px] font-extrabold px-2 py-0.5 rounded-full mt-1.5 ${
                            s.isOfficeSale 
                              ? "bg-slate-100 text-slate-600 border border-slate-200" 
                              : "bg-indigo-50 text-indigo-600 border border-indigo-100"
                          }`}>
                            {s.isOfficeSale ? "Office Invoice" : "Mobile Delivery"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600 font-semibold">{s.product.name}</td>
                        <td className="px-6 py-4 text-slate-600 font-semibold">{s.deliveredBy?.name || "Office/Staff"}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="bg-blue-50 text-blue-700 border border-blue-100 font-extrabold text-xs px-2.5 py-1 rounded-lg">
                            {s.qty}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-slate-600 font-mono font-bold">
                          {formatCurrency(s.rate)}
                        </td>
                        <td className="px-6 py-4 text-right font-black text-slate-800 font-mono">
                          {formatCurrency(s.amount)}
                        </td>
                        <td className="px-6 py-4 text-right text-emerald-600 font-mono font-bold">
                          {formatCurrency(s.cashCollected)}
                        </td>
                        <td className="px-6 py-4 text-right text-orange-600 font-mono font-bold">
                          {formatCurrency(s.udhariNew)}
                        </td>
                        <td className="px-6 py-4 text-right text-slate-500 font-mono font-bold">
                          {formatCurrency(s.udhariPrev)}
                        </td>
                        <td className="px-6 py-4 text-right font-black text-rose-600 font-mono">
                          {formatCurrency(s.balance)}
                        </td>
                        {canEdit && (
                          <td className="px-6 py-4 text-center">
                            {s.isOfficeSale ? (
                              <button
                                onClick={() => handleDelete(s.id)}
                                title="Delete entry"
                                className="p-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-xl transition duration-150 active:scale-95"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            ) : (
                              <span className="text-[10px] bg-indigo-50 text-indigo-500 font-extrabold px-2.5 py-1 rounded-lg border border-indigo-100">
                                Logged via App
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                  {filteredSales.length > 0 && (
                    <tr className="bg-slate-50/70 font-black text-slate-700">
                      <td colSpan={5} className="px-6 py-4 text-right font-extrabold text-xs uppercase tracking-wider text-slate-500">
                        Total Day Summary
                      </td>
                      <td className="px-6 py-4 text-right text-slate-800 font-mono">
                        {formatCurrency(filteredSales.reduce((a, s) => a + s.amount, 0))}
                      </td>
                      <td className="px-6 py-4 text-right text-emerald-600 font-mono">
                        {formatCurrency(filteredSales.reduce((a, s) => a + s.cashCollected, 0))}
                      </td>
                      <td className="px-6 py-4 text-right text-orange-600 font-mono">
                        {formatCurrency(filteredSales.reduce((a, s) => a + s.udhariNew, 0))}
                      </td>
                      <td className="px-6 py-4"></td>
                      <td className="px-6 py-4 text-right text-rose-600 font-mono">
                        {formatCurrency(filteredSales.reduce((a, s) => a + s.balance, 0))}
                      </td>
                      {canEdit && <td></td>}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Tab 2: Cylinder Directory and ledger statement */
        <div className="space-y-6">
          {/* Cylinder Analytics Cards Panel */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col hover:shadow-md transition duration-200 bg-gradient-to-br from-blue-50/10 to-white">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Total Cylinders Delivered</span>
              <span className="text-2xl font-black text-blue-600 mt-2 flex items-center gap-2">
                <ArrowUpCircle className="w-6 h-6 text-blue-500 flex-shrink-0" />
                {overallCylStats.delivered} <span className="text-xs font-semibold text-slate-500 ml-0.5">pcs</span>
              </span>
              <span className="text-[10px] text-slate-400 font-semibold mt-1">Refills dispatched to clients</span>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col hover:shadow-md transition duration-200 bg-gradient-to-br from-emerald-50/10 to-white">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Total Empty Returned</span>
              <span className="text-2xl font-black text-emerald-600 mt-2 flex items-center gap-2">
                <ArrowDownCircle className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                {overallCylStats.returned} <span className="text-xs font-semibold text-slate-500 ml-0.5">pcs</span>
              </span>
              <span className="text-[10px] text-slate-400 font-semibold mt-1">Empty cylinders recovered back</span>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col hover:shadow-md transition duration-200 bg-gradient-to-br from-purple-50/10 to-white">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Total Empty Pending</span>
              <span className="text-2xl font-black text-purple-600 mt-2 flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-purple-500 flex-shrink-0" />
                {overallCylStats.pending} <span className="text-xs font-semibold text-slate-500 ml-0.5">pcs</span>
              </span>
              <span className="text-[10px] text-slate-400 font-semibold mt-1">Cylinder liabilities outstanding</span>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left directory panel */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col overflow-hidden transition-all duration-300 hover:shadow-md">
              <div className="p-5 border-b border-slate-100 bg-slate-50/40 backdrop-blur-md">
                <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider mb-3">
                  Account Selection
                </h4>
                {/* Search */}
                <div className="relative mb-3">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    value={cylinderSearch}
                    onChange={(e) => setCylinderSearch(e.target.value)}
                    placeholder="Search by name or connection code..."
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white placeholder:text-slate-400/80 transition-all duration-200 shadow-inner"
                  />
                </div>
                {/* Status Toggle Filter */}
                <div className="flex bg-slate-100/80 p-0.5 rounded-xl border border-slate-200/50">
                  <button
                    onClick={() => setCylinderFilterStatus("ALL")}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition ${
                      cylinderFilterStatus === "ALL"
                        ? "bg-white text-slate-800 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    All Accounts
                  </button>
                  <button
                    onClick={() => setCylinderFilterStatus("PENDING")}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition ${
                      cylinderFilterStatus === "PENDING"
                        ? "bg-white text-slate-800 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Pending Empties
                  </button>
                </div>
              </div>

              {/* Customer Directory List scroll area */}
              <div className="overflow-y-auto max-h-[450px] min-h-[300px] divide-y divide-slate-100/60 pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
                {filteredCylCustomers.map((c) => {
                  const isSelected = selectedCylCustomer?.id === c.id;
                  const totalDelivered = c.deliveries?.reduce((acc, d) => acc + d.deliveredQty, 0) || 0;
                  const totalReturned = c.deliveries?.reduce((acc, d) => acc + d.returnedQty, 0) || 0;
                  const pending = totalDelivered - totalReturned;

                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedCylCustomer(c);
                        setCylDateFrom("");
                        setCylDateTo("");
                      }}
                      className={`w-full px-5 py-3.5 flex items-center justify-between text-left border-l-4 transition-all duration-200 ${
                        isSelected
                          ? "bg-blue-50/40 border-l-blue-600 shadow-sm"
                          : "border-l-transparent hover:bg-slate-50/80 hover:translate-x-0.5"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs flex-shrink-0 shadow-sm bg-gradient-to-tr from-slate-900 to-slate-800 text-white">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-slate-800 truncate">{c.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            #{c.customerCode || "NO CODE"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 pl-2">
                        {pending > 0 ? (
                          <span className="bg-purple-50 text-purple-700 border border-purple-100 font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                            {pending} pending
                          </span>
                        ) : (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                            Settled
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
                {filteredCylCustomers.length === 0 && (
                  <div className="px-4 py-16 text-center text-slate-400">
                    <User className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="font-extrabold text-slate-700 text-xs">No Profiles Found</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right detailed timeline and date controls */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col overflow-hidden min-h-[500px] transition-all duration-300 hover:shadow-md">
              {!selectedCylCustomer ? (
                <div className="flex flex-col items-center justify-center flex-1 py-32 text-center text-slate-400 px-6">
                  <ShoppingCart className="w-12 h-12 text-slate-300 mb-3" />
                  <h5 className="font-extrabold text-slate-700 text-sm">No Profile Selected</h5>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Please select a commercial customer from the directory to review their detailed cylinder logs.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col flex-1">
                  {/* Detailed Customer Header */}
                  <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg bg-indigo-600 text-white shadow">
                        {selectedCylCustomer.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-800 text-base tracking-tight">
                          {selectedCylCustomer.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-slate-500 font-semibold">
                          <span className="flex items-center gap-1">
                            <Hash className="w-3 h-3 text-slate-400" />
                            {selectedCylCustomer.customerCode || "No Code"}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {selectedCylCustomer.phone}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleExportCylinderPDF}
                      className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm hover:shadow transition-all active:scale-95 duration-150 self-stretch sm:self-auto justify-center"
                    >
                      <Download className="w-4 h-4 text-slate-500" />
                      Cylinder Statement PDF
                    </button>
                  </div>

                  {/* Summary row for this specific customer */}
                  <div className="grid grid-cols-3 gap-3 p-6 border-b border-slate-100 bg-slate-50/20">
                    <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm text-center">
                      <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">Refills Delivered</span>
                      <p className="text-lg font-black text-blue-600 mt-1">{selectedCylStats.delivered} pcs</p>
                    </div>
                    <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm text-center">
                      <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">Empty Returned</span>
                      <p className="text-lg font-black text-emerald-600 mt-1">{selectedCylStats.returned} pcs</p>
                    </div>
                    <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm text-center">
                      <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">Pending Liability</span>
                      <p className="text-lg font-black text-purple-600 mt-1">{selectedCylStats.pending} pcs</p>
                    </div>
                  </div>

                  {/* Date Range calendar picker */}
                  <div className="px-6 py-4 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      Filter Transactions By Date
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="date"
                        value={cylDateFrom}
                        onChange={(e) => setCylDateFrom(e.target.value)}
                        className="px-2.5 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 bg-slate-50/50"
                      />
                      <span className="text-slate-400 text-xs font-medium">to</span>
                      <input
                        type="date"
                        value={cylDateTo}
                        onChange={(e) => setCylDateTo(e.target.value)}
                        className="px-2.5 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 bg-slate-50/50"
                      />
                      {(cylDateFrom || cylDateTo) && (
                        <button
                          onClick={() => {
                            setCylDateFrom("");
                            setCylDateTo("");
                          }}
                          className="text-[10px] text-blue-600 hover:text-blue-800 font-extrabold uppercase tracking-wide ml-1 transition"
                        >
                          Clear Date
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Chronological detailed delivery table */}
                  <div className="overflow-y-auto max-h-[380px] p-6 bg-slate-50/30">
                    {deliveriesWithRunningBalance.length === 0 ? (
                      <div className="text-center py-16 text-slate-400">
                        <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p className="font-extrabold text-slate-700 text-xs">No Deliveries Found</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          No delivery boy records match the selected calendar bounds.
                        </p>
                      </div>
                    ) : (
                      <div className="relative border-l-2 border-slate-200/80 ml-4 pl-6 space-y-5">
                        {deliveriesWithRunningBalance.map((d) => {
                          const netChange = d.deliveredQty - d.returnedQty;
                          return (
                            <div key={d.id} className="relative group">
                              {/* Timeline indicator circle */}
                              <span className="absolute -left-[32.5px] top-1.5 w-4 h-4 rounded-full border-2 border-white shadow bg-indigo-500 transition-transform group-hover:scale-110 duration-200" />

                              <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full border bg-slate-50 text-slate-600 border-slate-200">
                                      {d.product?.name ?? "Cylinder"}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-bold">
                                      {formatDate(d.date)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-4 mt-2.5">
                                    <div>
                                      <p className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">Delivered</p>
                                      <p className="text-xs font-black text-slate-800 mt-0.5">{d.deliveredQty} pcs</p>
                                    </div>
                                    <div className="pl-4 border-l border-slate-100">
                                      <p className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">Returned</p>
                                      <p className="text-xs font-black text-slate-800 mt-0.5">{d.returnedQty} pcs</p>
                                    </div>
                                    <div className="pl-4 border-l border-slate-100">
                                      <p className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">Change</p>
                                      <p className={`text-xs font-black mt-0.5 ${netChange > 0 ? "text-purple-600" : netChange < 0 ? "text-emerald-600" : "text-slate-400"}`}>
                                        {netChange > 0 ? `+${netChange}` : netChange}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                                    <span className="inline-flex text-[9px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/40">
                                      Handled by {d.deliveredBy?.name || "Delivery Staff"}
                                    </span>
                                    {d.notes && (
                                      <span className="text-[9px] font-medium text-slate-400 italic">
                                        Note: {d.notes}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="text-right border-t md:border-t-0 pt-2.5 md:pt-0 flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center">
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide md:hidden">Status</p>
                                    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100 uppercase tracking-wider">
                                      {d.status || "DELIVERED"}
                                    </span>
                                  </div>
                                  <div className="md:mt-2.5">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide md:hidden">Running Pending</p>
                                    <span className="text-[11px] font-extrabold text-slate-500 font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-200/30">
                                      Total Pending: {d.runningPending} pcs
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Sale Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Commercial Sale Record"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 p-1">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                Customer Account *
              </label>
              <select
                value={form.customerId}
                onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white transition-all font-semibold"
                required
              >
                <option value="">Select customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                Product Refill *
              </label>
              <select
                value={form.productId}
                onChange={(e) => handleRateFromProduct(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white transition-all font-semibold"
                required
              >
                <option value="">Select product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (₹{p.saleRate})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">
              Delivered By (Delivery Boy)
            </label>
            <select
              value={form.deliveredById}
              onChange={(e) => setForm({ ...form, deliveredById: e.target.value })}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white transition-all font-semibold"
            >
              <option value="">Select delivery boy...</option>
              {deliveryBoys.map((db) => (
                <option key={db.id} value={db.id}>
                  {db.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                Quantity *
              </label>
              <input
                type="number"
                min="1"
                value={form.qty}
                onChange={(e) => setForm({ ...form, qty: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white transition-all font-extrabold"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                Rate (₹) *
              </label>
              <input
                type="number"
                min="0"
                value={form.rate}
                onChange={(e) => setForm({ ...form, rate: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white transition-all font-extrabold"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                Cash Collected (₹)
              </label>
              <input
                type="number"
                min="0"
                value={form.cashCollected}
                onChange={(e) => setForm({ ...form, cashCollected: e.target.value })}
                placeholder="0"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white transition-all font-semibold"
              />
            </div>
          </div>
          {form.qty && form.rate && (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-sm font-semibold space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Gross Invoice Amount:</span>
                <span className="font-extrabold text-slate-800">
                  {formatCurrency(Number(form.qty) * Number(form.rate))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Outstanding Liability (Udhari):</span>
                <span className="font-extrabold text-orange-600">
                  {formatCurrency(
                    Math.max(
                      0,
                      Number(form.qty) * Number(form.rate) - (Number(form.cashCollected) || 0)
                    )
                  )}
                </span>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-5 py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider text-slate-600 bg-slate-100 hover:bg-slate-200 transition active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 transition active:scale-95 duration-100 shadow-md"
            >
              {isPending ? "Saving..." : "Save Sale"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
