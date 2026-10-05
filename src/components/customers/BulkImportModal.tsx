"use client";

import { useState, useRef, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  X,
  FileCheck,
  Check,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface BulkImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BulkImportModal({ open, onClose, onSuccess }: BulkImportModalProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    totalRows: number;
    insertedCount: number;
    updatedCount?: number;
    sample?: Array<{
      name: string;
      customerCode: string;
      phone: string;
      address: string | null;
      areaRoute: string | null;
      type: string;
    }>;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [, startTransition] = useTransition();

  function resetState() {
    setFile(null);
    setError(null);
    setResult(null);
    setLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleClose() {
    resetState();
    onClose();
  }

  function handleFileSelect(selectedFile: File) {
    setError(null);
    setResult(null);
    const validExtensions = [".xlsx", ".xls", ".csv"];
    const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf(".")).toLowerCase();
    if (!validExtensions.includes(ext)) {
      setError("Please select a valid Excel (.xlsx, .xls) or CSV (.csv) file.");
      return;
    }
    setFile(selectedFile);
  }

  async function handleUpload() {
    if (!file) {
      setError("Please select an Excel or CSV file to upload.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/customers/bulk-import", {
        method: "POST",
        body: formData,
      });

      if (response.status === 413) {
        throw new Error("File size is too large for the server (HTTP 413: Request Entity Too Large). The server limits upload size. Please restart Nginx on the server with 'client_max_body_size 100M;' or save your Excel file as CSV and re-upload.");
      }

      let data;
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          !response.ok
            ? `Server returned error (${response.status}): ${response.statusText || "Upload failed"}`
            : "Invalid response received from server."
        );
      }

      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to process customer data");
      }

      setResult({
        totalRows: data.totalRows,
        insertedCount: data.insertedCount,
        updatedCount: data.updatedCount || 0,
        sample: data.sample || [],
      });

      startTransition(() => {
        router.refresh();
        if (onSuccess) onSuccess();
      });
    } catch (err: unknown) {
      console.error("Upload error:", err);
      const msg = err instanceof Error ? err.message : "An unexpected error occurred during import.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Bulk Import Customers"
      subtitle="Upload Excel (.xlsx) or CSV containing customer data"
      size="lg"
    >
      <div className="space-y-4">
        {/* Template download banner */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-blue-900 text-[13px]">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <span>Need a reference template? Download our sample format.</span>
          </div>
          <a
            href="/api/admin/customers/template"
            download
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium text-xs hover:bg-blue-700 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Sample Template
          </a>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Import Failed</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {result && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span className="font-semibold text-sm">Customer Data Processed Successfully!</span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-200 text-xs">
              <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-100">
                <span className="text-zinc-500 block">Total Read</span>
                <span className="text-base font-bold text-zinc-900">{result.totalRows.toLocaleString()}</span>
              </div>
              <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-100">
                <span className="text-emerald-600 block">New Inserted</span>
                <span className="text-base font-bold text-emerald-700">{result.insertedCount.toLocaleString()}</span>
              </div>
              <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-100">
                <span className="text-blue-600 block">Updated / Fixed</span>
                <span className="text-base font-bold text-blue-700">{(result.updatedCount || 0).toLocaleString()}</span>
              </div>
            </div>

            {/* Preview of successfully parsed fields */}
            {result.sample && result.sample.length > 0 && (
              <div className="pt-2 border-t border-emerald-200">
                <p className="text-[11px] font-semibold text-emerald-800 mb-1.5">Sample Parsed Data Preview:</p>
                <div className="max-h-[140px] overflow-y-auto rounded-lg border border-emerald-200 bg-white text-[11px]">
                  <table className="w-full text-left">
                    <thead className="bg-emerald-50 text-emerald-900 sticky top-0 border-b border-emerald-200">
                      <tr>
                        <th className="px-2.5 py-1.5 font-semibold">Consumer No</th>
                        <th className="px-2.5 py-1.5 font-semibold">Customer Name</th>
                        <th className="px-2.5 py-1.5 font-semibold">Area / Route</th>
                        <th className="px-2.5 py-1.5 font-semibold">Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {result.sample.map((s, idx) => (
                        <tr key={idx}>
                          <td className="px-2.5 py-1 font-mono text-blue-600">{s.customerCode}</td>
                          <td className="px-2.5 py-1 font-medium text-zinc-800">{s.name}</td>
                          <td className="px-2.5 py-1 text-amber-700">{s.areaRoute || "—"}</td>
                          <td className="px-2.5 py-1">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${s.type === "DOMESTIC" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"}`}>
                              {s.type}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dropzone */}
        {!result && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileSelect(e.dataTransfer.files[0]);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
              isDragging
                ? "border-blue-500 bg-blue-50/50"
                : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50 bg-zinc-50/30"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-blue-100/70 text-blue-600 flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-800">
                  Click to browse or drag &amp; drop your Excel file
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">Supports .xlsx, .xls, and .csv files (e.g. 32,000+ rows)</p>
              </div>
            </div>
          </div>
        )}

        {/* Selected file preview pill */}
        {file && !result && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-100 border border-zinc-200 text-xs">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <FileCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div className="truncate">
                <p className="font-semibold text-zinc-800 truncate">{file.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-zinc-500 text-[11px]">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                  {file.size > 2 * 1024 * 1024 && file.name.endsWith(".xlsx") && (
                    <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-medium">
                      💡 Tip: Saving as .csv makes uploads 10x faster
                    </span>
                  )}
                </div>
              </div>
            </div>
            {!loading && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  resetState();
                }}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Helpful Column Mapping Tips */}
        <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-200/80 text-[11px] text-zinc-600 space-y-1">
          <p className="font-semibold text-zinc-700">Supported Columns &amp; Recognition:</p>
          <ul className="list-disc list-inside space-y-0.5 text-zinc-500">
            <li><strong>Sr No</strong> (Column A) &bull; <strong>Consumer Number</strong> (Column B) &bull; <strong>Customer Name</strong> (Column C)</li>
            <li><strong>Address</strong> (Column D) &bull; <strong>Area / Route</strong> (Column E) &bull; <strong>Customer Type</strong> (Column F) &bull; <strong>Mobile Number</strong> (Column G)</li>
            <li>Re-uploading the file will automatically update and fix any previous imports with matching Consumer Numbers.</li>
          </ul>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 disabled:opacity-50 transition"
          >
            {result ? "Close" : "Cancel"}
          </button>

          {!result && (
            <button
              type="button"
              onClick={handleUpload}
              disabled={!file || loading}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Importing Records...
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  Start Import
                </>
              )}
            </button>
          )}

          {result && (
            <button
              type="button"
              onClick={resetState}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition cursor-pointer"
            >
              Import Another File
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
