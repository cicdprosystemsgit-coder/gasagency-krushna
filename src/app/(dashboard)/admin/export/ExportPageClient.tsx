"use client";

import { useState, useTransition, useRef } from "react";
import { Download, Upload, FileSpreadsheet, Users, Truck, DollarSign, CreditCard, CheckCircle2, AlertTriangle, X, FileText, Package } from "lucide-react";
import { exportToExcel, exportToPDF, importCustomersFromExcel, importOpeningStockFromExcel } from "@/app/actions/export";

type ExportType = "customers" | "employees" | "deliveries" | "expenses" | "credit-ledger";
type PdfType    = "deliveries" | "expenses";

const EXPORTS: { type: ExportType; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
  { type: "customers",     label: "Customers",     desc: "All customers with outstanding balance",  icon: <Users className="w-5 h-5" />,        color: "#2563EB" },
  { type: "employees",     label: "Employees",     desc: "Staff list with bank and role details",   icon: <Users className="w-5 h-5" />,        color: "#7C3AED" },
  { type: "deliveries",    label: "Deliveries",    desc: "Delivery records with cash collected",    icon: <Truck className="w-5 h-5" />,        color: "#16A34A" },
  { type: "expenses",      label: "Expenses",      desc: "Expense ledger by category",              icon: <DollarSign className="w-5 h-5" />,   color: "#D97706" },
  { type: "credit-ledger", label: "Credit Ledger", desc: "Full udhari and payment history",         icon: <CreditCard className="w-5 h-5" />,   color: "#DC2626" },
];

const PDF_EXPORTS: { type: PdfType; label: string; desc: string; color: string }[] = [
  { type: "deliveries", label: "Deliveries PDF",  desc: "Date-range delivery report",  color: "#16A34A" },
  { type: "expenses",   label: "Expenses PDF",    desc: "Date-range expense report",   color: "#D97706" },
];

function triggerDownload(base64: string, filename: string, mime: string) {
  const link = document.createElement("a");
  link.href = `data:${mime};base64,${base64}`;
  link.download = filename;
  link.click();
}

