"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import {
  Receipt,
  PlusCircle,
  Clock,
  UploadCloud,
  Trash2,
  Hourglass,
  IndianRupee,
  Sparkles,
} from "lucide-react";
import { submitEmployeeExpense } from "@/app/actions/expenses";

interface UserProfile {
  name: string;
  email?: string;
  role: string;
}

interface CategoryOption {
  id: string;
  name: string;
  color?: string | null;
}

interface AddExpenseModalProps {
  open: boolean;
  onClose: () => void;
  user: UserProfile;
  categories?: CategoryOption[];
  onSuccess?: (newExpense: any) => void;
}

export function AddExpenseModal({
  open,
  onClose,
  user,
  categories = [],
  onSuccess,
}: AddExpenseModalProps) {
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

  // Update real-time clock & default timestamp
  useEffect(() => {
    if (!open) return;

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
  }, [open]);

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

    const matchedCategory = categories.find((c) => c.id === selectedCategoryId);

    const finalCategoryName = matchedCategory
      ? matchedCategory.name
      : selectedCategoryId === "CUSTOM"
      ? customCategory.trim()
      : selectedCategoryId.trim();

    if (!finalCategoryName) {
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
      categoryId: matchedCategory ? matchedCategory.id : undefined,
      categoryLabel: finalCategoryName,
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
      if (onSuccess) onSuccess(res.expense);

      // Reset form & close
      setAmount("");
      setNote("");
      setSelectedCategoryId("");
      setCustomCategory("");
      clearReceipt();
      onClose();
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add New Expense Entry" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Real-time System Clock */}
        <div className="bg-slate-900 text-white rounded-xl p-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-300">
            <Clock className="w-4 h-4 animate-pulse text-emerald-400" /> REAL-TIME CLOCK
          </div>
          <div className="text-xs font-mono font-bold tracking-wider text-emerald-400">
            {currentDateTime || "Loading..."}
          </div>
        </div>

        {/* User Details Card */}
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow">
            {user.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
              {user.name}
            </div>
            {user.email && (
              <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
            )}
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 uppercase">
            {user.role}
          </span>
        </div>

        {/* Editable Date & Time */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Expense Date & Time (Editable)
          </label>
          <input
            type="datetime-local"
            value={editableDateTime}
            onChange={(e) => setEditableDateTime(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            required
          />
        </div>

        {/* Category Dropdown */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Expense Category *
          </label>
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none mb-2"
            required
          >
            <option value="">-- Select Category --</option>
            {categories.length > 0 ? (
              categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))
            ) : (
              <>
                <option value="Electricity">Electricity</option>
                <option value="Fuel">Fuel</option>
                <option value="Office Supplies">Office Supplies</option>
                <option value="Rent">Rent</option>
                <option value="Salary">Salary</option>
                <option value="Vehicle Maintenance">Vehicle Maintenance</option>
              </>
            )}
            <option value="CUSTOM">+ Other Custom Category</option>
          </select>

          {(selectedCategoryId === "CUSTOM" || (!selectedCategoryId && customCategory)) && (
            <input
              type="text"
              placeholder="Enter custom category name..."
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          )}
        </div>

        {/* Amount */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Amount (₹) *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-semibold text-xs">
              ₹
            </div>
            <input
              type="number"
              step="0.01"
              min="1"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full pl-7 pr-3 py-2 rounded-xl border text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>
        </div>

        {/* Receipt Upload (Cloudinary) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Receipt Photo (Cloudinary)
          </label>

          {receiptPreview ? (
            <div className="relative rounded-xl overflow-hidden border p-2 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3 overflow-hidden">
                {/* eslint-disable-next-next/image-element */}
                <img
                  src={receiptPreview}
                  alt="Receipt preview"
                  className="w-12 h-12 object-cover rounded-lg border shadow-sm"
                />
                <div className="truncate text-xs">
                  <p className="font-semibold truncate">{receiptFile?.name}</p>
                  <p className="text-slate-400">
                    {receiptFile ? (receiptFile.size / 1024).toFixed(1) : 0} KB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={clearReceipt}
                className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition text-center group">
              <UploadCloud className="w-6 h-6 text-slate-400 group-hover:text-blue-500 group-hover:scale-110 transition mb-1" />
              <span className="text-xs font-medium text-slate-700">
                Click to upload receipt photo
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">
                JPG, PNG up to 10MB
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Optional Note */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Note / Reason (Optional)
          </label>
          <textarea
            rows={2}
            placeholder="e.g. Fuel filling during cylinder delivery"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border text-xs font-semibold hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isUploading}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
          >
            {isSubmitting || isUploading ? (
              <>
                <Hourglass className="w-3.5 h-3.5 animate-spin" />
                {isUploading ? "Uploading Receipt..." : "Submitting..."}
              </>
            ) : (
              <>
                <PlusCircle className="w-3.5 h-3.5" /> Submit Expense
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
