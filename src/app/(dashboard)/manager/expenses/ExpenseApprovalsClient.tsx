"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  FileText,
  UserCheck,
  Hourglass,
  IndianRupee,
  Receipt,
  Search,
  Filter,
  ShieldCheck,
  MessageSquare,
  Plus,
} from "lucide-react";
import { managerReviewEmployeeExpense } from "@/app/actions/expenses";
import { AddExpenseModal } from "@/components/expenses/AddExpenseModal";
import { ExpenseCategoriesClient } from "../../admin/expense-categories/ExpenseCategoriesClient";

interface ExpenseItem {
  id: string;
  expenseDate: string | Date;
  categoryLabel: string;
  amount: number;
  receiptUrl?: string | null;
  receiptPublicId?: string | null;
  note?: string | null;
  status: "PENDING" | "MANAGER_APPROVED" | "APPROVED" | "REJECTED";
  managerNote?: string | null;
  adminNote?: string | null;
  createdAt: string | Date;
  submittedBy?: { name: string; email: string; role: string };
  manager?: { name: string } | null;
  admin?: { name: string } | null;
}

interface ExpenseApprovalsClientProps {
  initialExpenses: ExpenseItem[];
  user?: { name: string; email?: string; role: string };
  categories?: any[];
  budgetData?: any[];
  uncategorizedSpend?: number;
}

