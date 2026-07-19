"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addTransfer } from "@/app/actions/personal-transactions";
import { formatCurrency } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import {
  ArrowRightLeft,
  ArrowRight,
  Info,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Building,
  DollarSign
} from "lucide-react";
import { PersonalAccountType } from "@/generated/prisma";
import { cn } from "@/lib/utils";

interface Account {
  id: string;
  name: string;
  accountType: PersonalAccountType;
  currentBalance: number;
  isAgencyAccount: boolean;
  bankName: string | null;
  accountNo: string | null;
}

interface TransferClientProps {
  accounts: Account[];
}

export function TransferClient({ accounts }: TransferClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMode, setPaymentMode] = useState("BANK_TRANSFER");
  const [referenceNo, setReferenceNo] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState(false);

  // Selected accounts objects
  const fromAccount = accounts.find((a) => a.id === fromAccountId);
  const toAccount = accounts.find((a) => a.id === toAccountId);
  const agencyAccount = accounts.find((a) => a.isAgencyAccount);

  const transferAmount = Number(amount) || 0;

  // Expected ending balances
  const fromBalanceAfter = fromAccount ? fromAccount.currentBalance - transferAmount : 0;
  const toBalanceAfter = toAccount ? toAccount.currentBalance + transferAmount : 0;

  // Quick prefill for Agency Account
  function handleQuickPrefillAgency() {
    if (agencyAccount) {
      setToAccountId(agencyAccount.id);
      if (fromAccountId === agencyAccount.id) {
        setFromAccountId(""); // clear source if same
      }
    }
  }

  // Pre-submit validation
  function handlePreSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!fromAccountId) {
      setError("Please select a source account (From)");
      return;
    }
    if (!toAccountId) {
      setError("Please select a destination account (To)");
      return;
    }
    if (fromAccountId === toAccountId) {
      setError("Source and destination accounts must be different");
      return;
    }
    if (transferAmount <= 0) {
      setError("Please enter a valid transfer amount greater than ₹0");
      return;
    }
    if (!date) {
      setError("Please select a transfer date");
      return;
    }

    setConfirmModal(true);
  }

  // Confirm Submit
  function handleConfirmSubmit() {
    setConfirmModal(false);
    setError("");
    setSuccess("");

    startTransition(async () => {
      const result = await addTransfer(fromAccountId, toAccountId, transferAmount, {
        date,
        description: description || undefined,
        paymentMode,
        referenceNo: referenceNo || undefined,
        notes: notes || undefined,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess("Transfer executed atomically and balances updated!");
        // Reset form
        setFromAccountId("");
        setToAccountId("");
        setAmount("");
        setReferenceNo("");
        setDescription("");
        setNotes("");
        router.refresh();
      }
    });
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-2xl text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> {success}
        </div>
      )}

      {/* ── main container ── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8">
        <form onSubmit={handlePreSubmit} className="space-y-6">
          {/* Transfer Flow Visualization */}
          <div className="grid grid-cols-1 md:grid-cols-7 items-center gap-4 bg-slate-50 p-6 rounded-2xl">
            {/* From Account block */}
            <div className="md:col-span-3 space-y-2">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider">
                Source Account (Debit)
              </label>
              <select
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                className="w-full px-3 py-3 border border-slate-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">-- Choose Account --</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({formatCurrency(a.currentBalance)})
                  </option>
                ))}
              </select>

              {fromAccount && (
                <div className="text-xs text-slate-500 mt-1 flex justify-between font-medium">
                  <span>Current: {formatCurrency(fromAccount.currentBalance)}</span>
                  {transferAmount > 0 && (
                    <span className={cn(fromBalanceAfter < 0 ? "text-red-500 font-bold" : "text-slate-400")}>
                      Result: {formatCurrency(fromBalanceAfter)}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Arrow Divider */}
            <div className="md:col-span-1 flex justify-center py-2 md:py-0">
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm">
                <ArrowRight className="w-5 h-5 hidden md:block" />
                <ArrowRightLeft className="w-5 h-5 md:hidden rotate-90" />
              </div>
            </div>

            {/* To Account block */}
            <div className="md:col-span-3 space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider">
                  Destination Account (Credit)
                </label>
                {agencyAccount && toAccountId !== agencyAccount.id && (
                  <button
                    type="button"
                    onClick={handleQuickPrefillAgency}
                    className="text-[10px] font-bold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded transition flex items-center gap-1 cursor-pointer"
                  >
                    <Building className="w-3 h-3" /> Quick Agency Select
                  </button>
                )}
              </div>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="w-full px-3 py-3 border border-slate-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">-- Choose Account --</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({formatCurrency(a.currentBalance)})
                  </option>
                ))}
              </select>

              {toAccount && (
                <div className="text-xs text-slate-500 mt-1 flex justify-between font-medium">
                  <span>Current: {formatCurrency(toAccount.currentBalance)}</span>
                  {transferAmount > 0 && (
                    <span className="text-emerald-600 font-bold">
                      Result: {formatCurrency(toBalanceAfter)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Form inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Transfer Amount (₹) *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold">
                  ₹
                </div>
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Transfer Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Payment Mode / Type
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS/RTGS)</option>
                <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                <option value="CASH">Cash Withdrawal/Deposit</option>
                <option value="CHEQUE">Cheque Transfer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                UTR / Reference Number / Cheque No.
              </label>
              <input
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="UTR transaction log ID"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Custom Description
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Leave blank for auto-generated description"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Additional Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any internal remarks or transfer context..."
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowRightLeft className="w-4 h-4" /> Transfer Funds
            </button>
          </div>
        </form>
      </div>

      {/* ── Confirmation Modal ── */}
      <Modal
        open={confirmModal}
        onClose={() => setConfirmModal(false)}
        title="Confirm Atomic Fund Transfer"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-3">
            <h4 className="font-extrabold text-sm text-slate-700 uppercase tracking-wider">Transfer Preview</h4>
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-500">Transfer Amount:</span>
              <span className="font-black text-slate-900 text-sm">{formatCurrency(transferAmount)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-500">Mode:</span>
              <span className="font-bold text-indigo-600">{paymentMode}</span>
            </div>
          </div>

          {/* Balance comparison check */}
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b border-slate-50 pb-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">From Account</span>
                <p className="font-bold text-sm text-slate-800">{fromAccount?.name}</p>
              </div>
              <div className="text-right">
                <span className="text-slate-400 line-through text-xs font-semibold">
                  {formatCurrency(fromAccount?.currentBalance || 0)}
                </span>
                <p className={cn("font-black text-sm", fromBalanceAfter < 0 ? "text-red-600 animate-pulse" : "text-slate-800")}>
                  {formatCurrency(fromBalanceAfter)}
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">To Account</span>
                <p className="font-bold text-sm text-slate-800">{toAccount?.name}</p>
              </div>
              <div className="text-right">
                <span className="text-slate-400 line-through text-xs font-semibold">
                  {formatCurrency(toAccount?.currentBalance || 0)}
                </span>
                <p className="font-black text-emerald-600 text-sm">
                  {formatCurrency(toBalanceAfter)}
                </p>
              </div>
            </div>
          </div>

          {fromBalanceAfter < 0 && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-2xl flex items-start gap-2 text-xs text-red-800">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Warning: Overdraft Alert</p>
                <p>The source account balance will drop below zero after this transfer.</p>
              </div>
            </div>
          )}

          <div className="bg-indigo-50/50 p-3.5 rounded-2xl text-[11px] text-indigo-900 flex items-start gap-2">
            <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <p>
              This is a double-entry transaction. An outflow log (`TRANSFER_OUT`) will be written in the source account, and a companion inflow log (`TRANSFER_IN`) will be written in the destination account atomically.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setConfirmModal(false)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmSubmit}
              disabled={isPending}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-sm transition cursor-pointer"
            >
              {isPending ? "Executing..." : "Confirm & Transfer"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
