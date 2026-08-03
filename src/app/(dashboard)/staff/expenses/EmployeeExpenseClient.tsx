"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Receipt,
  PlusCircle,
  Clock,
  UserCheck,
  UploadCloud,
  CheckCircle2,
  XCircle,
  Hourglass,
  FileText,
  Trash2,
  Eye,
  IndianRupee,
  Sparkles,
  Tag,
  AlertCircle,
} from "lucide-react";
import { submitEmployeeExpense, deleteEmployeeExpense } from "@/app/actions/expenses";

interface UserProfile {
  name: string;
  email: string;
  role: string;
}

interface CategoryOption {
  id: string;
  name: string;
  color?: string | null;
}

interface EmployeeExpenseItem {
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

interface EmployeeExpenseClientProps {
  user: UserProfile;
  categories: CategoryOption[];
  initialExpenses: EmployeeExpenseItem[];
}

export default function EmployeeExpenseClient({
  user,
  categories,
  initialExpenses,
}: EmployeeExpenseClientProps) {
  // Live Date Time State
  const [currentDateTime, setCurrentDateTime] = useState<string>("");
  const [editableDateTime, setEditableDateTime] = useState<string>("");

  // Form State
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [customCategory, setCustomCategory] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [note, setNote] = useState<string>("");

  // File Upload State
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // List & Filter State
  const [expenses, setExpenses] = useState<EmployeeExpenseItem[]>(initialExpenses);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);

  // Update real-time clock and default editable field
  useEffect(() => {
    const formatForInput = (d: Date) => {
      const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
      const yyyy = d.getFullYear();
      const mm = pad(d.getMonth() + 1);
      const dd = pad(d.getDate());
      const hh = pad(d.getHours());
      const min = pad(d.getMinutes());
      return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
    };

    const now = new Date();
    setEditableDateTime(formatForInput(now));

    const interval = setInterval(() => {
      const tick = new Date();
      setCurrentDateTime(
        tick.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB");
      return;
    }

    setReceiptFile(file);

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setReceiptPreview(null);
    }
  };

  const clearReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalCategory =
      selectedCategoryId === "CUSTOM"
        ? customCategory.trim()
        : categories.find((c) => c.id === selectedCategoryId)?.name || customCategory.trim();

    if (!finalCategory) {
      toast.error("Please select or enter an expense category.");
      return;
    }

    const numericAmount = parseFloat(amount);
    if (!numericAmount || numericAmount <= 0) {
      toast.error("Please enter a valid expense amount.");
      return;
    }

    setIsSubmitting(true);
    let uploadedUrl: string | undefined = undefined;
    let uploadedPublicId: string | undefined = undefined;

    // Handle receipt file upload to Cloudinary if file provided
    if (receiptFile) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", receiptFile);

        const uploadRes = await fetch("/api/upload-receipt", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadRes.json();

        if (!uploadRes.ok || uploadData.error) {
          throw new Error(uploadData.error || "Receipt upload failed");
        }

        uploadedUrl = uploadData.url;
        uploadedPublicId = uploadData.publicId;
      } catch (err: any) {
        setIsUploading(false);
        setIsSubmitting(false);
        toast.error(err.message || "Failed to upload receipt photo to Cloudinary");
        return;
      }
      setIsUploading(false);
    }

    // Submit expense server action
    const res = await submitEmployeeExpense({
      expenseDate: editableDateTime,
      categoryId: selectedCategoryId !== "CUSTOM" ? selectedCategoryId : undefined,
      categoryLabel: finalCategory,
      amount: numericAmount,
      receiptUrl: uploadedUrl,
      receiptPublicId: uploadedPublicId,
      note: note.trim() || undefined,
    });

    setIsSubmitting(false);

    if (res.error) {
      toast.error(res.error);
    } else if (res.expense) {
      toast.success("Expense request submitted successfully!");
      setExpenses([res.expense as any, ...expenses]);

      // Reset form
      setAmount("");
      setNote("");
      setSelectedCategoryId("");
      setCustomCategory("");
      clearReceipt();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this pending expense request?")) return;

    const res = await deleteEmployeeExpense(id);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Expense request deleted");
      setExpenses(expenses.filter((item) => item.id !== id));
    }
  };

  const filteredExpenses = expenses.filter((item) => {
    if (statusFilter === "ALL") return true;
    return item.status === statusFilter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Hourglass className="w-3.5 h-3.5 animate-spin" /> Pending Review
          </span>
        );
      case "MANAGER_APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <UserCheck className="w-3.5 h-3.5" /> Manager Approved
          </span>
        );
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Final Approved
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 p-6 md:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-medium mb-3 border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Employee Portal
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Expense Claim & Reimbursement</h1>
            <p className="text-blue-100 mt-1 text-sm md:text-base max-w-xl">
              Submit your operational, travel, or fuel expenses with receipt verification for manager & admin approval.
            </p>
          </div>

