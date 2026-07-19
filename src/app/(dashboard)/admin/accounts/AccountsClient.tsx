"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Plus,
  ArrowRightLeft,
  Building,
  PiggyBank,
  Wallet as WalletIcon,
  PlusCircle,
  HelpCircle,
  Pencil,
  Trash2,
  ListCollapse,
  Activity,
  ArrowUpRight,
  ArrowDownLeft
} from "lucide-react";
import {
  createPersonalAccount,
  updatePersonalAccount,
  deletePersonalAccount
} from "@/app/actions/personal-accounts";
import { addTransaction } from "@/app/actions/personal-transactions";
import { PersonalAccountType, PersonalTxnType } from "@/generated/prisma";
import { cn } from "@/lib/utils";
import Link from "next/link";

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
  isActive: boolean;
  createdAt: Date;
}

interface AccountsClientProps {
  initialAccounts: Account[];
  userId: string;
}

const PRESET_COLORS = [
  "#4F46E5", // Indigo
  "#10B981", // Emerald
  "#3B82F6", // Blue
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#14B8A6", // Teal
  "#6B7280", // Gray
];

export function AccountsClient({ initialAccounts, userId }: AccountsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modals state
  const [accountModal, setAccountModal] = useState(false);
  const [editAccountModal, setEditAccountModal] = useState(false);
  const [txnModal, setTxnModal] = useState(false);

  // Forms state
  const [accountForm, setAccountForm] = useState({
    name: "",
    accountType: "SAVINGS" as PersonalAccountType,
    bankName: "",
    accountNo: "",
    ifscCode: "",
    openingBalance: "0",
    isAgencyAccount: false,
    color: PRESET_COLORS[0],
    notes: "",
  });

  const [selectedAccountForEdit, setSelectedAccountForEdit] = useState<Account | null>(null);

  const [txnForm, setTxnForm] = useState({
    accountId: "",
    date: new Date().toISOString().split("T")[0],
    type: "INCOME" as PersonalTxnType,
    amount: "",
    description: "",
    partyName: "",
    partyPhone: "",
    paymentMode: "UPI",
    referenceNo: "",
    tags: "",
    notes: "",
  });

  // Derived financial metrics
  const totalAssets = initialAccounts
    .filter((a) => a.accountType !== "LOAN")
    .reduce((sum, a) => sum + a.currentBalance, 0);

  const totalLiabilities = initialAccounts
    .filter((a) => a.accountType === "LOAN")
    .reduce((sum, a) => sum + Math.abs(a.currentBalance), 0);

  const netWorth = totalAssets - totalLiabilities;

  const agencyAccount = initialAccounts.find((a) => a.isAgencyAccount);

  // Handlers
  async function handleAddAccount(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!accountForm.name.trim()) {
      setError("Account name is required");
      return;
    }

    startTransition(async () => {
      const result = await createPersonalAccount({
        name: accountForm.name,
        accountType: accountForm.accountType,
        bankName: accountForm.bankName,
        accountNo: accountForm.accountNo,
        ifscCode: accountForm.ifscCode,
        openingBalance: Number(accountForm.openingBalance) || 0,
        isAgencyAccount: accountForm.isAgencyAccount,
        color: accountForm.color,
        notes: accountForm.notes,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess("Account created successfully!");
        setAccountModal(false);
        setAccountForm({
          name: "",
          accountType: "SAVINGS",
          bankName: "",
          accountNo: "",
          ifscCode: "",
          openingBalance: "0",
          isAgencyAccount: false,
          color: PRESET_COLORS[0],
          notes: "",
        });
        router.refresh();
      }
    });
  }

  async function handleEditAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAccountForEdit) return;
    setError("");
    setSuccess("");

    if (!selectedAccountForEdit.name.trim()) {
      setError("Account name is required");
      return;
    }

    startTransition(async () => {
      const result = await updatePersonalAccount(selectedAccountForEdit.id, {
        name: selectedAccountForEdit.name,
        bankName: selectedAccountForEdit.bankName || undefined,
        accountNo: selectedAccountForEdit.accountNo || undefined,
        ifscCode: selectedAccountForEdit.ifscCode || undefined,
        openingBalance: selectedAccountForEdit.openingBalance,
        isAgencyAccount: selectedAccountForEdit.isAgencyAccount,
        color: selectedAccountForEdit.color || undefined,
        notes: selectedAccountForEdit.notes || undefined,
        isActive: selectedAccountForEdit.isActive,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess("Account updated successfully!");
        setEditAccountModal(false);
        setSelectedAccountForEdit(null);
        router.refresh();
      }
    });
  }

  async function handleDeleteAccount(id: string) {
    if (!confirm("Are you sure you want to archive/delete this account?")) return;
    setError("");
    setSuccess("");

    startTransition(async () => {
      const result = await deletePersonalAccount(id);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess("Account deleted successfully!");
        setEditAccountModal(false);
        router.refresh();
      }
    });
  }

  async function handleAddTxn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!txnForm.accountId) {
      setError("Please select an account");
      return;
    }
    if (!txnForm.amount || Number(txnForm.amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    if (!txnForm.description.trim()) {
      setError("Description is required");
      return;
    }

    startTransition(async () => {
      const result = await addTransaction({
        accountId: txnForm.accountId,
        date: txnForm.date,
        type: txnForm.type,
        amount: Number(txnForm.amount),
        description: txnForm.description,
        partyName: txnForm.partyName || undefined,
        partyPhone: txnForm.partyPhone || undefined,
        paymentMode: txnForm.paymentMode,
        referenceNo: txnForm.referenceNo || undefined,
        tags: txnForm.tags ? txnForm.tags.split(",").map((t) => t.trim()) : [],
        notes: txnForm.notes || undefined,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess("Transaction recorded successfully!");
        setTxnModal(false);
        setTxnForm({
          accountId: "",
          date: new Date().toISOString().split("T")[0],
          type: "INCOME",
          amount: "",
          description: "",
          partyName: "",
          partyPhone: "",
          paymentMode: "UPI",
          referenceNo: "",
          tags: "",
          notes: "",
        });
        router.refresh();
      }
    });
  }

  const getAccountTypeIcon = (type: PersonalAccountType) => {
    switch (type) {
      case "SAVINGS":
      case "CURRENT":
        return <Building className="w-5 h-5" />;
      case "CASH":
        return <BanknoteIcon className="w-5 h-5" />;
      case "WALLET":
        return <WalletIcon className="w-5 h-5" />;
      case "FD":
        return <PiggyBank className="w-5 h-5" />;
      case "LOAN":
        return <ArrowRightLeft className="w-5 h-5" />;
      default:
        return <HelpCircle className="w-5 h-5" />;
    }
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

      {/* ── Net Worth Summary Bar ── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 p-6 rounded-3xl shadow-xl text-white">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-1 border-r border-slate-700/50 pr-4">
            <span className="text-[12px] uppercase tracking-wider text-slate-400 font-medium">Net Worth</span>
            <h2 className="text-3xl font-extrabold tracking-tight">{formatCurrency(netWorth)}</h2>
            <p className="text-[11px] text-slate-400">Total assets minus liabilities</p>
          </div>
          <div className="space-y-1 border-r border-slate-700/50 pr-4">
            <span className="text-[12px] uppercase tracking-wider text-slate-400 font-medium">Total Assets</span>
            <h3 className="text-xl font-bold text-emerald-400">{formatCurrency(totalAssets)}</h3>
            <p className="text-[11px] text-slate-400">Bank, Cash, Wallets & FDs</p>
          </div>
          <div className="space-y-1 border-r border-slate-700/50 pr-4">
            <span className="text-[12px] uppercase tracking-wider text-slate-400 font-medium">Total Liabilities</span>
            <h3 className="text-xl font-bold text-red-400">{formatCurrency(totalLiabilities)}</h3>
            <p className="text-[11px] text-slate-400">Personal loans outstanding</p>
          </div>
          <div className="space-y-1 bg-amber-500/10 p-3 rounded-2xl border border-amber-500/20">
            <span className="text-[11px] uppercase tracking-wider text-amber-300 font-semibold flex items-center gap-1">
              <Activity className="w-3.5 h-3.5" /> Agency Account
            </span>
            <h3 className="text-xl font-bold text-amber-400">
              {agencyAccount ? formatCurrency(agencyAccount.currentBalance) : "Not Configured"}
            </h3>
            <p className="text-[10px] text-slate-400">Official linked agency bank account</p>
          </div>
        </div>
      </div>

      {/* ── Quick Actions Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setError("");
              if (initialAccounts.length === 0) {
                setError("Please create an account first");
                return;
              }
              setTxnModal(true);
            }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" /> Add Transaction
          </button>
          <Link
            href="/admin/accounts/transfer"
            className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-200 transition"
          >
            <ArrowRightLeft className="w-4 h-4" /> Fund Transfer
          </Link>
          {agencyAccount && (
            <Link
              href="/admin/accounts/agency-account"
              className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-100 transition"
            >
              <Activity className="w-4 h-4" /> Agency Tab
            </Link>
          )}
        </div>

        <button
          onClick={() => {
            setError("");
            setAccountForm({
              name: "",
              accountType: "SAVINGS",
              bankName: "",
              accountNo: "",
              ifscCode: "",
              openingBalance: "0",
              isAgencyAccount: false,
              color: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
              notes: "",
            });
            setAccountModal(true);
          }}
          className="flex items-center gap-2 border border-indigo-200 text-indigo-700 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-50/50 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Account
        </button>
      </div>

      {/* ── Account Cards Grid ── */}
      <div>
        <h3 className="font-bold text-slate-800 text-[15px] mb-4 flex items-center gap-2">
          <span>Active Accounts</span>
          <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            {initialAccounts.length} accounts
          </span>
        </h3>

        {initialAccounts.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center shadow-sm">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500 mx-auto mb-4">
              <WalletIcon className="w-8 h-8" />
            </div>
            <h4 className="font-bold text-slate-800 mb-1">No Accounts Added Yet</h4>
            <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
              Track your physical cash, wallets, personal savings or business current accounts in one dashboard.
            </p>
            <button
              onClick={() => setAccountModal(true)}
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition cursor-pointer"
            >
              Add Your First Account
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {initialAccounts.map((account) => {
              const bgStyle = account.color || "#4F46E5";
              return (
                <div
                  key={account.id}
                  className="group relative rounded-3xl overflow-hidden border border-slate-100 bg-white hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                  style={{
                    boxShadow: "0 4px 20px -2px rgba(148, 163, 184, 0.08)",
                  }}
                >
                  {/* Color strip / Glassy card header */}
                  <div
                    className="p-5 text-white relative"
                    style={{
                      background: `linear-gradient(135deg, ${bgStyle} 0%, ${bgStyle}dd 100%)`,
                    }}
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                        {getAccountTypeIcon(account.accountType)}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {account.isAgencyAccount && (
                          <span className="text-[9px] bg-amber-400/90 text-slate-900 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Agency
                          </span>
                        )}
                        <button
                          onClick={() => {
                            setSelectedAccountForEdit(account);
                            setEditAccountModal(true);
                          }}
                          className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5 text-white" />
                        </button>
                      </div>
                    </div>

                    {/* Middle details */}
                    <div className="mt-6">
                      <span className="text-[10px] text-white/70 uppercase tracking-widest font-semibold block">
                        {account.bankName || account.accountType}
                      </span>
                      <h4 className="font-extrabold text-[16px] tracking-tight mt-0.5 text-white truncate pr-6">
                        {account.name}
                      </h4>
                      {account.accountNo && (
                        <p className="text-[11px] text-white/60 tracking-wider font-mono mt-1">
                          •••• {account.accountNo.slice(-4)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Balance / Footer row */}
                  <div className="p-5 bg-white flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] text-slate-400 font-semibold block">Available Balance</span>
                      <h3
                        className={cn(
                          "text-2xl font-black mt-1 tracking-tight",
                          account.accountType === "LOAN" ? "text-red-600" : "text-slate-800"
                        )}
                      >
                        {formatCurrency(account.currentBalance)}
                      </h3>
                      {account.notes && (
                        <p className="text-slate-400 text-xs mt-2 italic truncate">{account.notes}</p>
                      )}
                    </div>

                    <div className="border-t border-slate-50 mt-4 pt-3 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">
                        Added {formatDate(account.createdAt)}
                      </span>
                      <Link
                        href={`/admin/accounts/${account.id}`}
                        className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                      >
                        View Statement <ChevronRightIcon className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Add Account Modal ── */}
      <Modal
        open={accountModal}
        onClose={() => setAccountModal(false)}
        title="Add Personal Account"
        size="md"
      >
        <form onSubmit={handleAddAccount} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Account Name *
            </label>
            <input
              value={accountForm.name}
              onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
              placeholder="e.g. SBI Salary Account, Cash Box"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Account Type *
              </label>
              <select
                value={accountForm.accountType}
                onChange={(e) =>
                  setAccountForm({
                    ...accountForm,
                    accountType: e.target.value as PersonalAccountType,
                  })
                }
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="SAVINGS">Savings Account</option>
                <option value="CURRENT">Current Account</option>
                <option value="CASH">Cash in Hand</option>
                <option value="WALLET">Wallet (GPay/PhonePe)</option>
                <option value="FD">Fixed Deposit (FD)</option>
                <option value="LOAN">Personal Loan</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Opening Balance (₹) *
              </label>
              <input
                type="number"
                value={accountForm.openingBalance}
                onChange={(e) => setAccountForm({ ...accountForm, openingBalance: e.target.value })}
                placeholder="0.00"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {["SAVINGS", "CURRENT"].includes(accountForm.accountType) && (
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Bank Name
                </label>
                <input
                  value={accountForm.bankName}
                  onChange={(e) => setAccountForm({ ...accountForm, bankName: e.target.value })}
                  placeholder="e.g. State Bank of India"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Last 4 Digits
                </label>
                <input
                  maxLength={4}
                  value={accountForm.accountNo}
                  onChange={(e) => setAccountForm({ ...accountForm, accountNo: e.target.value })}
                  placeholder="4521"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Card Theme Color
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  type="button"
                  key={color}
                  onClick={() => setAccountForm({ ...accountForm, color })}
                  className={cn(
                    "w-7 h-7 rounded-full transition-transform",
                    accountForm.color === color ? "scale-125 ring-2 ring-indigo-500" : ""
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <input
              type="checkbox"
              id="isAgency"
              checked={accountForm.isAgencyAccount}
              onChange={(e) =>
                setAccountForm({ ...accountForm, isAgencyAccount: e.target.checked })
              }
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="isAgency" className="text-xs font-semibold text-slate-700 cursor-pointer">
              Mark as official Agency Account (auto-syncs drawings/expenses)
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Notes
            </label>
            <textarea
              rows={2}
              value={accountForm.notes}
              onChange={(e) => setAccountForm({ ...accountForm, notes: e.target.value })}
              placeholder="Add bank details or branch name..."
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setAccountModal(false)}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition"
            >
              {isPending ? "Creating..." : "Create Account"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Account Modal ── */}
      <Modal
        open={editAccountModal}
        onClose={() => {
          setEditAccountModal(false);
          setSelectedAccountForEdit(null);
        }}
        title="Edit Account Details"
        size="md"
      >
        {selectedAccountForEdit && (
          <form onSubmit={handleEditAccount} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Account Name *
              </label>
              <input
                value={selectedAccountForEdit.name}
                onChange={(e) =>
                  setSelectedAccountForEdit({ ...selectedAccountForEdit, name: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Opening Balance (₹) *
                </label>
                <input
                  type="number"
                  value={selectedAccountForEdit.openingBalance}
                  onChange={(e) =>
                    setSelectedAccountForEdit({
                      ...selectedAccountForEdit,
                      openingBalance: Number(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Bank Name
                </label>
                <input
                  value={selectedAccountForEdit.bankName || ""}
                  onChange={(e) =>
                    setSelectedAccountForEdit({
                      ...selectedAccountForEdit,
                      bankName: e.target.value,
                    })
                  }
                  placeholder="e.g. HDFC"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Account No (Last 4 digits)
                </label>
                <input
                  value={selectedAccountForEdit.accountNo || ""}
                  onChange={(e) =>
                    setSelectedAccountForEdit({
                      ...selectedAccountForEdit,
                      accountNo: e.target.value,
                    })
                  }
                  placeholder="e.g. 5623"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  IFSC Code
                </label>
                <input
                  value={selectedAccountForEdit.ifscCode || ""}
                  onChange={(e) =>
                    setSelectedAccountForEdit({
                      ...selectedAccountForEdit,
                      ifscCode: e.target.value,
                    })
                  }
                  placeholder="IFSC"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Card Theme Color
              </label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    type="button"
                    key={color}
                    onClick={() =>
                      setSelectedAccountForEdit({ ...selectedAccountForEdit, color })
                    }
                    className={cn(
                      "w-7 h-7 rounded-full transition-transform",
                      selectedAccountForEdit.color === color ? "scale-125 ring-2 ring-indigo-500" : ""
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <input
                type="checkbox"
                id="editIsAgency"
                checked={selectedAccountForEdit.isAgencyAccount}
                onChange={(e) =>
                  setSelectedAccountForEdit({
                    ...selectedAccountForEdit,
                    isAgencyAccount: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="editIsAgency" className="text-xs font-semibold text-slate-700 cursor-pointer">
                Mark as official Agency Account
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Notes
              </label>
              <textarea
                rows={2}
                value={selectedAccountForEdit.notes || ""}
                onChange={(e) =>
                  setSelectedAccountForEdit({ ...selectedAccountForEdit, notes: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
              <button
                type="button"
                onClick={() => handleDeleteAccount(selectedAccountForEdit.id)}
                className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-800 transition"
              >
                <Trash2 className="w-4 h-4" /> Archive Account
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditAccountModal(false);
                    setSelectedAccountForEdit(null);
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
            </div>
          </form>
        )}
      </Modal>

      {/* ── Add Transaction Modal ── */}
      <Modal
        open={txnModal}
        onClose={() => setTxnModal(false)}
        title="Record Personal Transaction"
        size="md"
      >
        <form onSubmit={handleAddTxn} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Select Account *
              </label>
              <select
                value={txnForm.accountId}
                onChange={(e) => setTxnForm({ ...txnForm, accountId: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">-- Choose Account --</option>
                {initialAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({formatCurrency(a.currentBalance)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Transaction Date *
              </label>
              <input
                type="date"
                value={txnForm.date}
                onChange={(e) => setTxnForm({ ...txnForm, date: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Type *
              </label>
              <select
                value={txnForm.type}
                onChange={(e) =>
                  setTxnForm({ ...txnForm, type: e.target.value as PersonalTxnType })
                }
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="INCOME">Income / Deposit</option>
                <option value="EXPENSE">Expense / Purchase</option>
                <option value="PAID_TO">Paid To Someone</option>
                <option value="RECEIVED_FROM">Received From Someone</option>
                <option value="AGENCY_DEPOSIT">Capital Deposit to Agency</option>
                <option value="AGENCY_WITHDRAWAL">Drawing from Agency</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Amount (₹) *
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                value={txnForm.amount}
                onChange={(e) => setTxnForm({ ...txnForm, amount: e.target.value })}
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
              value={txnForm.description}
              onChange={(e) => setTxnForm({ ...txnForm, description: e.target.value })}
              placeholder="e.g. Fuel purchase, Rent payment, Paid Mahesh"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {["PAID_TO", "RECEIVED_FROM"].includes(txnForm.type) && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Party Name
                </label>
                <input
                  value={txnForm.partyName}
                  onChange={(e) => setTxnForm({ ...txnForm, partyName: e.target.value })}
                  placeholder="e.g. Ramesh Patil"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Party Phone
                </label>
                <input
                  value={txnForm.partyPhone}
                  onChange={(e) => setTxnForm({ ...txnForm, partyPhone: e.target.value })}
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
                value={txnForm.paymentMode}
                onChange={(e) => setTxnForm({ ...txnForm, paymentMode: e.target.value })}
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
                Reference / UTR / Cheque No
              </label>
              <input
                value={txnForm.referenceNo}
                onChange={(e) => setTxnForm({ ...txnForm, referenceNo: e.target.value })}
                placeholder="UTR or Cheque Number"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Tags (comma separated)
              </label>
              <input
                value={txnForm.tags}
                onChange={(e) => setTxnForm({ ...txnForm, tags: e.target.value })}
                placeholder="e.g. personal, medical, office-drawings"
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
              value={txnForm.notes}
              onChange={(e) => setTxnForm({ ...txnForm, notes: e.target.value })}
              placeholder="Any extra context for this transaction..."
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setTxnModal(false)}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition"
            >
              {isPending ? "Recording..." : "Save Transaction"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// Reusable icons
function BanknoteIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      {...props}
    >
      <rect width="20" height="12" x="2" y="6" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  );
}

function ChevronRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.5}
      stroke="currentColor"
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}
