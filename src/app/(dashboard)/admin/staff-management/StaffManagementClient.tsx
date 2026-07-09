"use client";

import { useState, useTransition, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { formatDate } from "@/lib/utils";
import { Plus, Users, ToggleLeft, ToggleRight, Pencil, Trash2, AlertTriangle, Eye, FileText, ExternalLink, FolderOpen } from "lucide-react";
import { createStaffUser, updateStaffUser, deleteStaffUser, toggleStaffStatus } from "@/app/actions/staff";
import { getEmployeeDocuments, uploadDocument, getDocumentForDownload } from "@/app/actions/documents";
import { StaffForm, EMPTY_FORM, type FormState, type PendingDoc } from "./StaffForm";

interface Staff {
  id: string; name: string; email: string; phone: string | null; role: string;
  isActive: boolean; createdAt: Date | string;
  bankAccountNo: string | null; bankName: string | null; ifscCode: string | null;
  aadhaarNo: string | null; panNo: string | null; photoBase64: string | null;
  salaryProfile?: {
    monthlySalary: number;
    effectiveFrom: Date | string;
    notes: string | null;
  } | null;
}

type EmployeeDoc = {
  id: string; docType: string; fileName: string;
  storageType: string; driveViewUrl?: string | null;
  expiryDate?: string | Date | null; createdAt: string | Date;
  uploadedBy: { name: string };
};

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  ADMIN:         { bg: "#DBEAFE", color: "#1D4ED8" },
  MANAGER:       { bg: "#D1FAE5", color: "#065F46" },
  GODOWN_KEEPER: { bg: "#EDE9FE", color: "#5B21B6" },
  STAFF:         { bg: "#FEF3C7", color: "#92400E" },
  DELIVERY_BOY:  { bg: "#FEE2E2", color: "#991B1B" },
};
const ROLE_LABEL: Record<string, string> = {
  ADMIN:"Admin", MANAGER:"Manager", GODOWN_KEEPER:"Godown Keeper",
  STAFF:"Staff", DELIVERY_BOY:"Delivery Boy",
};
const AV_COLORS = ["#3B82F6","#8B5CF6","#10B981","#F59E0B","#EF4444","#06B6D4","#EC4899"];
function avColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xFFFFFF;
  return AV_COLORS[Math.abs(h) % AV_COLORS.length];
}


function Avatar({ s }: { s: Staff }) {
  if (s.photoBase64) return (
    <img src={s.photoBase64} alt={s.name}
      style={{ width:32, height:32, borderRadius:"50%", objectFit:"cover", border:"2px solid #E4E4E7", flexShrink:0 }} />
  );
  return (
    <div style={{ width:32, height:32, borderRadius:"50%", background:avColor(s.name),
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:13, fontWeight:700, color:"#fff", flexShrink:0 }}>
      {s.name.charAt(0).toUpperCase()}
    </div>
  );
}

