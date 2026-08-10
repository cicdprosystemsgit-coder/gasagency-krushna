"use client";

import { useState, useTransition, useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Plus,
  CreditCard,
  Search,
  User,
  ArrowDownCircle,
  ArrowUpCircle,
  FileText,
  Download,
  Calendar,
  Filter,
  CheckCircle,
  AlertCircle,
  BookOpen,
  DollarSign,
  UserPlus,
  Hash,
  Phone,
  MapPin,
  TrendingDown,
  TrendingUp,
  Pencil,
} from "lucide-react";
import { createCreditEntry, addCustomer, updateCreditEntry } from "@/app/actions/credit-ledger";
import type { Customer } from "@/generated/prisma";

interface Entry {
  id: string;
  date: Date | string;
  createdAt?: Date | string;
  type: string;
  amount: number;
  description: string | null;
  customerId: string;
  customer: { name: string; phone: string };
  addedBy: { name: string };
}

interface CustomerWithDeliveries {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  type: string;
  customerCode: string | null;
  contactPerson?: string | null;
  isActive: boolean;
  deliveries?: {
    id: string;
    date: Date | string;
    deliveredQty: number;
    returnedQty: number;
    pendingQty: number;
  }[];
}

interface CreditLedgerClientProps {
  customers: CustomerWithDeliveries[];
  initialEntries: Entry[];
  canEdit: boolean;
  userId: string;
}

type SearchMode = "ALL" | "CODE" | "NAME" | "PHONE";
type TxFilter = "ALL" | "CREDIT" | "PAYMENT";

