"use client";

import { useRef, useState, useEffect } from "react";
import { AlertTriangle, Eye, EyeOff, Camera, User, Check, ArrowRight, ArrowLeft, Upload, FileText, Trash2, ExternalLink, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadDocument, deleteDocument, getEmployeeDocuments, getDocumentForDownload } from "@/app/actions/documents";
import { validatePassword } from "@/lib/passwordPolicy";
import { getCustomRoles, createCustomRole } from "@/app/actions/staff";
import { type Role } from "@/generated/prisma";
import { Modal } from "@/components/ui/Modal";

export type FormState = {
  name: string; email: string; phone: string; role: string; password: string;
  customRole: string;
  customRoleId: string;
  bankAccountNo: string; bankName: string; ifscCode: string;
  aadhaarNo: string; panNo: string; photoBase64: string;
  // Salary Profile fields
  monthlySalary: string;
  effectiveFrom: string;
  salaryNotes: string;
};

export const EMPTY_FORM: FormState = {
  name: "", email: "", phone: "", role: "STAFF", password: "",
  customRole: "",
  customRoleId: "",
  bankAccountNo: "", bankName: "", ifscCode: "",
  aadhaarNo: "", panNo: "", photoBase64: "",
  monthlySalary: "",
  effectiveFrom: "",
  salaryNotes: "",
};

// ── Document types available for employee upload ─────────────────────────────
const EMPLOYEE_DOC_TYPES = [
  { value: "AADHAAR",  label: "Aadhaar Card",         accept: ".pdf,.jpg,.jpeg,.png" },
  { value: "PAN",      label: "PAN Card",              accept: ".pdf,.jpg,.jpeg,.png" },
  { value: "LICENSE",  label: "Driving License",       accept: ".pdf,.jpg,.jpeg,.png" },
  { value: "PHOTO",    label: "Employee Photo",        accept: ".jpg,.jpeg,.png" },
  { value: "CONTRACT", label: "Employment Contract",   accept: ".pdf" },
  { value: "RC",       label: "Vehicle RC",            accept: ".pdf,.jpg,.jpeg,.png" },
  { value: "INSURANCE",label: "Insurance Document",    accept: ".pdf,.jpg,.jpeg,.png" },
  { value: "OTHER",    label: "Other Document",        accept: ".pdf,.jpg,.jpeg,.png" },
];

type UploadedDoc = {
  id: string;
  docType: string;
  fileName: string;
  driveViewUrl?: string | null;
  storageType: string;
  expiryDate?: string | null;
};

// Queued doc for Add-Staff mode (uploaded after staff is created)
export type PendingDoc = {
  docType: string;
  fileName: string;
  base64: string;
  mimeType: string;
  expiryDate?: string;
};