export default function ExpenseApprovalsClient({
  initialExpenses,
  user,
  categories,
  budgetData = [],
  uncategorizedSpend = 0,
}: ExpenseApprovalsClientProps) {
  const [expenses, setExpenses] = useState<ExpenseItem[]>(initialExpenses);
  const [mainTab, setMainTab] = useState<"CLAIMS" | "CATEGORIES">("CLAIMS");
  const [activeTab, setActiveTab] = useState<"PENDING" | "APPROVED" | "REJECTED" | "ALL">("PENDING");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [addExpenseModalOpen, setAddExpenseModalOpen] = useState<boolean>(false);
  const [reviewNoteModal, setReviewNoteModal] = useState<{
    id: string;
    action: "APPROVE" | "REJECT";
    category: string;
    amount: number;
    employeeName: string;
  } | null>(null);
  const [noteInput, setNoteInput] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);

  const handleReviewAction = async (id: string, action: "APPROVE" | "REJECT", note?: string) => {
    setIsSubmitting(true);
    const res = await managerReviewEmployeeExpense(id, action, note);
    setIsSubmitting(false);

    if (res.error) {
      toast.error(res.error);
    } else if (res.expense) {
      toast.success(
        action === "APPROVE"
          ? "Expense approved! Sent to Admin for final approval."
          : "Expense claim rejected."
      );
      setExpenses((prev) =>
        prev.map((item) => (item.id === id ? (res.expense as any) : item))
      );
      setReviewNoteModal(null);
      setNoteInput("");
    }
  };

  const pendingCount = expenses.filter((e) => e.status === "PENDING").length;
  const pendingAmount = expenses
    .filter((e) => e.status === "PENDING")
    .reduce((sum, e) => sum + e.amount, 0);

  const managerApprovedCount = expenses.filter(
    (e) => e.status === "MANAGER_APPROVED" || e.status === "APPROVED"
  ).length;
  const rejectedCount = expenses.filter((e) => e.status === "REJECTED").length;

  const filteredExpenses = expenses.filter((item) => {
    // Tab filter
    if (activeTab === "PENDING" && item.status !== "PENDING") return false;
    if (
      activeTab === "APPROVED" &&
      item.status !== "MANAGER_APPROVED" &&
      item.status !== "APPROVED"
    )
      return false;
    if (activeTab === "REJECTED" && item.status !== "REJECTED") return false;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const empName = item.submittedBy?.name.toLowerCase() || "";
      const cat = item.categoryLabel.toLowerCase();
      const noteStr = item.note?.toLowerCase() || "";
      return empName.includes(q) || cat.includes(q) || noteStr.includes(q);
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
            <Hourglass className="w-3.5 h-3.5 animate-spin" /> Pending Manager Review
          </span>
        );
      case "MANAGER_APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20">
            <UserCheck className="w-3.5 h-3.5" /> Approved by Manager (Awaiting Admin)
          </span>
        );
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Final Approved by Admin
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex gap-1 bg-muted/60 p-1 rounded-xl w-fit">
        <button
          onClick={() => setMainTab("CLAIMS")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
            mainTab === "CLAIMS"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Employee Claims & Approvals
        </button>
        <button
          onClick={() => setMainTab("CATEGORIES")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
            mainTab === "CATEGORIES"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Expense Categories & Budgets
        </button>
      </div>

      {mainTab === "CATEGORIES" ? (
        <ExpenseCategoriesClient
          budgetData={budgetData}
          uncategorizedSpend={uncategorizedSpend}
          categories={categories || []}
          expenses={[]}
        />
      ) : (
        <>
          {/* Metrics Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Pending Claims
            </p>
            <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {pendingCount}
            </h3>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600">
            <Hourglass className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Pending Amount
            </p>
            <h3 className="text-2xl font-bold text-foreground mt-1">
              ₹{pendingAmount.toLocaleString("en-IN")}
            </h3>
          </div>
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600">
            <IndianRupee className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Approved Claims
            </p>
            <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {managerApprovedCount}
            </h3>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Rejected Claims
            </p>
            <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
              {rejectedCount}
            </h3>
          </div>
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-600">
            <XCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Control Bar: Tabs & Search */}
      <div className="bg-card rounded-2xl border shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center bg-muted/60 p-1 rounded-xl gap-1 overflow-x-auto">
          {(["PENDING", "APPROVED", "REJECTED", "ALL"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                activeTab === tab
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "PENDING"
                ? `Pending (${pendingCount})`
                : tab === "APPROVED"
                ? "Approved"
                : tab === "REJECTED"
                ? "Rejected"
                : "All Claims"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search employee, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border bg-background text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <button
            onClick={() => setAddExpenseModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-md transition flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Add Expense
          </button>
        </div>
      </div>

      {/* Expense Approvals List */}
      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-semibold text-muted-foreground">No expense claims found.</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredExpenses.map((exp) => (
              <div
                key={exp.id}
                className="p-5 hover:bg-muted/20 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-base text-foreground">
                      {exp.submittedBy?.name || "Unknown Staff"}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary uppercase">
                      {exp.submittedBy?.role || "STAFF"}
                    </span>
                    {getStatusBadge(exp.status)}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground bg-muted px-2.5 py-1 rounded-md">
                      {exp.categoryLabel}
                    </span>
                    <span className="text-base font-bold text-blue-600 dark:text-blue-400">
                      ₹{exp.amount.toLocaleString("en-IN")}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(exp.expenseDate).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>

                  {exp.note && (
                    <p className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg border max-w-2xl">
                      <span className="font-semibold text-foreground">Note: </span>
                      {exp.note}
                    </p>
                  )}

                  {/* Manager/Admin review comments */}
                  {exp.managerNote && (
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      <span className="font-semibold">Manager Note: </span>
                      {exp.managerNote}
                    </p>
                  )}
                  {exp.adminNote && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      <span className="font-semibold">Admin Note: </span>
                      {exp.adminNote}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {exp.receiptUrl && (
                    <button
                      onClick={() => setSelectedReceiptUrl(exp.receiptUrl!)}
                      className="px-3 py-2 rounded-xl bg-muted text-xs font-semibold hover:bg-muted/80 transition flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-500" /> Receipt Photo
                    </button>
                  )}

                  {exp.status === "PENDING" && (
                    <>
                      <button
                        onClick={() =>
                          setReviewNoteModal({
                            id: exp.id,
                            action: "APPROVE",
                            category: exp.categoryLabel,
                            amount: exp.amount,
                            employeeName: exp.submittedBy?.name || "Staff",
                          })
                        }
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                      </button>

                      <button
                        onClick={() =>
                          setReviewNoteModal({
                            id: exp.id,
                            action: "REJECT",
                            category: exp.categoryLabel,
                            amount: exp.amount,
                            employeeName: exp.submittedBy?.name || "Staff",
                          })
                        }
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal (Note input) */}
      {reviewNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background rounded-2xl p-6 max-w-md w-full border shadow-2xl space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              {reviewNoteModal.action === "APPROVE" ? "Approve Expense Claim" : "Reject Expense Claim"}
            </h3>
            <p className="text-xs text-muted-foreground">
              Confirm action for <span className="font-semibold text-foreground">{reviewNoteModal.employeeName}</span>&apos;s{" "}
              <span className="font-semibold text-foreground">{reviewNoteModal.category}</span> claim of ₹
              {reviewNoteModal.amount.toLocaleString("en-IN")}.
            </p>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Manager Remark / Note (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Verified with fuel bill receipt."
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                className="w-full p-3 rounded-xl border bg-background text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setReviewNoteModal(null);
                  setNoteInput("");
                }}
                className="px-4 py-2 rounded-xl border text-xs font-semibold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() =>
                  handleReviewAction(reviewNoteModal.id, reviewNoteModal.action, noteInput)
                }
                className={`px-4 py-2 rounded-xl text-white text-xs font-semibold shadow-md ${
                  reviewNoteModal.action === "APPROVE"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {isSubmitting ? "Processing..." : `Confirm ${reviewNoteModal.action === "APPROVE" ? "Approval" : "Rejection"}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Photo Modal */}
      {selectedReceiptUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-background rounded-2xl overflow-hidden max-w-2xl w-full shadow-2xl border relative">
            <div className="p-4 border-b flex items-center justify-between bg-muted/40">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Receipt className="w-4 h-4 text-blue-600" /> Receipt Verification Photo
              </h3>
              <button
                onClick={() => setSelectedReceiptUrl(null)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-black/5 max-h-[75vh] overflow-auto">
              {/* eslint-disable-next-next/image-element */}
              <img
                src={selectedReceiptUrl}
                alt="Uploaded receipt"
                className="max-h-[65vh] object-contain rounded-lg shadow-md"
              />
            </div>
            <div className="p-3 border-t bg-muted/20 flex justify-end">
              <a
                href={selectedReceiptUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-sm hover:opacity-90 transition"
              >
                Open Full Resolution
              </a>
            </div>
          </div>
        </div>
      )}
      </>
      )}
      {/* Add Expense Entry Modal */}
      <AddExpenseModal
        open={addExpenseModalOpen}
        onClose={() => setAddExpenseModalOpen(false)}
        user={user || { name: "Manager User", role: "MANAGER" }}
        categories={categories}
        onSuccess={(newExp) => {
          setExpenses((prev) => [newExp, ...prev]);
        }}
      />
    </div>
  );
}