          {/* Live Real-time Clock Widget */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4 min-w-[240px] text-right flex flex-col justify-center">
            <div className="flex items-center gap-2 text-xs font-medium text-blue-200 justify-end">
              <Clock className="w-3.5 h-3.5 animate-pulse text-emerald-400" /> REAL-TIME SYSTEM CLOCK
            </div>
            <div className="text-lg md:text-xl font-bold font-mono tracking-wider mt-1 text-white">
              {currentDateTime || "Loading Clock..."}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Submission Form */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-card text-card-foreground rounded-2xl border shadow-sm p-6 relative overflow-hidden">
            <div className="flex items-center gap-3 pb-4 mb-5 border-b">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">New Expense Entry</h2>
                <p className="text-xs text-muted-foreground">Auto-linked with your employee account</p>
              </div>
            </div>

            {/* Auto-Fetched Employee Details Card */}
            <div className="bg-muted/40 rounded-xl p-4 mb-6 border flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-md">
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{user.name}</div>
                <div className="text-xs text-muted-foreground truncate">{user.email}</div>
              </div>
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-primary/10 text-primary uppercase tracking-wider">
                {user.role}
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Editable Real-Time Date & Time */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Expense Date & Time (Editable)
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={editableDateTime}
                    onChange={(e) => setEditableDateTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Pre-filled with current system timestamp. Modify if recording past expense.
                </p>
              </div>

              {/* Category Dropdown & Custom Label */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Expense Category *
                </label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none mb-2"
                  required
                >
                  <option value="">-- Select Category --</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                  <option value="Fuel / Petrol">Fuel / Petrol</option>
                  <option value="Vehicle Maintenance">Vehicle Maintenance</option>
                  <option value="Office Supplies">Office Supplies</option>
                  <option value="Refreshments / Food">Refreshments / Food</option>
                  <option value="Travel / Auto Fare">Travel / Auto Fare</option>
                  <option value="CUSTOM">+ Other Custom Category</option>
                </select>

                {(selectedCategoryId === "CUSTOM" || (!selectedCategoryId && customCategory)) && (
                  <input
                    type="text"
                    placeholder="Enter custom category name..."
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Amount (₹) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground font-semibold">
                    ₹
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border bg-background text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Receipt Image Upload (Cloudinary) */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Receipt Photo (Cloudinary Integrated)
                </label>

                {receiptPreview ? (
                  <div className="relative rounded-xl overflow-hidden border p-2 bg-muted/30 flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                      {/* eslint-disable-next-next/image-element */}
                      <img
                        src={receiptPreview}
                        alt="Receipt preview"
                        className="w-14 h-14 object-cover rounded-lg border shadow-sm"
                      />
                      <div className="truncate text-xs">
                        <p className="font-semibold truncate">{receiptFile?.name}</p>
                        <p className="text-muted-foreground">
                          {receiptFile ? (receiptFile.size / 1024).toFixed(1) : 0} KB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={clearReceipt}
                      className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition text-center group">
                    <UploadCloud className="w-8 h-8 text-muted-foreground group-hover:text-blue-500 group-hover:scale-110 transition mb-2" />
                    <span className="text-xs font-medium text-foreground">
                      Click to upload receipt photo
                    </span>
                    <span className="text-[11px] text-muted-foreground mt-0.5">
                      JPG, PNG, WEBP up to 10MB
                    </span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Optional Note */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Note / Reason (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Emergency fuel filling during cylinder delivery round 2"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || isUploading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-sm shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting || isUploading ? (
                  <>
                    <Hourglass className="w-4 h-4 animate-spin" />
                    {isUploading ? "Uploading Receipt..." : "Submitting Claim..."}
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" /> Submit Expense Request
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Expense History & Approvals Status */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-card text-card-foreground rounded-2xl border shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-5 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">My Claim History</h2>
                  <p className="text-xs text-muted-foreground">Track approval status from Manager & Admin</p>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center bg-muted/60 p-1 rounded-xl gap-1">
                {["ALL", "PENDING", "APPROVED", "REJECTED"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setStatusFilter(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      statusFilter === tab
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {filteredExpenses.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/20">
                <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium text-muted-foreground">No expense claims found.</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Fill out the form on the left to submit a new expense.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredExpenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="p-4 rounded-xl border bg-background hover:shadow-md transition space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-base text-foreground">
                            {exp.categoryLabel}
                          </span>
                          <span className="text-lg font-bold text-blue-600 dark:text-blue-400 flex items-center">
                            ₹{exp.amount.toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(exp.expenseDate).toLocaleString("en-IN", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {getStatusBadge(exp.status)}
                        {exp.status === "PENDING" && (
                          <button
                            onClick={() => handleDelete(exp.id)}
                            title="Cancel Request"
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {exp.note && (
                      <p className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg border">
                        <span className="font-semibold text-foreground">Note: </span>
                        {exp.note}
                      </p>
                    )}

                    {/* Manager / Admin Notes */}
                    {exp.managerNote && (
                      <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-500/5 p-2 rounded-lg border border-blue-500/20">
                        <span className="font-semibold">Manager ({exp.manager?.name || "Manager"}): </span>
                        {exp.managerNote}
                      </div>
                    )}
                    {exp.adminNote && (
                      <div className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/20">
                        <span className="font-semibold">Admin ({exp.admin?.name || "Admin"}): </span>
                        {exp.adminNote}
                      </div>
                    )}

                    {/* Receipt thumbnail button */}
                    {exp.receiptUrl && (
                      <div className="pt-2 flex items-center gap-2">
                        <button
                          onClick={() => setSelectedReceiptUrl(exp.receiptUrl!)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-xs font-semibold hover:bg-muted/80 transition"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-500" /> View Uploaded Receipt Photo
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

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
    </div>
  );
}
