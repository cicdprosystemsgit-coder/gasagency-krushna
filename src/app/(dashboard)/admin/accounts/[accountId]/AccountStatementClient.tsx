"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Download,
  Pencil,
  Trash2,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Printer,
} from "lucide-react";
import { editTransaction, deleteTransaction } from "@/app/actions/personal-transactions";
import { PersonalAccountType, PersonalTxnType } from "@/generated/prisma";
import { cn } from "@/lib/utils";
import { generateVoucherPDF } from "@/lib/voucher-pdf";

interface Transaction {
  id: string;
  date: Date | string;
  type: PersonalTxnType;
  amount: number;
  description: string;
  partyName: string | null;
  partyPhone: string | null;
  paymentMode: string | null;
  referenceNo: string | null;
  tags: string[];
  notes: string | null;
  linkedModule: string | null;
  linkedRecordId: string | null;
  toAccountId: string | null;
  udhaariId: string | null;
  addedById: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Account {
  id: string;
  name: string;
  accountType: PersonalAccountType;
  bankName: string | null;
  accountNo: string | null;
  ifscCode: string | null;
  openingBalance: number;
  currentBalance: number;
  isAgencyAccount: boolean;
  color: string | null;
  notes: string | null;
}

interface AccountStatementClientProps {
  account: Account;
  initialTransactions: Transaction[];
}

export function AccountStatementClient({ account, initialTransactions }: AccountStatementClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filters State
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "CREDIT" | "DEBIT">("ALL");
  const [modeFilter, setModeFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Modals state
  const [editTxnModal, setEditTxnModal] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);

  // Edit Form State
  const [editForm, setEditForm] = useState({
    date: "",
    amount: "",
    description: "",
    partyName: "",
    partyPhone: "",
    paymentMode: "",
    referenceNo: "",
    notes: "",
  });

  // 1. Calculate running balances chronologically (ascending order of initialTransactions)
  let currentBal = account.openingBalance;
  const transactionsWithBalance = initialTransactions.map((t) => {
    const isCredit = [
      "INCOME",
      "RECEIVED_FROM",
      "UDHAARI_RECEIVED",
      "TRANSFER_IN",
      "AGENCY_DEPOSIT",
    ].includes(t.type);
    currentBal = isCredit ? currentBal + t.amount : currentBal - t.amount;
    return { ...t, runningBalance: currentBal };
  });

  // 2. Filter transactions
  const filteredTransactions = transactionsWithBalance.filter((t) => {
    // Search filter
    if (search.trim()) {
      const term = search.toLowerCase();
      const descMatch = t.description?.toLowerCase().includes(term);
      const partyMatch = t.partyName?.toLowerCase().includes(term);
      const refMatch = t.referenceNo?.toLowerCase().includes(term);
      if (!descMatch && !partyMatch && !refMatch) return false;
    }

    // Type filter
    const isCredit = [
      "INCOME",
      "RECEIVED_FROM",
      "UDHAARI_RECEIVED",
      "TRANSFER_IN",
      "AGENCY_DEPOSIT",
    ].includes(t.type);
    if (typeFilter === "CREDIT" && !isCredit) return false;
    if (typeFilter === "DEBIT" && isCredit) return false;

    // Payment Mode filter
    if (modeFilter !== "ALL" && t.paymentMode !== modeFilter) return false;

    // Date filters
    const tDate = new Date(t.date);
    tDate.setHours(0, 0, 0, 0);
    if (dateFrom && tDate < new Date(dateFrom)) return false;
    if (dateTo && tDate > new Date(dateTo)) return false;

    return true;
  });

  // 3. Reverse for display (most recent first)
  const displayTransactions = [...filteredTransactions].reverse();

  // Metrics for filtered list
  const totalCredits = filteredTransactions
    .filter((t) =>
      [
        "INCOME",
        "RECEIVED_FROM",
        "UDHAARI_RECEIVED",
        "TRANSFER_IN",
        "AGENCY_DEPOSIT",
      ].includes(t.type)
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDebits = filteredTransactions
    .filter(
      (t) =>
        ![
          "INCOME",
          "RECEIVED_FROM",
          "UDHAARI_RECEIVED",
          "TRANSFER_IN",
          "AGENCY_DEPOSIT",
        ].includes(t.type)
    )
    .reduce((sum, t) => sum + t.amount, 0);

  // Edit / Delete Handlers
  function openEditModal(txn: Transaction) {
    setSelectedTxn(txn);
    setEditForm({
      date: new Date(txn.date).toISOString().split("T")[0],
      amount: txn.amount.toString(),
      description: txn.description,
      partyName: txn.partyName || "",
      partyPhone: txn.partyPhone || "",
      paymentMode: txn.paymentMode || "UPI",
      referenceNo: txn.referenceNo || "",
      notes: txn.notes || "",
    });
    setError("");
    setEditTxnModal(true);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTxn) return;
    setError("");
    setSuccess("");

    if (!editForm.amount || Number(editForm.amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    if (!editForm.description.trim()) {
      setError("Description is required");
      return;
    }

    startTransition(async () => {
      const result = await editTransaction(selectedTxn.id, {
        date: editForm.date,
        amount: Number(editForm.amount),
        description: editForm.description,
        partyName: editForm.partyName,
        partyPhone: editForm.partyPhone,
        paymentMode: editForm.paymentMode,
        referenceNo: editForm.referenceNo,
        notes: editForm.notes,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess("Transaction updated successfully!");
        setEditTxnModal(false);
        setSelectedTxn(null);
        router.refresh();
      }
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this transaction? This will reverse its balance impact.")) return;
    setError("");
    setSuccess("");

    startTransition(async () => {
      const result = await deleteTransaction(id);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess("Transaction deleted successfully!");
        router.refresh();
      }
    });
  }

  function handlePrintVoucher(t: Transaction) {
    const isCredit = isCreditType(t.type);
    generateVoucherPDF({
      voucherNo: t.id.substring(t.id.length - 8).toUpperCase(),
      date: formatDate(t.date),
      type: isCredit ? "INFLOW" : "OUTFLOW",
      amount: t.amount,
      description: t.description,
      partyName: t.partyName || (isCredit ? "Received" : "Paid Out"),
      paymentMode: t.paymentMode || "UPI",
      referenceNo: t.referenceNo || "N/A",
      accountName: account.name,
      agencyName: "Gas Agency Finance Division"
    });
  }

  // Export to CSV
  function handleExportCSV() {
    try {
      const headers = [
        "Date",
        "Description",
        "Party",
        "Type",
        "Mode",
        "Reference No",
        "Amount (INR)",
        "Running Balance (INR)",
      ];

      const csvRows = filteredTransactions.map((t) => {
        const isCredit = [
          "INCOME",
          "RECEIVED_FROM",
          "UDHAARI_RECEIVED",
          "TRANSFER_IN",
          "AGENCY_DEPOSIT",
        ].includes(t.type);
        const typeLabel = isCredit ? "CREDIT" : "DEBIT";

        return [
          formatDate(t.date),
          t.description.replace(/"/g, '""'),
          (t.partyName || "").replace(/"/g, '""'),
          typeLabel,
          t.paymentMode || "",
          t.referenceNo || "",
          t.amount,
          t.runningBalance,
        ];
      });

      const csvContent =
        "data:text/csv;charset=utf-8,\uFEFF" + // BOM for excel
        [headers.join(","), ...csvRows.map((r) => r.map((val) => `"${val}"`).join(","))].join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${account.name}_Statement_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      setError("Failed to export statement: " + err.message);
    }
  }

  const isCreditType = (type: PersonalTxnType) => {
    return [
      "INCOME",
      "RECEIVED_FROM",
      "UDHAARI_RECEIVED",
      "TRANSFER_IN",
      "AGENCY_DEPOSIT",
    ].includes(type);
  };

  return (
    <div className="space-y-6">
      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-2xl text-sm">
          {success}
        </div>
      )}

      {/* ── Summary statistics row ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Current Balance</span>
          <h3 className="text-2xl font-black text-slate-800 mt-1">
            {formatCurrency(account.currentBalance)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Actual current ledger value</p>
        </div>
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Opening Balance</span>
          <h3 className="text-2xl font-black text-slate-500 mt-1">
            {formatCurrency(account.openingBalance)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Starting point of this account</p>
        </div>
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Total Credits (In)</span>
          <h3 className="text-2xl font-black text-emerald-600 mt-1">
            {formatCurrency(totalCredits)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Total deposits/income in range</p>
        </div>
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-red-600">Total Debits (Out)</span>
          <h3 className="text-2xl font-black text-red-600 mt-1">
            {formatCurrency(totalDebits)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Total expenses/drawings in range</p>
        </div>
      </div>

      {/* ── Filters and Search ── */}
      <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-[14px]">
            <Filter className="w-4 h-4 text-indigo-600" /> Filter Statement
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={filteredTransactions.length === 0}
              className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Export to CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search description, party, ref no..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Type */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="ALL">All Transactions</option>
            <option value="CREDIT">Credits (Cash In)</option>
            <option value="DEBIT">Debits (Cash Out)</option>
          </select>

          {/* Date range */}
          <div className="flex items-center gap-2 md:col-span-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* ── Transaction Statement Table ── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-5 py-3.5 text-left font-bold text-slate-500 text-xs uppercase tracking-wider">Date</th>
                <th className="px-5 py-3.5 text-left font-bold text-slate-500 text-xs uppercase tracking-wider">Description</th>
                <th className="px-5 py-3.5 text-left font-bold text-slate-500 text-xs uppercase tracking-wider">Party / Mode</th>
                <th className="px-5 py-3.5 text-center font-bold text-slate-500 text-xs uppercase tracking-wider">Type</th>
                <th className="px-5 py-3.5 text-right font-bold text-slate-500 text-xs uppercase tracking-wider">Out (Debit)</th>
                <th className="px-5 py-3.5 text-right font-bold text-slate-500 text-xs uppercase tracking-wider">In (Credit)</th>
                <th className="px-5 py-3.5 text-right font-bold text-slate-500 text-xs uppercase tracking-wider">Balance</th>
                <th className="px-5 py-3.5 text-center font-bold text-slate-500 text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center text-slate-400">
                    No transactions found matching the filters
                  </td>
                </tr>
              ) : (
                displayTransactions.map((t) => {
                  const isCredit = isCreditType(t.type);
                  return (
                    <tr
                      key={t.id}
                      className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors last:border-0"
                    >
                      <td className="px-5 py-4 text-slate-500 whitespace-nowrap">
                        {formatDate(t.date)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-800">{t.description}</div>
                        {t.referenceNo && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Ref: {t.referenceNo}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {t.partyName ? (
                          <div className="text-slate-700 font-medium">{t.partyName}</div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md inline-block mt-0.5 uppercase font-bold tracking-wider">
                          {t.paymentMode || "UPI"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center whitespace-nowrap">
                        <span
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider inline-flex items-center gap-1",
                            isCredit
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          )}
                        >
                          {isCredit ? (
                            <>
                              <ArrowDownLeft className="w-3 h-3" /> In
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="w-3 h-3" /> Out
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-rose-600 whitespace-nowrap">
                        {!isCredit ? formatCurrency(t.amount) : "—"}
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-emerald-600 whitespace-nowrap">
                        {isCredit ? formatCurrency(t.amount) : "—"}
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-slate-800 whitespace-nowrap">
                        {formatCurrency(t.runningBalance)}
                      </td>
                      <td className="px-5 py-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handlePrintVoucher(t)}
                            title="Print Voucher"
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEditModal(t)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Edit Transaction Modal ── */}
      <Modal
        open={editTxnModal}
        onClose={() => {
          setEditTxnModal(false);
          setSelectedTxn(null);
        }}
        title="Edit Transaction Record"
        size="md"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Date *
              </label>
              <input
                type="date"
                value={editForm.date}
                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Amount (₹) *
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                value={editForm.amount}
                onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                placeholder="0.00"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Description *
            </label>
            <input
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {selectedTxn && ["PAID_TO", "RECEIVED_FROM"].includes(selectedTxn.type) && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Party Name
                </label>
                <input
                  value={editForm.partyName}
                  onChange={(e) => setEditForm({ ...editForm, partyName: e.target.value })}
                  placeholder="e.g. Ramesh"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Party Phone
                </label>
                <input
                  value={editForm.partyPhone}
                  onChange={(e) => setEditForm({ ...editForm, partyPhone: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Payment Mode
              </label>
              <select
                value={editForm.paymentMode}
                onChange={(e) => setEditForm({ ...editForm, paymentMode: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="UPI">UPI (GPay / PhonePe)</option>
                <option value="CASH">Cash</option>
                <option value="CHEQUE">Cheque</option>
                <option value="NET_BANKING">Net Banking</option>
                <option value="DEBIT_CARD">Debit Card</option>
                <option value="CREDIT_CARD">Credit Card</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Reference / Cheque No
              </label>
              <input
                value={editForm.referenceNo}
                onChange={(e) => setEditForm({ ...editForm, referenceNo: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Additional Notes
            </label>
            <textarea
              rows={2}
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setEditTxnModal(false);
                setSelectedTxn(null);
              }}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition"
            >
              {isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
