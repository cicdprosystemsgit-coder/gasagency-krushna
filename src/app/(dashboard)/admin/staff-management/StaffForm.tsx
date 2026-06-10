"use client";

import { useRef, useState } from "react";
import { AlertTriangle, Eye, EyeOff, Camera, User } from "lucide-react";

export type FormState = {
  name: string; email: string; phone: string; role: string; password: string;
  bankAccountNo: string; bankName: string; ifscCode: string;
  aadhaarNo: string; panNo: string; photoBase64: string;
};

export const EMPTY_FORM: FormState = {
  name: "", email: "", phone: "", role: "STAFF", password: "",
  bankAccountNo: "", bankName: "", ifscCode: "",
  aadhaarNo: "", panNo: "", photoBase64: "",
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
}

export function StaffForm({ form, setForm, error, isPending, onCancel, submitLabel, isEdit }: Props) {
  const [showPwd, setShowPwd] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [key]: e.target.value });

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("Photo must be under 5 MB"); return; }
    const b64 = await resizeImage(file, 200);
    setForm({ ...form, photoBase64: b64 });
  }

  const inp = "input";
  const lbl = "block text-[12px] font-medium mb-1.5";
  const lblColor = { color: "#52525B" };
  const req = <span style={{ color: "#EF4444" }}>*</span>;

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg"
          style={{ background: "#FEF2F2", border: "1px solid #FCA5A5" }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#DC2626" }} />
          <span className="text-[13px]" style={{ color: "#B91C1C" }}>{error}</span>
        </div>
      )}

      {/* ── Photo Upload ────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-2 pb-4" style={{ borderBottom: "1px solid #F4F4F5" }}>
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
            className="text-[11px]" style={{ color: "#DC2626", background: "none", border: "none", cursor: "pointer" }}>
            Remove photo
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
      </div>

      {/* ── Section: Basic Info ──────────────────────────────────────────── */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: "#A1A1AA" }}>
          Basic Information
        </p>
        <div className="space-y-3">
          <div>
            <label className={lbl} style={lblColor}>Full Name {req} (alphabets only)</label>
            <input value={form.name} onChange={set("name")} placeholder="e.g., Ramesh Kumar" className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl} style={lblColor}>Mobile No. {req}</label>
              <input type="tel" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g,"").slice(0,10) })}
                placeholder="9876543210" className={inp} />
            </div>
            <div>
              <label className={lbl} style={lblColor}>Role {req}</label>
              <select value={form.role} onChange={set("role")} className={`${inp} select`}>
                <option value="MANAGER">Manager</option>
                <option value="GODOWN_KEEPER">Godown Keeper</option>
                <option value="STAFF">Staff</option>
                <option value="DELIVERY_BOY">Delivery Boy</option>
              </select>
            </div>
          </div>
          <div>
            <label className={lbl} style={lblColor}>Email Address {req}</label>
            <input type="email" value={form.email} onChange={set("email")} placeholder="ramesh@agency.com" className={inp} />
          </div>
          <div>
            <label className={lbl} style={lblColor}>
              Password {isEdit ? "(leave blank to keep current)" : req} (min. 6 chars)
            </label>
            <div className="relative">
              <input type={showPwd ? "text" : "password"} value={form.password} onChange={set("password")}
                placeholder={isEdit ? "Leave blank to keep current" : "Set a password"}
                className={`${inp} pr-9`} />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#71717A" }}>
                {showPwd ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section: Bank Details ────────────────────────────────────────── */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: "#A1A1AA" }}>
          Bank Details
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

      {/* ── Section: Identity Documents ──────────────────────────────────── */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: "#A1A1AA" }}>
          Identity Documents
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
          Identity numbers are stored securely and visible only to Admin.
        </p>
      </div>

      {/* ── Actions ──────────────────────────────────────────────────────── */}
      <div className="flex justify-end gap-2 pt-1" style={{ borderTop: "1px solid #F4F4F5" }}>
        <button type="button" onClick={onCancel} className="btn btn-secondary">Cancel</button>
        <button type="submit" disabled={isPending} className="btn btn-primary">
          {isPending ? "Saving…" : submitLabel}
        </button>
      </div>
    </div>
  );
}