export function StaffManagementClient({ initialStaff }: { initialStaff: Staff[] }) {
  const [staff, setStaff] = useState(initialStaff);
  const [isPending, startTransition] = useTransition();

  const [addOpen,  setAddOpen]  = useState(false);
  const [addForm,  setAddForm]  = useState<FormState>(EMPTY_FORM);
  const [addError, setAddError] = useState("");
  const [addPendingDocs, setAddPendingDocs] = useState<PendingDoc[]>([]);

  const [editOpen,   setEditOpen]   = useState(false);
  const [editTarget, setEditTarget] = useState<Staff | null>(null);
  const [editForm,   setEditForm]   = useState<FormState>(EMPTY_FORM);
  const [editError,  setEditError]  = useState("");
  const [editStep,   setEditStep]   = useState(1); // track current step to gate submission

  const [addStep, setAddStep] = useState(1); // track current step for add modal

  const [viewTarget, setViewTarget] = useState<Staff | null>(null);
  const [viewDocs,   setViewDocs]   = useState<EmployeeDoc[]>([]);
  const [viewDocsLoading, setViewDocsLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null);
  const [deleteError,  setDeleteError]  = useState("");

  // Load documents when viewing an employee profile
  useEffect(() => {
    if (!viewTarget) { setViewDocs([]); return; }
    setViewDocsLoading(true);
    getEmployeeDocuments(viewTarget.id)
      .then(({ docs }) => setViewDocs(docs as EmployeeDoc[]))
      .catch(() => setViewDocs([]))
      .finally(() => setViewDocsLoading(false));
  }, [viewTarget]);

  // ── form helpers ───────────────────────────────────────────────────────────
  function toFormState(s: Staff): FormState {
    return {
      name: s.name, email: s.email, phone: s.phone ?? "",
      role: s.role, password: "",
      bankAccountNo: s.bankAccountNo ?? "", bankName: s.bankName ?? "",
      ifscCode: s.ifscCode ?? "", aadhaarNo: s.aadhaarNo ?? "",
      panNo: s.panNo ?? "", photoBase64: s.photoBase64 ?? "",
      monthlySalary: s.salaryProfile?.monthlySalary ? String(s.salaryProfile.monthlySalary) : "",
      effectiveFrom: s.salaryProfile?.effectiveFrom ? new Date(s.salaryProfile.effectiveFrom).toISOString().slice(0, 10) : "",
      salaryNotes: s.salaryProfile?.notes ?? "",
    };
  }

  function appendForm(fd: FormData, form: FormState) {
    (Object.entries(form) as [string, string][]).forEach(([k, v]) => fd.append(k, v));
  }

  // ── handlers ───────────────────────────────────────────────────────────────
  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    // Only process submission when user is on the final step (Step 5)
    if (addStep !== 5) return;
    const fd = new FormData(); appendForm(fd, addForm);
    startTransition(async () => {
      const res = await createStaffUser(fd);
      if (res.error) { setAddError(res.error); return; }
      if (res.user) {
        setStaff((p) => [res.user!, ...p]);
        // Upload any queued documents now that we have the employee ID
        if (addPendingDocs.length > 0) {
          for (const doc of addPendingDocs) {
            await uploadDocument({
              entityType:   "USER",
              entityId:     res.user.id,
              docType:      doc.docType,
              fileName:     doc.fileName,
              fileBase64:   doc.base64,
              mimeType:     doc.mimeType,
              expiryDate:   doc.expiryDate,
              employeeName: res.user.name,
            });
          }
        }
        setAddOpen(false);
        setAddForm(EMPTY_FORM);
        setAddPendingDocs([]);
        setAddStep(1);
      }
    });
  }

  function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    // Only process submission when user is on the final step (Step 5)
    if (editStep !== 5) return;
    if (!editTarget) return;
    const fd = new FormData(); fd.append("id", editTarget.id); appendForm(fd, editForm);
    startTransition(async () => {
      const res = await updateStaffUser(fd);
      if (res.error) { setEditError(res.error); return; }
      if (res.user)  { setStaff((p) => p.map((s) => s.id === res.user!.id ? res.user! : s)); setEditOpen(false); setEditStep(1); }
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const res = await deleteStaffUser(deleteTarget.id);
      if (!res.success) { setDeleteError(res.error ?? "Failed"); return; }
      setStaff((p) => p.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    });
  }

  function handleToggle(id: string, current: boolean) {
    startTransition(async () => {
      const res = await toggleStaffStatus(id, !current);
      if (res.success) setStaff((p) => p.map((s) => s.id === id ? { ...s, isActive: !current } : s));
    });
  }

  async function handlePreview(docId: string, storageType: string, driveViewUrl?: string | null) {
    if (storageType === "GOOGLE_DRIVE" && driveViewUrl) {
      window.open(driveViewUrl, "_blank");
      return;
    }
    try {
      const res = await getDocumentForDownload(docId);
      if (res.error || !res.doc) {
        alert(res.error ?? "Failed to fetch document");
        return;
      }
      if (res.doc.fileBase64) {
        const base64 = res.doc.fileBase64;
        const mimeType = res.doc.mimeType || "application/pdf";
        const raw = window.atob(base64);
        const rawLength = raw.length;
        const uInt8Array = new Uint8Array(new ArrayBuffer(rawLength));
        for (let i = 0; i < rawLength; i++) {
          uInt8Array[i] = raw.charCodeAt(i);
        }
        const blob = new Blob([uInt8Array], { type: mimeType });
        const fileURL = URL.createObjectURL(blob);
        window.open(fileURL, "_blank");
      } else {
        alert("Document content is empty");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to load document preview");
    }
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[13px]" style={{ color: "#A1A1AA" }}>
          {staff.length} total · {staff.filter((s) => s.isActive).length} active
        </span>
        <button onClick={() => { setAddError(""); setAddForm(EMPTY_FORM); setAddOpen(true); }} className="btn btn-primary">
          <Plus className="w-3.5 h-3.5" /> Add Staff Member
        </button>
      </div>

      {/* Table */}
      <div className="rounded-lg overflow-hidden"
        style={{ background:"#fff", border:"1px solid #E4E4E7", boxShadow:"0 1px 2px rgba(0,0,0,0.04)" }}>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Contact</th>
                <th>Role</th>
                <th>Bank</th>
                <th>Joined</th>
                <th className="text-center">Status</th>
                <th className="text-center">Toggle</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.length === 0 ? (
                <tr><td colSpan={8} className="py-14 text-center">
                  <Users className="w-8 h-8 mx-auto mb-2" style={{ color:"#D4D4D8" }} />
                  <p className="text-[13px]" style={{ color:"#A1A1AA" }}>No staff members yet</p>
                </td></tr>
              ) : staff.map((s) => {
                const rc = ROLE_COLORS[s.role] ?? { bg:"#F4F4F5", color:"#52525B" };
                return (
                  <tr key={s.id}>
                    {/* Employee */}
                    <td>
                      <div className="flex items-center gap-2.5">
                        <Avatar s={s} />
                        <div>
                          <p className="text-[13px] font-medium" style={{ color:"#18181B" }}>{s.name}</p>
                          <p className="text-[11px]" style={{ color:"#A1A1AA" }}>{s.email}</p>
                        </div>
                      </div>
                    </td>
                    {/* Contact */}
                    <td className="text-[12px]" style={{ color:"#52525B" }}>{s.phone ?? "—"}</td>
                    {/* Role */}
                    <td>
                      <span className="badge text-[11px]" style={{ background:rc.bg, color:rc.color, border:"none" }}>
                        {ROLE_LABEL[s.role] ?? s.role}
                      </span>
                    </td>
                    {/* Bank */}
                    <td className="text-[12px]" style={{ color:"#52525B" }}>
                      {s.bankName
                        ? <><p className="font-medium">{s.bankName}</p><p style={{ color:"#A1A1AA" }}>{s.bankAccountNo}</p></>
                        : "—"}
                    </td>
                    {/* Joined */}
                    <td className="text-[12px]" style={{ color:"#71717A" }}>{formatDate(s.createdAt)}</td>
                    {/* Status badge */}
                    <td className="text-center">
                      <span className={`badge ${s.isActive ? "badge-approved" : "badge-neutral"}`}>
                        {s.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    {/* Toggle */}
                    <td className="text-center">
                      <button onClick={() => handleToggle(s.id, s.isActive)} disabled={isPending}
                        title={s.isActive ? "Deactivate" : "Activate"}
                        style={{
                          display:"inline-flex", alignItems:"center", gap:5, padding:"4px 10px",
                          borderRadius:20, cursor:isPending?"not-allowed":"pointer",
                          border: s.isActive ? "1px solid #86EFAC" : "1px solid #E4E4E7",
                          background: s.isActive ? "#F0FDF4" : "#F4F4F5",
                          fontSize:11, fontWeight:600,
                          color: s.isActive ? "#16A34A" : "#71717A",
                        }}>
                        {s.isActive ? <><ToggleRight className="w-4 h-4"/>Active</> : <><ToggleLeft className="w-4 h-4"/>Inactive</>}
                      </button>
                    </td>
                    {/* Actions */}
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* View */}
                        <button
                          onClick={() => setViewTarget(s)}
                          title="View Profile"
                          className="btn-action btn-action-success"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {/* Edit */}
                        <button
                          onClick={() => { setEditError(""); setEditStep(1); setEditTarget(s); setEditForm(toFormState(s)); setEditOpen(true); }}
                          title="Edit"
                          className="btn-action btn-action-primary"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {/* Delete */}
                        {s.role !== "ADMIN" && (
                          <button
                            onClick={() => { setDeleteError(""); setDeleteTarget(s); }}
                            title="Delete"
                            className="btn-action btn-action-danger"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ADD MODAL ───────────────────────────────────────────────────────── */}
      <Modal open={addOpen} onClose={() => { setAddOpen(false); setAddPendingDocs([]); setAddStep(1); }} title="Add Staff Member" size="md">
        <form onSubmit={handleAdd} onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}>
          <StaffForm key={addOpen ? "add-active" : "add-inactive"} form={addForm} setForm={setAddForm} error={addError} isPending={isPending}
            onCancel={() => { setAddOpen(false); setAddPendingDocs([]); setAddStep(1); }} submitLabel="Create Account"
            pendingDocs={addPendingDocs} onPendingDocsChange={setAddPendingDocs}
            onStepChange={setAddStep} />
        </form>
      </Modal>

      {/* ── EDIT MODAL ──────────────────────────────────────────────────────── */}
      <Modal open={editOpen} onClose={() => { setEditOpen(false); setEditStep(1); }} title={`Edit — ${editTarget?.name ?? ""}`} size="md">
        <form onSubmit={handleEdit} onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}>
          <StaffForm key={editOpen ? `edit-${editTarget?.id}` : "edit-inactive"} form={editForm} setForm={setEditForm} error={editError} isPending={isPending}
            onCancel={() => { setEditOpen(false); setEditStep(1); }} submitLabel="Save Changes" isEdit
            employeeId={editTarget?.id} onStepChange={setEditStep} />
        </form>
      </Modal>

      {/* ── VIEW PROFILE MODAL ──────────────────────────────────────────────── */}
      <Modal open={!!viewTarget} onClose={() => setViewTarget(null)} title="Employee Profile" size="sm">
        {viewTarget && (
          <div className="space-y-4">
            {/* Photo + name */}
            <div className="flex flex-col items-center gap-2 pb-4" style={{ borderBottom:"1px solid #F4F4F5" }}>
              <Avatar s={viewTarget} />
              <p className="text-[15px] font-bold" style={{ color:"#18181B" }}>{viewTarget.name}</p>
              <span className="badge text-[11px]"
                style={{ background: ROLE_COLORS[viewTarget.role]?.bg, color: ROLE_COLORS[viewTarget.role]?.color, border:"none" }}>
                {ROLE_LABEL[viewTarget.role]}
              </span>
            </div>

            {/* Details grid */}
            {([
              ["Email",        viewTarget.email],
              ["Mobile",       viewTarget.phone ?? "—"],
              ["Salary Setup", viewTarget.salaryProfile?.monthlySalary ? `₹${viewTarget.salaryProfile.monthlySalary.toLocaleString()} (eff. ${formatDate(viewTarget.salaryProfile.effectiveFrom)})` : "Not Configured"],
              ["Bank Name",    viewTarget.bankName ?? "—"],
              ["Account No.",  viewTarget.bankAccountNo ?? "—"],
              ["IFSC",         viewTarget.ifscCode ?? "—"],
              ["Aadhaar No.",  viewTarget.aadhaarNo ?? "—"],
              ["PAN No.",      viewTarget.panNo ?? "—"],
              ["Joined",       formatDate(viewTarget.createdAt)],
              ["Status",       viewTarget.isActive ? "Active" : "Inactive"],
            ] as [string,string][]).map(([label, val]) => (
              <div key={label} className="flex items-center justify-between text-[13px]"
                style={{ borderBottom:"1px solid #F9FAFB", paddingBottom:6 }}>
                <span style={{ color:"#71717A" }}>{label}</span>
                <span className="font-medium" style={{ color:"#18181B" }}>{val}</span>
              </div>
            ))}

            {/* Documents section */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <FolderOpen className="w-3.5 h-3.5" style={{ color:"#2563EB" }} />
                <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color:"#71717A" }}>Documents</p>
              </div>
              {viewDocsLoading ? (
                <p className="text-[12px]" style={{ color:"#A1A1AA" }}>Loading…</p>
              ) : viewDocs.length === 0 ? (
                <p className="text-[12px]" style={{ color:"#A1A1AA" }}>No documents uploaded yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {viewDocs.map((d) => (
                    <div key={d.id} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg"
                      style={{ background:"#F8FAFC", border:"1px solid #E2E8F0" }}>
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 flex-shrink-0" style={{ color:"#64748B" }} />
                        <div>
                          <p className="text-[12px] font-medium" style={{ color:"#18181B" }}>{d.docType}</p>
                          <p className="text-[10px] truncate max-w-[140px]" style={{ color:"#94A3B8" }}>{d.fileName}</p>
                        </div>
                      </div>
                      <button onClick={() => handlePreview(d.id, d.storageType, d.driveViewUrl)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors hover:bg-blue-50"
                        style={{ color:"#2563EB", border:"1px solid #BFDBFE" }}
                        title="Preview Document">
                        <Eye className="w-2.5 h-2.5" /> Preview
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ── DELETE CONFIRM MODAL ────────────────────────────────────────────── */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Employee" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl"
            style={{ background:"#FEF2F2", border:"1px solid #FECACA" }}>
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color:"#DC2626" }} />
            <div>
              <p className="text-[13px] font-semibold" style={{ color:"#991B1B" }}>This action cannot be undone</p>
              <p className="text-[12px] mt-0.5" style={{ color:"#B91C1C" }}>
                If the employee has linked records, the account will be deactivated instead of deleted to preserve data integrity.
              </p>
            </div>
          </div>
          {deleteTarget && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background:"#F9FAFB", border:"1px solid #E4E4E7" }}>
              <Avatar s={deleteTarget} />
              <div>
                <p className="text-[13px] font-semibold" style={{ color:"#18181B" }}>{deleteTarget.name}</p>
                <p className="text-[12px]" style={{ color:"#71717A" }}>
                  {deleteTarget.email} · {ROLE_LABEL[deleteTarget.role]}
                </p>
              </div>
            </div>
          )}
          {deleteError && (
            <p className="text-[13px] px-3 py-2 rounded-lg"
              style={{ background:"#FEF2F2", border:"1px solid #FCA5A5", color:"#B91C1C" }}>{deleteError}</p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button disabled={isPending} onClick={handleDelete} className="btn"
              style={{ background:"#DC2626", color:"#fff", border:"none" }}>
              {isPending ? "Deleting…" : "Yes, Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
