"use client";

import { useState, useTransition, useRef } from "react";
import { Upload, FileText, Trash2, Download, AlertTriangle, X, Plus } from "lucide-react";
import { uploadDocument, deleteDocument, getDocumentForDownload } from "@/app/actions/documents";
import { formatDate } from "@/lib/utils";

type DocMeta = {
  id: string; entityType: string; entityId: string; docType: string;
  fileName: string; mimeType: string; expiryDate: string | null;
  createdAt: string; uploadedBy: { name: string };
};
type Employee = { id: string; name: string; role: string };
type Vehicle = { id: string; vehicleNo: string; vehicleName: string };
const DOC_TYPES = ["AADHAAR", "PAN", "RC", "INSURANCE", "FC", "LICENSE", "OTHER"];
const ENTITY_TYPES = [{ value: "USER", label: "Employee" }, { value: "VEHICLE", label: "Vehicle" }, { value: "AGENCY", label: "Agency" }];

type Props = { docs: DocMeta[]; expiringDocs: DocMeta[]; employees: Employee[]; vehicles: Vehicle[]; role: string };

export function DocumentsPageClient({ docs: initial, expiringDocs, employees, vehicles, role }: Props) {
  const [docs, setDocs] = useState<DocMeta[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("ALL");
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ entityType: "USER", entityId: "", docType: "AADHAAR", expiryDate: "" });
  const [selectedFile, setSelectedFile] = useState<{ name: string; base64: string; mime: string } | null>(null);

  const filteredDocs = filterType === "ALL" ? docs : docs.filter((d) => d.entityType === filterType);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setSelectedFile({ name: file.name, base64: result.split(",")[1] ?? result, mime: file.type });
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = () => {
    if (!selectedFile) { setError("Please select a file"); return; }
    if (!form.entityId && form.entityType !== "AGENCY") { setError("Please select an entity"); return; }
    startTransition(async () => {
      const result = await uploadDocument({
        entityType: form.entityType, entityId: form.entityId || "agency",
        docType: form.docType, fileName: selectedFile.name,
        fileBase64: selectedFile.base64, mimeType: selectedFile.mime,
        expiryDate: form.expiryDate || undefined,
      });
      if ("error" in result && result.error) { setError(result.error); }
      else {
        setDocs((prev) => [{ id: (result as { doc: { id: string } }).doc.id, ...form, fileName: selectedFile.name, mimeType: selectedFile.mime, expiryDate: form.expiryDate || null, createdAt: new Date().toISOString(), uploadedBy: { name: "You" } }, ...prev]);
        setShowForm(false); setSelectedFile(null); setError(null);
        if (fileRef.current) fileRef.current.value = "";
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => { await deleteDocument(id); setDocs((prev) => prev.filter((d) => d.id !== id)); });
  };

  const handleDownload = async (id: string) => {
    const result = await getDocumentForDownload(id);
    if ("error" in result || !result.doc) { alert("Could not download file"); return; }
    const link = document.createElement("a");
    link.href = `data:${result.doc.mimeType};base64,${result.doc.fileBase64}`;
    link.download = result.doc.fileName; link.click();
  };

  const daysUntilExpiry = (d: string | null) => d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : null;
  const entityOptions = form.entityType === "USER" ? employees.map((e) => ({ value: e.id, label: `${e.name} (${e.role.replace(/_/g, " ")})` })) : vehicles.map((v) => ({ value: v.id, label: `${v.vehicleNo} — ${v.vehicleName}` }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight" style={{ color: "#18181B" }}>Document Management</h1>
          <p className="text-[13px] mt-0.5" style={{ color: "#71717A" }}>KYC, vehicle RC, insurance, licences</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Upload</button>
      </div>

      {expiringDocs.length > 0 && (
        <div className="mb-6 px-4 py-3 rounded-lg flex items-start gap-3" style={{ background: "#FEF2F2", border: "1px solid #FCA5A5" }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#DC2626" }} />
          <div>
            <p className="text-[13px] font-semibold" style={{ color: "#B91C1C" }}>{expiringDocs.length} document{expiringDocs.length > 1 ? "s" : ""} expiring within 30 days</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {expiringDocs.map((d) => { const days = daysUntilExpiry(d.expiryDate)!; return (
                <span key={d.id} className="text-[11px] px-2 py-0.5 rounded" style={{ background: "#FEE2E2", color: "#991B1B" }}>
                  {d.fileName} — {days <= 0 ? "EXPIRED" : `${days}d`}
                </span>
              ); })}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="card mb-6">
          <div className="card-section flex items-center justify-between">
            <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>Upload Document</p>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4" style={{ color: "#A1A1AA" }} /></button>
          </div>
          <div className="p-5">
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Entity Type</label>
                <select className="input" value={form.entityType} onChange={(e) => setForm({ ...form, entityType: e.target.value, entityId: "" })}>
                  {ENTITY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              {form.entityType !== "AGENCY" && (
                <div>
                  <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>
                    {form.entityType === "USER" ? "Employee" : "Vehicle"} *
                  </label>
                  <select className="input" value={form.entityId} onChange={(e) => setForm({ ...form, entityId: e.target.value })}>
                    <option value="">Select…</option>
                    {entityOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Document Type</label>
                <select className="input" value={form.docType} onChange={(e) => setForm({ ...form, docType: e.target.value })}>
                  {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Expiry Date (optional)</label>
                <input className="input" type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
              </div>
            </div>
            <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer mb-4 transition-colors" style={{ borderColor: selectedFile ? "#2563EB" : "#E4E4E7", background: selectedFile ? "#EFF6FF" : "#FAFAFA" }} onClick={() => fileRef.current?.click()}>
              <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileSelect} />
              {selectedFile ? (
                <div className="flex items-center gap-2 justify-center"><FileText className="w-5 h-5" style={{ color: "#2563EB" }} /><span className="text-[13px] font-medium" style={{ color: "#2563EB" }}>{selectedFile.name}</span></div>
              ) : (
                <><Upload className="w-6 h-6 mx-auto mb-2" style={{ color: "#A1A1AA" }} /><p className="text-[13px]" style={{ color: "#71717A" }}>Click to select (PDF, JPG, PNG — max 5 MB)</p></>
              )}
            </div>
            {error && <p className="text-[12px] mb-3" style={{ color: "#DC2626" }}>{error}</p>}
            <div className="flex gap-2">
              <button onClick={handleUpload} disabled={isPending} className="btn btn-primary">{isPending ? "Uploading…" : "Upload"}</button>
              <button onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-1 mb-4 p-1 rounded-lg w-fit" style={{ background: "#F4F4F5" }}>
        {["ALL", "USER", "VEHICLE", "AGENCY"].map((f) => (
          <button key={f} onClick={() => setFilterType(f)} className="px-3 py-1.5 rounded-md text-[12px] font-medium transition-all" style={{ background: filterType === f ? "#FFFFFF" : "transparent", color: filterType === f ? "#18181B" : "#71717A", boxShadow: filterType === f ? "0 1px 2px rgba(0,0,0,0.05)" : "none" }}>
            {f === "ALL" ? "All" : ENTITY_TYPES.find((t) => t.value === f)?.label ?? f}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="card-section"><p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>{filteredDocs.length} document{filteredDocs.length !== 1 ? "s" : ""}</p></div>
        <table className="table">
          <thead><tr><th>File</th><th>Type</th><th>Entity</th><th>Expiry</th><th>Uploaded</th><th>By</th><th></th></tr></thead>
          <tbody>
            {filteredDocs.length === 0 ? (
              <tr><td colSpan={7} className="py-10 text-center text-[13px]" style={{ color: "#A1A1AA" }}>No documents found</td></tr>
            ) : filteredDocs.map((d) => {
              const days = daysUntilExpiry(d.expiryDate);
              const isExpired = days !== null && days <= 0;
              const isWarning = days !== null && days > 0 && days <= 30;
              return (
                <tr key={d.id}>
                  <td><div className="flex items-center gap-2"><FileText className="w-4 h-4 flex-shrink-0" style={{ color: "#A1A1AA" }} /><span className="text-[13px] truncate max-w-[160px]">{d.fileName}</span></div></td>
                  <td><span className="badge badge-blue">{d.docType}</span></td>
                  <td className="muted text-[12px]">{d.entityType}</td>
                  <td>{d.expiryDate ? (<span className="text-[12px] font-medium" style={{ color: isExpired ? "#DC2626" : isWarning ? "#D97706" : "#16A34A" }}>{formatDate(new Date(d.expiryDate))}{isWarning ? ` (${days}d)` : isExpired ? " EXPIRED" : ""}</span>) : <span className="text-[12px]" style={{ color: "#A1A1AA" }}>—</span>}</td>
                  <td className="muted text-[12px]">{formatDate(new Date(d.createdAt))}</td>
                  <td className="muted text-[12px]">{d.uploadedBy.name}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleDownload(d.id)} className="w-7 h-7 rounded flex items-center justify-center text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Download"><Download className="w-3.5 h-3.5" /></button>
                      {role === "ADMIN" && <button onClick={() => handleDelete(d.id)} className="w-7 h-7 rounded flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