export function ExportPageClient() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isPending, startTransition] = useTransition();
  const [activeExport, setActiveExport] = useState<string | null>(null);

  // Customer import
  const [importResult, setImportResult] = useState<{ imported?: number; errors?: string[] } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const customerFileRef = useRef<HTMLInputElement>(null);

  // Opening stock import
  const [stockResult, setStockResult] = useState<{ imported?: number; errors?: string[] } | null>(null);
  const [stockError, setStockError] = useState<string | null>(null);
  const stockFileRef = useRef<HTMLInputElement>(null);

  const handleExcelExport = (type: ExportType) => {
    setActiveExport(type);
    startTransition(async () => {
      const result = await exportToExcel(type, { from: fromDate || undefined, to: toDate || undefined });
      setActiveExport(null);
      if ("error" in result) { alert(result.error); return; }
      triggerDownload(result.base64, result.filename, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    });
  };

  const handlePdfExport = (type: PdfType) => {
    setActiveExport(`pdf-${type}`);
    startTransition(async () => {
      const result = await exportToPDF(type, { from: fromDate || undefined, to: toDate || undefined });
      setActiveExport(null);
      if ("error" in result) { alert(result.error); return; }
      triggerDownload(result.base64, result.filename, "application/pdf");
    });
  };

  const handleCustomerImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = (reader.result as string).split(",")[1] ?? (reader.result as string);
      startTransition(async () => {
        const res = await importCustomersFromExcel(b64);
        if ("error" in res) { setImportError(res.error); return; }
        setImportResult(res); setImportError(null);
        if (customerFileRef.current) customerFileRef.current.value = "";
      });
    };
    reader.readAsDataURL(file);
  };

  const handleStockImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = (reader.result as string).split(",")[1] ?? (reader.result as string);
      startTransition(async () => {
        const res = await importOpeningStockFromExcel(b64);
        if ("error" in res) { setStockError(res.error); return; }
        setStockResult(res); setStockError(null);
        if (stockFileRef.current) stockFileRef.current.value = "";
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[17px] font-semibold tracking-tight" style={{ color: "#18181B" }}>Data Export & Import</h1>
        <p className="text-[13px] mt-0.5" style={{ color: "#71717A" }}>Export reports to Excel or PDF, or import data in bulk</p>
      </div>

      {/* Date filter */}
      <div className="card p-4 mb-6">
        <p className="text-[12px] font-semibold mb-3" style={{ color: "#52525B" }}>Date Range Filter (applies to Deliveries & Expenses)</p>
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <label className="block text-[11px] mb-1" style={{ color: "#A1A1AA" }}>From</label>
            <input className="input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ width: 160 }} />
          </div>
          <div>
            <label className="block text-[11px] mb-1" style={{ color: "#A1A1AA" }}>To</label>
            <input className="input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ width: 160 }} />
          </div>
          {(fromDate || toDate) && (
            <button onClick={() => { setFromDate(""); setToDate(""); }} className="mt-4 text-[12px] flex items-center gap-1" style={{ color: "#A1A1AA" }}>
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Excel exports */}
      <p className="text-[12px] font-semibold mb-3 uppercase tracking-wider" style={{ color: "#A1A1AA" }}>Excel (.xlsx)</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {EXPORTS.map((ex) => (
          <div key={ex.type} className="card p-5 flex flex-col">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: ex.color + "15", color: ex.color }}>
                {ex.icon}
              </div>
              <div>
                <p className="text-[14px] font-semibold" style={{ color: "#18181B" }}>{ex.label}</p>
                <p className="text-[12px]" style={{ color: "#A1A1AA" }}>{ex.desc}</p>
              </div>
            </div>
            <button onClick={() => handleExcelExport(ex.type)} disabled={isPending && activeExport === ex.type}
              className="mt-auto btn flex items-center justify-center gap-2 text-[13px] font-medium"
              style={{ background: isPending && activeExport === ex.type ? "#F4F4F5" : ex.color, color: isPending && activeExport === ex.type ? "#A1A1AA" : "#FFFFFF" }}>
              {isPending && activeExport === ex.type
                ? <><span className="w-3.5 h-3.5 border-2 border-zinc-300 border-t-zinc-500 rounded-full animate-spin" />Generating…</>
                : <><Download className="w-3.5 h-3.5" />Export .xlsx</>}
            </button>
          </div>
        ))}
      </div>

      {/* PDF exports */}
      <p className="text-[12px] font-semibold mb-3 uppercase tracking-wider" style={{ color: "#A1A1AA" }}>PDF Reports</p>
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        {PDF_EXPORTS.map((ex) => (
          <div key={ex.type} className="card p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: ex.color + "15", color: ex.color }}>
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[14px] font-semibold" style={{ color: "#18181B" }}>{ex.label}</p>
                <p className="text-[12px]" style={{ color: "#A1A1AA" }}>{ex.desc}</p>
              </div>
            </div>
            <button onClick={() => handlePdfExport(ex.type)} disabled={isPending && activeExport === `pdf-${ex.type}`}
              className="btn flex items-center gap-2 text-[13px] font-medium flex-shrink-0"
              style={{ background: isPending && activeExport === `pdf-${ex.type}` ? "#F4F4F5" : ex.color, color: isPending && activeExport === `pdf-${ex.type}` ? "#A1A1AA" : "#FFFFFF" }}>
              {isPending && activeExport === `pdf-${ex.type}`
                ? <><span className="w-3.5 h-3.5 border-2 border-zinc-300 border-t-zinc-500 rounded-full animate-spin" />Generating…</>
                : <><Download className="w-3.5 h-3.5" />Export PDF</>}
            </button>
          </div>
        ))}
      </div>

      {/* Import section */}
      <div className="grid sm:grid-cols-2 gap-4">

        {/* Customer import */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileSpreadsheet className="w-5 h-5" style={{ color: "#16A34A" }} />
            <div>
              <p className="text-[14px] font-semibold" style={{ color: "#18181B" }}>Import Customers</p>
              <p className="text-[12px]" style={{ color: "#71717A" }}>Bulk-add customers from Excel</p>
            </div>
          </div>
          <div className="mb-4 p-3 rounded-lg" style={{ background: "#F4F4F5" }}>
            <p className="text-[12px] font-semibold mb-1" style={{ color: "#52525B" }}>Columns:</p>
            <div className="flex gap-2 flex-wrap">
              {["A: Name", "B: Phone", "C: Type (DOMESTIC/COMMERCIAL)", "D: Address"].map((col) => (
                <span key={col} className="text-[11px] px-2 py-0.5 rounded font-mono" style={{ background: "#E4E4E7", color: "#52525B" }}>{col}</span>
              ))}
            </div>
          </div>
          <input ref={customerFileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleCustomerImport} />
          <button onClick={() => customerFileRef.current?.click()} disabled={isPending} className="btn btn-primary flex items-center gap-2">
            <Upload className="w-3.5 h-3.5" />{isPending ? "Importing…" : "Choose Excel File"}
          </button>
          <ImportResult result={importResult} error={importError} label="customer" />
        </div>

        {/* Opening stock import */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5" style={{ color: "#7C3AED" }} />
            <div>
              <p className="text-[14px] font-semibold" style={{ color: "#18181B" }}>Import Opening Stock</p>
              <p className="text-[12px]" style={{ color: "#71717A" }}>Bulk-load initial cylinder stock for a new agency</p>
            </div>
          </div>
          <div className="mb-4 p-3 rounded-lg" style={{ background: "#F4F4F5" }}>
            <p className="text-[12px] font-semibold mb-1" style={{ color: "#52525B" }}>Columns:</p>
            <div className="flex gap-2 flex-wrap">
              {["A: Product Name (exact)", "B: Quantity", "C: Date (optional)", "D: Notes (optional)"].map((col) => (
                <span key={col} className="text-[11px] px-2 py-0.5 rounded font-mono" style={{ background: "#E4E4E7", color: "#52525B" }}>{col}</span>
              ))}
            </div>
          </div>
          <input ref={stockFileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleStockImport} />
          <button onClick={() => stockFileRef.current?.click()} disabled={isPending} className="btn flex items-center gap-2" style={{ background: "#7C3AED", color: "#fff" }}>
            <Upload className="w-3.5 h-3.5" />{isPending ? "Importing…" : "Choose Excel File"}
          </button>
          <ImportResult result={stockResult} error={stockError} label="product" />
        </div>

      </div>
    </div>
  );
}

function ImportResult({ result, error, label }: { result: { imported?: number; errors?: string[] } | null; error: string | null; label: string }) {
  return (
    <>
      {result && (
        <div className="mt-4 p-4 rounded-lg" style={{ background: "#F0FDF4", border: "1px solid #86EFAC" }}>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4" style={{ color: "#16A34A" }} />
            <p className="text-[13px] font-semibold" style={{ color: "#15803D" }}>
              {result.imported} {label}{result.imported !== 1 ? "s" : ""} imported
            </p>
          </div>
          {result.errors && result.errors.length > 0 && (
            <div>
              <p className="text-[12px] font-medium mb-1" style={{ color: "#B45309" }}>{result.errors.length} row{result.errors.length !== 1 ? "s" : ""} skipped:</p>
              <ul className="space-y-0.5">
                {result.errors.map((err, i) => <li key={i} className="text-[12px]" style={{ color: "#92400E" }}>• {err}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
      {error && (
        <div className="mt-4 p-3 rounded-lg flex items-start gap-2" style={{ background: "#FEF2F2", border: "1px solid #FCA5A5" }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "#DC2626" }} />
          <p className="text-[13px]" style={{ color: "#B91C1C" }}>{error}</p>
        </div>
      )}
    </>
  );
}