// Resize image to thumbnail before storing as base64
async function resizeImage(file: File, maxPx = 200): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(maxPx / img.width, maxPx / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface Props {
  form: FormState;
  setForm: (f: FormState) => void;
  error: string;
  isPending: boolean;
  onCancel: () => void;
  submitLabel: string;
  isEdit?: boolean;
  employeeId?: string;          // required on edit mode for direct upload
  pendingDocs?: PendingDoc[];   // queued docs for add mode
  onPendingDocsChange?: (docs: PendingDoc[]) => void;
  onStepChange?: (step: number) => void; // notify parent of current step
}

export function StaffForm({ form, setForm, error, isPending, onCancel, submitLabel, isEdit, employeeId, pendingDocs = [], onPendingDocsChange, onStepChange }: Props) {
  // ── All hooks declared first (React rules of hooks) ────────────────────────
  const [step, setStep]               = useState(1);
  const [localError, setLocalError]   = useState("");
  const [showPwd, setShowPwd]         = useState(false);
  const fileRef                       = useRef<HTMLInputElement>(null);
  const docFileRef                    = useRef<HTMLInputElement>(null);
  const [uploadedDocs, setUploadedDocs]       = useState<UploadedDoc[]>([]);
  const [docForm, setDocForm]                 = useState({ docType: "AADHAAR", expiryDate: "" });
  const [selectedDocFile, setSelectedDocFile] = useState<{ name: string; base64: string; mime: string } | null>(null);
  const [docUploading, setDocUploading]       = useState(false);
  const [docError, setDocError]               = useState("");

  const [customRoles, setCustomRoles] = useState<{ id: string; name: string; baseRole: string }[]>([]);
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleBase, setNewRoleBase] = useState<Role>("STAFF");
  const [addRoleError, setAddRoleError] = useState("");
  const [addRolePending, setAddRolePending] = useState(false);

  // Fetch custom roles on mount
  useEffect(() => {
    getCustomRoles().then((res) => {
      if (res.customRoles) {
        setCustomRoles(res.customRoles.map(cr => ({ id: cr.id, name: cr.name, baseRole: cr.baseRole })));
      }
    });
  }, []);

  async function handleAddCustomRole() {
    const trimmed = newRoleName.trim();
    if (!trimmed) {
      setAddRoleError("Role name cannot be empty");
      return;
    }
    setAddRolePending(true);
    setAddRoleError("");
    try {
      const res = await createCustomRole(trimmed, newRoleBase);
      if (res.error) {
        setAddRoleError(res.error);
        return;
      }
      if (res.customRole) {
        const newCr = { id: res.customRole.id, name: res.customRole.name, baseRole: res.customRole.baseRole };
        setCustomRoles(prev => [...prev, newCr]);
        // Automatically select the newly created role
        setForm({
          ...form,
          role: res.customRole.baseRole,
          customRole: res.customRole.name,
          customRoleId: res.customRole.id
        });
        setShowAddRoleModal(false);
        setNewRoleName("");
      }
    } catch (err) {
      console.error(err);
      setAddRoleError("Failed to add custom role");
    } finally {
      setAddRolePending(false);
    }
  }

  // Notify parent whenever step changes
  function goToStep(next: number) {
    setStep(next);
    onStepChange?.(next);
  }

  // Load existing documents when in edit mode
  useEffect(() => {
    if (isEdit && employeeId) {
      getEmployeeDocuments(employeeId)
        .then(({ docs }) => {
          setUploadedDocs(docs.map(d => ({
            id: d.id,
            docType: d.docType,
            fileName: d.fileName,
            driveViewUrl: d.driveViewUrl,
            storageType: d.storageType,
            expiryDate: d.expiryDate ? new Date(d.expiryDate).toISOString().slice(0, 10) : null
          })));
        })
        .catch(err => console.error("Failed to load documents", err));
    }
  }, [isEdit, employeeId]);

  const displayError = localError || error;

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [key]: e.target.value });
    setLocalError("");
  };

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setLocalError("Photo must be under 5 MB"); return; }
    try {
      const b64 = await resizeImage(file, 200);
      setForm({ ...form, photoBase64: b64 });
      setLocalError("");
    } catch {
      setLocalError("Failed to process image");
    }
  }

  function validateStep(currentStep: number): boolean {
    setLocalError("");
    if (currentStep === 1) {
      if (!form.name.trim() || !/^[a-zA-Z\s]+$/.test(form.name)) {
        setLocalError("Valid name required (alphabets only)");
        return false;
      }
      if (!form.phone.trim() || form.phone.length !== 10) {
        setLocalError("Phone must be exactly 10 digits");
        return false;
      }
      if (!form.email.trim() || !form.email.includes("@")) {
        setLocalError("Valid email required");
        return false;
      }
      if (!isEdit) {
        const pwCheck = validatePassword(form.password);
        if (!pwCheck.valid) {
          setLocalError(pwCheck.message);
          return false;
        }
      } else if (form.password.trim()) {
        const pwCheck = validatePassword(form.password);
        if (!pwCheck.valid) {
          setLocalError(pwCheck.message);
          return false;
        }
      }
    }
    if (currentStep === 2) {
      if (form.monthlySalary.trim()) {
        const sal = Number(form.monthlySalary);
        if (isNaN(sal) || sal <= 0) {
          setLocalError("Salary must be a positive number");
          return false;
        }
        if (!form.effectiveFrom) {
          setLocalError("Effective date is required when monthly salary is specified");
          return false;
        }
      }
    }
    if (currentStep === 3) {
      if (form.bankAccountNo.trim() && !/^\d{9,18}$/.test(form.bankAccountNo)) {
        setLocalError("Bank account must be 9–18 digits");
        return false;
      }
      if (form.ifscCode.trim() && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifscCode.toUpperCase())) {
        setLocalError("Invalid IFSC code (e.g. SBIN0001234)");
        return false;
      }
    }
    if (currentStep === 4) {
      if (form.aadhaarNo.trim() && !/^\d{12}$/.test(form.aadhaarNo)) {
        setLocalError("Aadhaar must be exactly 12 digits");
        return false;
      }
      if (form.panNo.trim() && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.panNo.toUpperCase())) {
        setLocalError("Invalid PAN format (e.g. ABCDE1234F)");
        return false;
      }
    }
    return true;
  }

  function handleNext() {
    if (validateStep(step)) {
      goToStep(Math.min(step + 1, 5));
    }
  }

  function handleBack() {
    setLocalError("");
    goToStep(Math.max(step - 1, 1));
  }

  function handleStepClick(targetStep: number) {
    if (targetStep > step) {
      for (let s = step; s < targetStep; s++) {
        if (!validateStep(s)) return;
      }
    }
    setLocalError("");
    goToStep(targetStep);
  }

  // ── Document file select ─────────────────────────────────────────────────
  function handleDocFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocError("");
    if (file.size > 10 * 1024 * 1024) { setDocError("Max 10 MB allowed"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setSelectedDocFile({ name: file.name, base64: result.split(",")[1] ?? result, mime: file.type });
    };
    reader.readAsDataURL(file);
  }

  // ── Upload selected document to Drive ───────────────────────────────────
  async function handleDocUpload() {
    if (!selectedDocFile) { setDocError("Please select a file"); return; }
    if (!employeeId && !isEdit) {
      // For new staff — queue doc: show a note to upload after saving
      setDocError("Save the staff member first, then upload documents from their profile.");
      return;
    }
    if (!employeeId) { setDocError("Employee ID missing"); return; }
    setDocUploading(true);
    setDocError("");
    try {
      const result = await uploadDocument({
        entityType:   "USER",
        entityId:     employeeId,
        docType:      docForm.docType,
        fileName:     selectedDocFile.name,
        fileBase64:   selectedDocFile.base64,
        mimeType:     selectedDocFile.mime,
        expiryDate:   docForm.expiryDate || undefined,
        employeeName: form.name,
      });
      if ("error" in result) { setDocError(result.error ?? "Failed to upload document"); return; }
      setUploadedDocs((prev) => [
        { id: result.doc.id, docType: docForm.docType, fileName: selectedDocFile.name,
          driveViewUrl: result.driveViewUrl ?? null, storageType: result.storageType ?? "LOCAL",
          expiryDate: docForm.expiryDate || null },
        ...prev,
      ]);
      setSelectedDocFile(null);
      setDocForm({ docType: "AADHAAR", expiryDate: "" });
      if (docFileRef.current) docFileRef.current.value = "";
    } finally {
      setDocUploading(false);
    }
  }

  async function handleDocDelete(docId: string) {
    await deleteDocument(docId);
    setUploadedDocs((prev) => prev.filter((d) => d.id !== docId));
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

  const inp = "input";
  const lbl = "block text-[12px] font-medium mb-1.5";
  const lblColor = { color: "#52525B" };
  const req = <span style={{ color: "#EF4444" }}>*</span>;

  const steps = [
    { id: 1, label: "Account" },
    { id: 2, label: "Salary" },
    { id: 3, label: "Bank" },
    { id: 4, label: "Identity" },
    { id: 5, label: "Documents" },
  ];

  return (
    <>
      <div className="space-y-5">
      {/* ── Steps Navigation ── */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        {steps.map((s, idx) => (
          <div key={s.id} className="flex items-center flex-1 last:flex-initial">
            <button
              type="button"
              onClick={() => handleStepClick(s.id)}
              className="flex items-center gap-2 group focus:outline-none"
            >
              <span className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors",
                step === s.id
                  ? "bg-blue-600 text-white"
                  : step > s.id
                    ? "bg-green-100 text-green-700"
                    : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
              )}>
                {step > s.id ? "✓" : s.id}
              </span>
              <span className={cn(
                "text-[11px] font-bold uppercase tracking-wider hidden md:inline",
                step === s.id ? "text-slate-800" : "text-slate-400 group-hover:text-slate-600"
              )}>
                {s.label}
              </span>
            </button>
            {idx < steps.length - 1 && (
              <div className="h-[2px] flex-1 mx-3 bg-slate-100" />
            )}
          </div>
        ))}
      </div>

      {displayError && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg"
          style={{ background: "#FEF2F2", border: "1px solid #FCA5A5" }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#DC2626" }} />
          <span className="text-[13px]" style={{ color: "#B91C1C" }}>{displayError}</span>
        </div>
      )}

      {/* ── STEP 1: BASIC ACCOUNT DETAILS ── */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Basic Information &amp; Photo
          </p>

          <div className="flex flex-col items-center gap-2 pb-4 border-b border-slate-100">
            <div
              onClick={() => fileRef.current?.click()}
              className="relative cursor-pointer group"
              style={{ width: 80, height: 80 }}
            >
              {form.photoBase64 ? (
                <img src={form.photoBase64} alt="Photo"
                  style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover",
                    border: "2px solid #2563EB" }} />
              ) : (
                <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#EFF6FF",
                  border: "2px dashed #93C5FD", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <User className="w-8 h-8" style={{ color: "#93C5FD" }} />
                </div>
              )}
              <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "rgba(0,0,0,0.4)" }}>
                <Camera className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-[11px]" style={{ color: "#71717A" }}>
              Click to upload photo (JPG/PNG, max 5MB)
            </p>
            {form.photoBase64 && (
              <button type="button" onClick={() => setForm({ ...form, photoBase64: "" })}
                className="text-[11px] text-red-600 bg-none border-none cursor-pointer hover:underline">
                Remove photo
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          </div>

          <div className="space-y-3">
            <div>
              <label className={lbl} style={lblColor}>Full Name {req} (alphabets only)</label>
              <input value={form.name} onChange={set("name")} placeholder="e.g., Ramesh Kumar" className={inp} autoComplete="name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl} style={lblColor}>Mobile No. {req}</label>
                <input type="tel" value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g,"").slice(0,10) })}
                  placeholder="9876543210" className={inp} autoComplete="tel" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={lbl} style={{ ...lblColor, marginBottom: 0 }}>Role {req}</label>
                </div>
                <select value={form.customRoleId ? `CUSTOM:${form.customRoleId}` : form.role}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.startsWith("CUSTOM:")) {
                      const id = val.replace("CUSTOM:", "");
                      const found = customRoles.find(cr => cr.id === id);
                      if (found) {
                        setForm({
                          ...form,
                          role: found.baseRole,
                          customRole: found.name,
                          customRoleId: found.id
                        });
                      }
                    } else {
                      setForm({
                        ...form,
                        role: val,
                        customRole: "",
                        customRoleId: ""
                      });
                    }
                    setLocalError("");
                  }}
                  className={`${inp} select`}>
                  <optgroup label="System Roles">
                    <option value="MANAGER">Manager</option>
                    <option value="GODOWN_KEEPER">Godown Keeper</option>
                    <option value="CASHIER">Cashier</option>
                    <option value="STAFF">Staff</option>
                    <option value="DELIVERY_BOY">Delivery Boy</option>
                  </optgroup>
                  {customRoles.length > 0 && (
                    <optgroup label="Custom Roles">
                      {customRoles.map((cr) => (
                        <option key={cr.id} value={`CUSTOM:${cr.id}`}>{cr.name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            </div>
            <div>
              <label className={lbl} style={lblColor}>Email Address {req}</label>
              <input type="email" value={form.email} onChange={set("email")} placeholder="ramesh@agency.com" className={inp} autoComplete="email" />
            </div>
            <div>
              <label className={lbl} style={lblColor}>
                Password {isEdit ? "(leave blank to keep current)" : req} (min. 8 chars, A-Z, 0-9 & special char)
              </label>
              <div className="relative">
                <input type={showPwd ? "text" : "password"} value={form.password} onChange={set("password")}
                  placeholder={isEdit ? "Leave blank to keep current" : "Set a password"}
                  className={`${inp} pr-9`} autoComplete={isEdit ? "current-password" : "new-password"} />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#71717A" }}>
                  {showPwd ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: SALARY PROFILE ── */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Salary &amp; Compensation Settings
          </p>

          <div className="space-y-3">
            <div>
              <label className={lbl} style={lblColor}>Monthly Base Salary (₹)</label>
              <input
                type="number"
                value={form.monthlySalary}
                onChange={set("monthlySalary")}
                placeholder="e.g. 15000"
                className={inp}
              />
            </div>
            <div>
              <label className={lbl} style={lblColor}>
                Effective From Date {form.monthlySalary.trim() && req}
              </label>
              <input
                type="date"
                value={form.effectiveFrom}
                onChange={set("effectiveFrom")}
                className={inp}
              />
            </div>
            <div>
              <label className={lbl} style={lblColor}>Notes / Remarks</label>
              <textarea
                value={form.salaryNotes}
                onChange={set("salaryNotes")}
                placeholder="Details about components, incentives, etc."
                className={`${inp} min-h-[80px] py-2`}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3: BANK DETAILS ── */}
      {step === 3 && (
        <div className="space-y-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Bank details for Salary Disbursal
          </p>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl} style={lblColor}>Bank Name</label>
                <input value={form.bankName} onChange={set("bankName")} placeholder="e.g., SBI, HDFC" className={inp} />
              </div>
              <div>
                <label className={lbl} style={lblColor}>IFSC Code</label>
                <input value={form.ifscCode}
                  onChange={(e) => setForm({ ...form, ifscCode: e.target.value.toUpperCase().slice(0,11) })}
                  placeholder="SBIN0001234" className={inp} />
              </div>
            </div>
            <div>
              <label className={lbl} style={lblColor}>Bank Account Number</label>
              <input value={form.bankAccountNo}
                onChange={(e) => setForm({ ...form, bankAccountNo: e.target.value.replace(/\D/g,"").slice(0,18) })}
                placeholder="Account number (9–18 digits)" className={inp} />
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 4: IDENTITY DOCUMENTS ── */}
      {step === 4 && (
        <div className="space-y-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Identity &amp; Legal Verification
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl} style={lblColor}>Aadhaar Number (12 digits)</label>
              <input value={form.aadhaarNo}
                onChange={(e) => setForm({ ...form, aadhaarNo: e.target.value.replace(/\D/g,"").slice(0,12) })}
                placeholder="123456789012" className={inp} maxLength={12} />
            </div>
            <div>
              <label className={lbl} style={lblColor}>PAN Number</label>
              <input value={form.panNo}
                onChange={(e) => setForm({ ...form, panNo: e.target.value.toUpperCase().slice(0,10) })}
                placeholder="ABCDE1234F" className={inp} maxLength={10} />
            </div>
          </div>
          <p className="text-[11px] mt-2" style={{ color: "#A1A1AA" }}>
            Identity numbers are stored securely and visible only to Admins.
          </p>
        </div>
      )}

      {/* ── STEP 5: DOCUMENT UPLOAD (Google Drive) ── */}
      {step === 5 && (
        <div className="space-y-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Employee Documents
          </p>

          {/* ── ADD MODE: queue docs, upload after staff is saved ── */}
          {!isEdit && (
            <>
              <div className="px-3 py-2 rounded-lg text-[12px]"
                style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", color: "#1E40AF" }}>
                📎 Select documents below — they will upload automatically after the staff account is created.
              </div>

              <div className="rounded-lg p-4 space-y-3" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                <p className="text-[12px] font-semibold" style={{ color: "#18181B" }}>Add Document to Queue</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl} style={lblColor}>Document Type</label>
                    <select className={`${inp} select`} value={docForm.docType}
                      onChange={(e) => setDocForm({ ...docForm, docType: e.target.value })}>
                      {EMPLOYEE_DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={lbl} style={lblColor}>Expiry Date (optional)</label>
                    <input type="date" className={inp} value={docForm.expiryDate}
                      onChange={(e) => setDocForm({ ...docForm, expiryDate: e.target.value })} />
                  </div>
                </div>

                <div
                  className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors"
                  style={{ borderColor: selectedDocFile ? "#2563EB" : "#CBD5E1", background: selectedDocFile ? "#EFF6FF" : "#fff" }}
                  onClick={() => docFileRef.current?.click()}
                >
                  <input ref={docFileRef} type="file" className="hidden"
                    accept={EMPLOYEE_DOC_TYPES.find((t) => t.value === docForm.docType)?.accept ?? ".pdf,.jpg,.jpeg,.png"}
                    onChange={handleDocFileSelect} />
                  {selectedDocFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="w-4 h-4" style={{ color: "#2563EB" }} />
                      <span className="text-[13px] font-medium" style={{ color: "#2563EB" }}>{selectedDocFile.name}</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 mx-auto mb-1" style={{ color: "#94A3B8" }} />
                      <p className="text-[12px]" style={{ color: "#64748B" }}>Click to select file (PDF / JPG / PNG, max 10 MB)</p>
                    </>
                  )}
                </div>

                {docError && <p className="text-[12px] px-2 py-1.5 rounded" style={{ background: "#FEF2F2", color: "#DC2626" }}>{docError}</p>}

                <button type="button" disabled={!selectedDocFile}
                  className="btn btn-primary w-full"
                  style={{ opacity: !selectedDocFile ? 0.5 : 1 }}
                  onClick={() => {
                    if (!selectedDocFile) return;
                    const newDoc: PendingDoc = {
                      docType: docForm.docType, fileName: selectedDocFile.name,
                      base64: selectedDocFile.base64, mimeType: selectedDocFile.mime,
                      expiryDate: docForm.expiryDate || undefined,
                    };
                    onPendingDocsChange?.([...pendingDocs, newDoc]);
                    setSelectedDocFile(null);
                    setDocForm({ docType: "AADHAAR", expiryDate: "" });
                    if (docFileRef.current) docFileRef.current.value = "";
                  }}>
                  + Add to Queue
                </button>
              </div>

              {pendingDocs.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Queued ({pendingDocs.length}) — will upload on Save</p>
                  {pendingDocs.map((d, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg"
                      style={{ background: "#F0F9FF", border: "1px solid #BAE6FD" }}>
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" style={{ color: "#0284C7" }} />
                        <div>
                          <p className="text-[12px] font-medium" style={{ color: "#0C4A6E" }}>{d.docType} — {d.fileName}</p>
                          <p className="text-[10px]" style={{ color: "#0284C7" }}>⏳ Will upload after save</p>
                        </div>
                      </div>
                      <button type="button"
                        className="w-6 h-6 rounded flex items-center justify-center hover:bg-red-100 transition-colors"
                        onClick={() => onPendingDocsChange?.(pendingDocs.filter((_, j) => j !== i))}>
                        <Trash2 className="w-3 h-3" style={{ color: "#DC2626" }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── EDIT MODE: upload directly to Drive ── */}
          {isEdit && (
            <>
              <div className="rounded-lg p-4 space-y-3" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                <p className="text-[12px] font-semibold" style={{ color: "#18181B" }}>Upload New Document</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl} style={lblColor}>Document Type</label>
                    <select className={`${inp} select`} value={docForm.docType}
                      onChange={(e) => setDocForm({ ...docForm, docType: e.target.value })}>
                      {EMPLOYEE_DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={lbl} style={lblColor}>Expiry Date (optional)</label>
                    <input type="date" className={inp} value={docForm.expiryDate}
                      onChange={(e) => setDocForm({ ...docForm, expiryDate: e.target.value })} />
                  </div>
                </div>
                <div
                  className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors"
                  style={{ borderColor: selectedDocFile ? "#2563EB" : "#CBD5E1", background: selectedDocFile ? "#EFF6FF" : "#fff" }}
                  onClick={() => docFileRef.current?.click()}
                >
                  <input ref={docFileRef} type="file" className="hidden"
                    accept={EMPLOYEE_DOC_TYPES.find((t) => t.value === docForm.docType)?.accept ?? ".pdf,.jpg,.jpeg,.png"}
                    onChange={handleDocFileSelect} />
                  {selectedDocFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="w-4 h-4" style={{ color: "#2563EB" }} />
                      <span className="text-[13px] font-medium" style={{ color: "#2563EB" }}>{selectedDocFile.name}</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 mx-auto mb-1" style={{ color: "#94A3B8" }} />
                      <p className="text-[12px]" style={{ color: "#64748B" }}>Click to select file (PDF / JPG / PNG, max 10 MB)</p>
                    </>
                  )}
                </div>
                {docError && <p className="text-[12px] px-2 py-1.5 rounded" style={{ background: "#FEF2F2", color: "#DC2626" }}>{docError}</p>}
                <button type="button" onClick={handleDocUpload} disabled={docUploading || !selectedDocFile}
                  className="btn btn-primary w-full"
                  style={{ opacity: (!selectedDocFile || docUploading) ? 0.5 : 1 }}>
                  {docUploading ? "Uploading to Drive…" : "⬆ Upload to Google Drive"}
                </button>
              </div>
              {uploadedDocs.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Uploaded This Session</p>
                  {uploadedDocs.map((d) => (
                    <div key={d.id} className="flex items-center justify-between px-3 py-2 rounded-lg"
                      style={{ background: "#F0FDF4", border: "1px solid #86EFAC" }}>
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" style={{ color: "#16A34A" }} />
                        <div>
                          <p className="text-[12px] font-medium" style={{ color: "#14532D" }}>{d.docType} — {d.fileName}</p>
                          <p className="text-[10px]" style={{ color: "#16A34A" }}>
                            {d.storageType === "GOOGLE_DRIVE" ? "✓ Saved to Google Drive" : "✓ Saved to DB"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => handlePreview(d.id, d.storageType, d.driveViewUrl)}
                          className="w-6 h-6 rounded flex items-center justify-center hover:bg-green-100 transition-colors"
                          title="Preview Document">
                          <Eye className="w-3 h-3" style={{ color: "#16A34A" }} />
                        </button>
                        <button type="button" onClick={() => handleDocDelete(d.id)}
                          className="w-6 h-6 rounded flex items-center justify-center hover:bg-red-100 transition-colors"
                          title="Remove">
                          <Trash2 className="w-3 h-3" style={{ color: "#DC2626" }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Step Actions ── */}
      <div className="flex justify-between items-center pt-4 border-t border-slate-100">
        <button type="button" onClick={onCancel} className="btn btn-secondary">
          Cancel
        </button>

        <div className="flex gap-2">
          {step > 1 && (
            <button type="button" onClick={handleBack} className="btn btn-secondary flex items-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          )}

          {step < 5 && (
            <button key="btn-next" type="button" onClick={handleNext} className="btn btn-primary flex items-center gap-1.5">
              Next <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
          {step === 5 && (
            <button key="btn-save" type="submit" disabled={isPending} className="btn btn-primary flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> {isPending ? "Saving…" : submitLabel}
            </button>
          )}
        </div>
      </div>
    </div>

      {/* ── Add Custom Role Modal ── */}
      <Modal open={showAddRoleModal} onClose={() => setShowAddRoleModal(false)} title="Add Custom Staff Role" size="sm">
        <div className="space-y-4 pt-1">
          {addRoleError && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-[13px] bg-red-50 border border-red-200 text-red-700">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{addRoleError}</span>
            </div>
          )}
          
          <div className="space-y-1">
            <label className="text-[12px] font-medium text-slate-700">Role Name (e.g. Supervisor, Accountant)</label>
            <input type="text" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="Enter role name" className="input" style={{ height: "38px" }} />
          </div>

          <div className="space-y-1">
            <label className="text-[12px] font-medium text-slate-700">Base Template Role</label>
            <select value={newRoleBase} onChange={(e) => setNewRoleBase(e.target.value as Role)}
              className="input select" style={{ height: "38px" }}>
              <option value="STAFF">Office Staff (Default)</option>
              <option value="MANAGER">Manager</option>
              <option value="GODOWN_KEEPER">Godown Keeper</option>
              <option value="CASHIER">Cashier</option>
              <option value="DELIVERY_BOY">Delivery Boy</option>
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Select a template to copy default permissions and screen layouts.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowAddRoleModal(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="button" onClick={handleAddCustomRole} disabled={addRolePending}
              className="btn btn-primary flex items-center gap-1.5">
              {addRolePending ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Adding...</>
              ) : (
                "Save Role"
              )}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