export function CreditLedgerClient({ customers, initialEntries, canEdit, userId }: CreditLedgerClientProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [allCustomers, setAllCustomers] = useState<CustomerWithDeliveries[]>(customers);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithDeliveries | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [addCustomerModal, setAddCustomerModal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("ALL");
  const [txFilter, setTxFilter] = useState<TxFilter>("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);

  const [form, setForm] = useState({
    customerId: "",
    type: "CREDIT",
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });

  const [customerForm, setCustomerForm] = useState({
    name: "",
    phone: "",
    address: "",
    type: "COMMERCIAL",
    customerCode: "",
  });

  // Client-side search and filtering
  const filteredCustomers = useMemo(() => {
    return allCustomers.filter((c) => {
      const q = search.toLowerCase().trim();
      if (!q) return true;

      const codeMatch = c.customerCode?.toLowerCase().includes(q) ?? false;
      const nameMatch = c.name.toLowerCase().includes(q);
      const phoneMatch = c.phone.includes(q);

      if (searchMode === "CODE") return codeMatch;
      if (searchMode === "NAME") return nameMatch;
      if (searchMode === "PHONE") return phoneMatch;

      return codeMatch || nameMatch || phoneMatch;
    });
  }, [allCustomers, search, searchMode]);

  // Map of balances for all customers to display in the list
  const customerBalances = useMemo(() => {
    const balanceMap: Record<string, number> = {};
    allCustomers.forEach((c) => {
      balanceMap[c.id] = 0;
    });

    // Populate balances from entries — match by customerId (reliable, not name string)
    entries.forEach((e) => {
      if (e.customerId in balanceMap) {
        if (e.type === "CREDIT") {
          balanceMap[e.customerId] += e.amount;
        } else {
          balanceMap[e.customerId] -= e.amount;
        }
      }
    });

    return balanceMap;
  }, [allCustomers, entries]);

  // Selected customer statistics & transactions
  const customerStats = useMemo(() => {
    if (!selectedCustomer) return { totalCredit: 0, totalPayment: 0, netBalance: 0, count: 0 };

    // Match by customerId — avoids false negatives when names have slight differences
    const customerEntries = entries.filter(
      (e) => e.customerId === selectedCustomer.id
    );

    let totalCredit = 0;
    let totalPayment = 0;

    customerEntries.forEach((e) => {
      if (e.type === "CREDIT") {
        totalCredit += e.amount;
      } else {
        totalPayment += e.amount;
      }
    });

    return {
      totalCredit,
      totalPayment,
      netBalance: totalCredit - totalPayment,
      count: customerEntries.length,
    };
  }, [selectedCustomer, entries]);

  // Selected customer cylinder statistics filtered by date range
  const cylinderStats = useMemo(() => {
    if (!selectedCustomer || !selectedCustomer.deliveries) {
      return { totalDelivered: 0, totalReturned: 0, totalPending: 0 };
    }

    let list = selectedCustomer.deliveries;

    if (dateFrom) {
      const fromTime = new Date(dateFrom).getTime();
      list = list.filter((d) => new Date(d.date).getTime() >= fromTime);
    }

    if (dateTo) {
      const toTime = new Date(dateTo).getTime() + 86400000; // include full day
      list = list.filter((d) => new Date(d.date).getTime() <= toTime);
    }

    let totalDelivered = 0;
    let totalReturned = 0;

    list.forEach((d) => {
      totalDelivered += d.deliveredQty;
      totalReturned += d.returnedQty;
    });

    return {
      totalDelivered,
      totalReturned,
      totalPending: Math.max(0, totalDelivered - totalReturned),
    };
  }, [selectedCustomer, dateFrom, dateTo]);

  const filteredCustomerEntries = useMemo(() => {
    if (!selectedCustomer) return [];

    let list = entries.filter((e) => e.customerId === selectedCustomer.id);

    if (txFilter === "CREDIT") {
      list = list.filter((e) => e.type === "CREDIT");
    } else if (txFilter === "PAYMENT") {
      list = list.filter((e) => e.type === "PAYMENT");
    }

    if (dateFrom) {
      const fromTime = new Date(dateFrom).getTime();
      list = list.filter((e) => new Date(e.date).getTime() >= fromTime);
    }

    if (dateTo) {
      const toTime = new Date(dateTo).getTime() + 86400000; // include full day
      list = list.filter((e) => new Date(e.date).getTime() <= toTime);
    }

    // Sort chronologically ascending to calculate running balance correctly
    const chronological = [...list].sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      if (timeA !== timeB) return timeA - timeB;
      
      // If dates are identical (same day), sort by database createdAt time
      const createA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const createB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (createA !== createB) return createA - createB;

      // Safe fallback to id to keep the sorting stable
      return a.id.localeCompare(b.id);
    });

    // Calculate running balance
    let running = 0;
    const withRunningBalance = chronological.map((e) => {
      if (e.type === "CREDIT") {
        running += e.amount;
      } else {
        running -= e.amount;
      }
      return { ...e, runningBalance: running };
    });

    // Return descending for UI presentation
    return withRunningBalance.reverse();
  }, [selectedCustomer, entries, txFilter, dateFrom, dateTo]);

  async function handleExportPDF() {
    if (!selectedCustomer) return;
    try {
      const { jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const width = doc.internal.pageSize.width;

      // Header Brand
      doc.setFillColor(30, 58, 138); // Dark Blue
      doc.rect(0, 0, width, 35, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.text("CUSTOMER STATEMENT", 14, 15);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(191, 219, 254);
      doc.text(`Generated on: ${new Date().toLocaleDateString("en-IN")}`, 14, 22);

      // Customer Info Panel
      doc.setFillColor(248, 250, 252);
      doc.rect(14, 42, width - 28, 25, "F");
      doc.setDrawColor(226, 232, 240);
      doc.rect(14, 42, width - 28, 25, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(selectedCustomer.name, 18, 48);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Consumer No: ${selectedCustomer.customerCode ?? "N/A"}`, 18, 54);
      doc.text(`Mobile: ${selectedCustomer.phone}`, 18, 60);

      doc.text(`Address: ${selectedCustomer.address ?? "No address recorded"}`, 100, 48);
      doc.text(`Type: ${selectedCustomer.type}`, 100, 54);

      // Summary Stats
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("STATEMENT SUMMARY", 14, 76);

      const netText = customerStats.netBalance > 0 ? "Outstanding Due" : "Settled/Advance";
      const statsHeaders = [["Total Credit", "Total Paid", "Net Balance Status", "Current Balance"]];
      const statsRows = [[
        formatCurrency(customerStats.totalCredit),
        formatCurrency(customerStats.totalPayment),
        netText,
        formatCurrency(Math.abs(customerStats.netBalance))
      ]];

      autoTable(doc, {
        startY: 80,
        head: statsHeaders,
        body: statsRows,
        theme: "striped",
        headStyles: { fillColor: [51, 65, 85], fontSize: 9 },
        bodyStyles: { fontSize: 9.5, fontStyle: "bold" },
        styles: { cellPadding: 3 },
      });

      // Ledger Entries
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("TRANSACTION LEDGER", 14, 104);

      const tableHeaders = [["Date", "Type", "Details", "Amount (₹)", "Running Balance (₹)"]];
      // Reverse again to print chronological in PDF table
      const pdfTableRows = [...filteredCustomerEntries].reverse().map((e) => [
        new Date(e.date).toLocaleDateString("en-IN"),
        e.type === "CREDIT" ? "Credit Given" : "Payment Received",
        e.description ?? "—",
        e.amount.toFixed(2),
        e.runningBalance.toFixed(2),
      ]);

      autoTable(doc, {
        startY: 108,
        head: tableHeaders,
        body: pdfTableRows,
        theme: "grid",
        headStyles: { fillColor: [30, 58, 138], fontSize: 9 },
        bodyStyles: { fontSize: 8.5 },
        styles: { cellPadding: 2.5 },
        columnStyles: {
          3: { halign: "right" },
          4: { halign: "right" }
        }
      });

      doc.save(`statement_${selectedCustomer.name.replace(/\s+/g, "_")}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
    }
  }

  function handleEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customerId) {
      setError("Please select a customer");
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    fd.append("addedById", userId);

    startTransition(async () => {
      const result = editingEntry
        ? await updateCreditEntry(editingEntry.id, fd)
        : await createCreditEntry(fd);

      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.entry) {
        if (editingEntry) {
          setEntries((prev) =>
            prev.map((item) => (item.id === editingEntry.id ? result.entry! : item))
          );
        } else {
          setEntries((prev) => [result.entry!, ...prev]);
        }
        setModalOpen(false);
        setEditingEntry(null);
        setForm({
          customerId: "",
          type: "CREDIT",
          amount: "",
          description: "",
          date: new Date().toISOString().split("T")[0],
        });
      }
    });
  }

  function handleAddCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!customerForm.name.trim()) {
      setError("Name is required");
      return;
    }
    if (!/^[a-zA-Z\s]+$/.test(customerForm.name)) {
      setError("Name: only alphabetic characters allowed");
      return;
    }
    if (!customerForm.phone.trim()) {
      setError("Phone is required");
      return;
    }
    if (!/^\d{10}$/.test(customerForm.phone)) {
      setError("Phone: must be 10 digits only");
      return;
    }

    const fd = new FormData();
    Object.entries(customerForm).forEach(([k, v]) => fd.append(k, v));

    startTransition(async () => {
      const result = await addCustomer(fd);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.customer) {
        const newCust: CustomerWithDeliveries = {
          ...result.customer,
          deliveries: [],
        };
        setAllCustomers((prev) => [...prev, newCust]);
        setAddCustomerModal(false);
        setCustomerForm({ name: "", phone: "", address: "", type: "COMMERCIAL", customerCode: "" });
      }
    });
  }

  const quickAmounts = [500, 1000, 2000, 5000, 10000];

  return (
    <div className="grid lg:grid-cols-3 gap-6 p-1">
      {/* Left Column: Customer Directory */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col overflow-hidden transition-all duration-300 hover:shadow-md">
        {/* Header and Controls */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/40 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2 tracking-tight">
                <BookOpen className="w-5 h-5 text-blue-600" />
                Customer Directory
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                {filteredCustomers.length} active commercial accounts
              </p>
            </div>
            {canEdit && (
              <button
                onClick={() => {
                  setError("");
                  setAddCustomerModal(true);
                }}
                className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-blue-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              >
                <UserPlus className="w-4 h-4" />
                Add New
              </button>
            )}
          </div>

          {/* Search Type Filter pills */}
          <div className="flex gap-1 bg-slate-100/80 p-1 rounded-xl mb-3 border border-slate-200/50">
            {(["ALL", "CODE", "NAME", "PHONE"] as SearchMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setSearchMode(mode)}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold tracking-wide uppercase transition-all duration-200 ${
                  searchMode === mode
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {mode === "ALL" && "All"}
                {mode === "CODE" && "Cons. No"}
                {mode === "NAME" && "Name"}
                {mode === "PHONE" && "Mobile"}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                searchMode === "ALL"
                  ? "Search by connection code, name, or phone..."
                  : searchMode === "CODE"
                  ? "Search by consumer connection code..."
                  : searchMode === "NAME"
                  ? "Search by name..."
                  : "Search by 10-digit mobile..."
              }
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white placeholder:text-slate-400/80 transition-all duration-200 shadow-inner"
            />
          </div>
        </div>

        {/* Customer Scrolling List */}
        <div className="overflow-y-auto max-h-[calc(100vh-310px)] min-h-[400px] divide-y divide-slate-100/60 pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
          {filteredCustomers.map((c) => {
            const balance = customerBalances[c.id] ?? 0;
            const isCommercial = c.type === "COMMERCIAL";
            const isSelected = selectedCustomer?.id === c.id;

            return (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedCustomer(c);
                  setTxFilter("ALL");
                  setDateFrom("");
                  setDateTo("");
                }}
                className={`w-full px-5 py-4 flex items-center justify-between transition-all duration-200 text-left border-l-4 ${
                  isSelected
                    ? "bg-blue-50/40 border-l-blue-600 shadow-sm"
                    : "border-l-transparent hover:bg-slate-50/80 hover:translate-x-0.5"
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center font-extrabold text-sm flex-shrink-0 shadow-sm ${
                      isCommercial
                        ? "bg-gradient-to-tr from-blue-600 to-indigo-500 text-white"
                        : "bg-gradient-to-tr from-emerald-600 to-teal-500 text-white"
                    }`}
                  >
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-extrabold text-slate-800 truncate tracking-tight">{c.name}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 font-medium">
                      {c.customerCode && (
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold text-[9px] text-slate-600 border border-slate-200/40">
                          #{c.customerCode}
                        </span>
                      )}
                      <span className="truncate">{c.phone}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 pl-2">
                  <p
                    className={`text-sm font-extrabold tracking-tight ${
                      balance > 0 ? "text-rose-600" : balance < 0 ? "text-emerald-600" : "text-slate-400"
                    }`}
                  >
                    {formatCurrency(Math.abs(balance))}
                  </p>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider mt-1 border ${
                      balance > 0
                        ? "bg-rose-50 text-rose-600 border-rose-100"
                        : balance < 0
                        ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                        : "bg-slate-50 text-slate-400 border-slate-200/50"
                    }`}
                  >
                    {balance > 0 ? "Due" : balance < 0 ? "Advance" : "Settled"}
                  </span>
                </div>
              </button>
            );
          })}

          {filteredCustomers.length === 0 && (
            <div className="px-4 py-20 text-center text-slate-400">
              <div className="w-16 h-16 mx-auto bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100 shadow-inner">
                <User className="w-7 h-7 text-slate-300" />
              </div>
              <p className="font-extrabold text-slate-700">No Customers Matched</p>
              <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">
                Try tweaking your search keywords or Connections filter tab.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right 2 Columns: Detailed view / Ledger statement */}
      <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col overflow-hidden min-h-[500px] transition-all duration-300 hover:shadow-md">
        {!selectedCustomer ? (
          <div className="flex flex-col items-center justify-center flex-1 py-36 px-6 text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-blue-500/10 blur-2xl rounded-full scale-150 animate-pulse"></div>
              <div className="relative w-20 h-20 bg-gradient-to-tr from-slate-50 to-blue-50/50 rounded-3xl flex items-center justify-center border border-slate-100 shadow-md">
                <CreditCard className="w-10 h-10 text-blue-500" />
              </div>
            </div>
            <h4 className="font-extrabold text-slate-800 text-lg tracking-tight">Select Customer Profile</h4>
            <p className="text-xs text-slate-400 mt-2 max-w-sm leading-relaxed">
              Please choose a customer from the directory to view outstanding invoices, logs, record ledger credits, and download account statement reports.
            </p>
          </div>
        ) : (
          <div className="flex flex-col flex-1">
            {/* Customer Header Panel */}
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-md bg-gradient-to-tr from-slate-900 to-slate-800 text-white">
                  {selectedCustomer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="font-black text-slate-800 text-xl tracking-tight">{selectedCustomer.name}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100 shadow-sm">
                      {selectedCustomer.type}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-500 mt-1.5">
                    <span className="flex items-center gap-1">
                      <Hash className="w-3.5 h-3.5 text-slate-400" />
                      {selectedCustomer.customerCode ?? "No Consumer Code"}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {selectedCustomer.phone}
                    </span>
                    {selectedCustomer.address && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="flex items-center gap-1 truncate max-w-[220px]">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {selectedCustomer.address}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm hover:shadow transition-all active:scale-95 duration-150"
                >
                  <Download className="w-4 h-4 text-slate-500" />
                  Statement PDF
                </button>
                {canEdit && (
                  <button
                    onClick={() => {
                      setForm({
                        customerId: selectedCustomer.id,
                        type: "CREDIT",
                        amount: "",
                        description: "",
                        date: new Date().toISOString().split("T")[0],
                      });
                      setError("");
                      setModalOpen(true);
                    }}
                    className="flex items-center gap-2 bg-slate-900 text-white px-4.5 py-2.5 rounded-xl text-xs font-black hover:bg-slate-800 shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0 duration-150"
                  >
                    <Plus className="w-4 h-4" />
                    Log Transaction
                  </button>
                )}
              </div>
            </div>

            {/* Dashboard Mini-KPI Stats cards */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/20">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col hover:shadow-md transition duration-200 bg-gradient-to-br from-rose-50/10 to-white">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Total Credit Given</span>
                  <span className="text-lg font-black text-slate-800 mt-1.5 flex items-center gap-1.5">
                    <TrendingUp className="w-5 h-5 text-rose-500 flex-shrink-0" />
                    {formatCurrency(customerStats.totalCredit)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold mt-1">Outstanding dues invoiced</span>
                </div>
                <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col hover:shadow-md transition duration-200 bg-gradient-to-br from-emerald-50/10 to-white">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Total Payments Recd</span>
                  <span className="text-lg font-black text-slate-800 mt-1.5 flex items-center gap-1.5">
                    <TrendingDown className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    {formatCurrency(customerStats.totalPayment)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold mt-1">Total revenue collected</span>
                </div>
                <div className={`p-4.5 rounded-2xl border shadow-sm flex flex-col hover:shadow-md transition duration-200 ${
                  customerStats.netBalance > 0
                    ? "bg-rose-50/30 border-rose-100"
                    : "bg-emerald-50/30 border-emerald-100"
                }`}>
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Current Balance</span>
                  <span
                    className={`text-lg font-black mt-1.5 flex items-center gap-1.5 ${
                      customerStats.netBalance > 0 ? "text-rose-600" : "text-emerald-600"
                    }`}
                  >
                    {customerStats.netBalance > 0 ? (
                      <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 animate-pulse" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    )}
                    {formatCurrency(Math.abs(customerStats.netBalance))}
                  </span>
                  <span className={`text-[10px] font-bold mt-1 ${
                    customerStats.netBalance > 0 ? "text-rose-500/80" : "text-emerald-500/80"
                  }`}>
                    {customerStats.netBalance > 0 ? "Due amount to collect" : "Advance deposit balance"}
                  </span>
                </div>
              </div>
            </div>

            {/* Cylinder Statistics Cards */}
            <div className="grid grid-cols-3 gap-4 px-6 pb-6 pt-0 border-b border-slate-100 bg-slate-50/20">
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col hover:shadow-md transition duration-200">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Total Refills</span>
                <span className="text-base font-extrabold text-blue-600 mt-1.5 flex items-center gap-1">
                  <ArrowUpCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  {cylinderStats.totalDelivered} <span className="text-xs font-semibold text-slate-500 ml-0.5">pcs</span>
                </span>
                <span className="text-[9px] text-slate-400 font-medium mt-1">Delivered cylinders</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col hover:shadow-md transition duration-200">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Empty Returned</span>
                <span className="text-base font-extrabold text-emerald-600 mt-1.5 flex items-center gap-1">
                  <ArrowDownCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  {cylinderStats.totalReturned} <span className="text-xs font-semibold text-slate-500 ml-0.5">pcs</span>
                </span>
                <span className="text-[9px] text-slate-400 font-medium mt-1">Empties collected back</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col hover:shadow-md transition duration-200">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Empty Pending</span>
                <span
                  className={`text-base font-extrabold mt-1.5 flex items-center gap-1 ${
                    cylinderStats.totalPending > 0 ? "text-purple-600" : "text-slate-500"
                  }`}
                >
                  <AlertCircle className={`w-4 h-4 flex-shrink-0 ${cylinderStats.totalPending > 0 ? "text-purple-500" : "text-slate-400"}`} />
                  {cylinderStats.totalPending} <span className="text-xs font-semibold text-slate-500 ml-0.5">pcs</span>
                </span>
                <span className="text-[9px] text-slate-400 font-medium mt-1">Yet to collect back</span>
              </div>
            </div>

            {/* Filter controls */}
            <div className="px-6 py-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Type:</span>
                <div className="flex bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/60">
                  {(["ALL", "CREDIT", "PAYMENT"] as TxFilter[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setTxFilter(f)}
                      className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all duration-200 ${
                        txFilter === f
                          ? "bg-white text-slate-800 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {f === "ALL" ? "All" : f === "CREDIT" ? "Credit" : "Payments"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <Calendar className="w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 bg-slate-50/50"
                />
                <span className="text-slate-400 text-xs font-medium">to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 bg-slate-50/50"
                />
                {(dateFrom || dateTo) && (
                  <button
                    onClick={() => {
                      setDateFrom("");
                      setDateTo("");
                    }}
                    className="text-[10px] text-blue-600 hover:text-blue-800 font-extrabold uppercase tracking-wide ml-1 transition"
                  >
                    Reset Date
                  </button>
                )}
              </div>
            </div>

            {/* Timeline Transactions Area */}
            <div className="overflow-y-auto max-h-[calc(100vh-390px)] min-h-[300px] p-6 bg-slate-50/30 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
              {filteredCustomerEntries.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                  <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-slate-100">
                    <FileText className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="font-extrabold text-slate-600">No Transaction Records Found</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-[280px] mx-auto leading-relaxed">
                    Try adjusting the transaction category filters or calendar date bounds.
                  </p>
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-200/80 ml-4 pl-6 space-y-6">
                  {filteredCustomerEntries.map((entry) => {
                    const isCredit = entry.type === "CREDIT";

                    return (
                      <div key={entry.id} className="relative group">
                        {/* Circle Indicator on timeline */}
                        <span
                          className={`absolute -left-[32.5px] top-1.5 w-4 h-4 rounded-full border-2 border-white shadow flex items-center justify-center transition-transform group-hover:scale-110 duration-200 ${
                            isCredit ? "bg-rose-500" : "bg-emerald-500"
                          }`}
                        >
                          <span className="w-1 h-1 bg-white rounded-full" />
                        </span>

                        {/* Transaction Card */}
                        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-start gap-3.5">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                                isCredit ? "bg-rose-50 text-rose-600 border border-rose-100/50" : "bg-emerald-50 text-emerald-600 border border-emerald-100/50"
                              }`}
                            >
                              {isCredit ? (
                                <ArrowUpCircle className="w-5 h-5" />
                              ) : (
                                <ArrowDownCircle className="w-5 h-5" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full border ${
                                  isCredit
                                    ? "bg-rose-50 text-rose-600 border-rose-100/40"
                                    : "bg-emerald-50 text-emerald-600 border-emerald-100/40"
                                }`}>
                                  {isCredit ? "Credit Given" : "Payment Recd"}
                                </span>
                                <span className="text-[11px] text-slate-400 font-bold">
                                  {formatDate(entry.date)}
                                </span>
                              </div>
                              <p className="text-slate-800 text-sm font-extrabold mt-2 tracking-tight">
                                {entry.description || (isCredit ? "Credit given" : "Payment received")}
                              </p>
                              <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                                <span className="inline-flex text-[10px] font-bold text-slate-500 bg-slate-100/80 px-2 py-0.5 rounded border border-slate-200/50">
                                  Recorded by {entry.addedBy.name}
                                </span>
                                {canEdit && (
                                  <button
                                    onClick={() => {
                                      setEditingEntry(entry);
                                      setForm({
                                        customerId: entry.customerId,
                                        type: entry.type,
                                        amount: String(entry.amount),
                                        description: entry.description || "",
                                        date: new Date(entry.date).toISOString().split("T")[0],
                                      });
                                      setError("");
                                      setModalOpen(true);
                                    }}
                                    className="text-[10px] text-blue-600 hover:text-blue-800 font-bold transition flex items-center gap-1 cursor-pointer hover:underline"
                                  >
                                    <Pencil className="w-3 h-3" />
                                    Edit
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right border-t md:border-t-0 pt-2.5 md:pt-0 flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide md:hidden">Amount</p>
                              <p
                                className={`text-base font-black tracking-tight ${
                                  isCredit ? "text-rose-600" : "text-emerald-600"
                                }`}
                              >
                                {isCredit ? "+" : "-"} {formatCurrency(entry.amount)}
                              </p>
                            </div>
                            <div className="md:mt-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide md:hidden">Running Bal</p>
                              <p className="text-[11px] font-extrabold text-slate-500 font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-200/30">
                                Bal: {formatCurrency((entry as any).runningBalance)}
                              </p>
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

      {/* Log Credit/Payment Modal */}
      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingEntry(null);
        }}
        title={editingEntry ? "Edit Transaction Record" : "New Transaction Entry"}
        size="sm"
      >
        <form onSubmit={handleEntry} className="space-y-4 p-1">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Entry Category</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { type: "CREDIT", label: "Credit Extended", color: "border-rose-400 bg-rose-50/70 text-rose-700 ring-2 ring-rose-500/10" },
                { type: "PAYMENT", label: "Payment Received", color: "border-emerald-400 bg-emerald-50/70 text-emerald-700 ring-2 ring-emerald-500/10" },
              ].map((t) => (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => setForm({ ...form, type: t.type })}
                  className={`py-3 rounded-xl text-xs font-extrabold border-2 uppercase tracking-wider transition-all duration-150 active:scale-95 ${
                    form.type === t.type
                      ? t.color
                      : "border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Amount (₹)</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="0.00"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white transition-all shadow-inner font-extrabold"
              required
            />

            {/* Quick Fill Buttons */}
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setForm({ ...form, amount: String(amt) })}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-extrabold transition active:scale-95 border border-slate-200/30"
                >
                  +₹{amt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white transition-all shadow-inner font-semibold"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">Description</label>
              <span className="text-[10px] text-slate-400 font-bold">{form.description.length}/100</span>
            </div>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value.slice(0, 100) })}
              placeholder="e.g., Bank transfer, monthly settlement, etc."
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white transition-all shadow-inner font-medium"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => {
                setModalOpen(false);
                setEditingEntry(null);
              }}
              className="px-5 py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider text-slate-600 bg-slate-100 hover:bg-slate-200 transition active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 transition active:scale-95 duration-100 shadow-md"
            >
              {isPending ? "Saving..." : "Save Entry"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Customer Modal */}
      <Modal open={addCustomerModal} onClose={() => setAddCustomerModal(false)} title="Enroll Commercial Profile" size="md">
        <form onSubmit={handleAddCustomer} className="space-y-4 p-1">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Business Name *</label>
              <input
                value={customerForm.name}
                onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                placeholder="e.g., Sharma Restaurant"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white transition-all shadow-inner font-semibold"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Consumer Code / connection No</label>
              <input
                value={customerForm.customerCode}
                onChange={(e) => setCustomerForm({ ...customerForm, customerCode: e.target.value })}
                placeholder="e.g., INDANE-2384"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white transition-all shadow-inner font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Phone Number *</label>
            <input
              type="tel"
              value={customerForm.phone}
              onChange={(e) =>
                setCustomerForm({ ...customerForm, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })
              }
              placeholder="9876543210"
              maxLength={10}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white transition-all shadow-inner font-semibold"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Address</label>
            <input
              value={customerForm.address}
              onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
              placeholder="e.g., Shop No. 12, Market Square"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white transition-all shadow-inner font-medium"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setAddCustomerModal(false)}
              className="px-5 py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider text-slate-600 bg-slate-100 hover:bg-slate-200 transition active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 transition active:scale-95 duration-100 shadow-md"
            >
              {isPending ? "Adding..." : "Add Profile"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
