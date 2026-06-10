"use client";

import { useState, useTransition, useEffect } from "react";
import { Shield, ShieldCheck, ShieldOff, Copy, CheckCircle2, AlertTriangle, QrCode, Key } from "lucide-react";
import { initiate2FASetup, confirm2FASetup, disable2FA, get2FAStatus } from "@/app/actions/twofa";
import QRCode from "qrcode";

type Step = "idle" | "setup" | "confirm" | "done";

export function TwoFASetupClient() {
  const [status, setStatus] = useState<{ enabled: boolean } | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [secret, setSecret] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [token, setToken] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    get2FAStatus().then(setStatus);
  }, []);

  const handleSetup = () => {
    startTransition(async () => {
      const result = await initiate2FASetup();
      if ("error" in result) { setError(result.error ?? null); return; }
      setSecret(result.secret);
      // Generate QR code as data URL client-side
      const url = await QRCode.toDataURL(result.uri, { width: 200, margin: 1 });
      setQrDataUrl(url);
      setStep("setup");
      setError(null);
    });
  };

  const handleConfirm = () => {
    if (token.length !== 6) { setError("Enter the 6-digit code from your authenticator app"); return; }
    startTransition(async () => {
      const result = await confirm2FASetup(token);
      if ("error" in result) { setError(result.error ?? null); return; }
      setBackupCodes(result.backupCodes ?? []);
      setStep("done");
      setStatus({ enabled: true });
      setError(null);
    });
  };

  const handleDisable = () => {
    if (token.length !== 6) { setError("Enter your current authenticator code to disable 2FA"); return; }
    startTransition(async () => {
      const result = await disable2FA(token);
      if ("error" in result) { setError(result.error ?? null); return; }
      setStatus({ enabled: false });
      setStep("idle");
      setToken("");
      setError(null);
    });
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!status) return <div className="card p-8 text-center text-[13px]" style={{ color: "#A1A1AA" }}>Loading…</div>;

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: status.enabled ? "#DCFCE7" : "#F4F4F5" }}>
          {status.enabled
            ? <ShieldCheck className="w-5 h-5" style={{ color: "#16A34A" }} />
            : <Shield className="w-5 h-5" style={{ color: "#A1A1AA" }} />}
        </div>
        <div>
          <h2 className="text-[15px] font-semibold" style={{ color: "#18181B" }}>Two-Factor Authentication</h2>
          <p className="text-[12px]" style={{ color: "#71717A" }}>
            {status.enabled ? "2FA is active — your account is protected" : "Add an extra layer of security to your account"}
          </p>
        </div>
        <span className="ml-auto badge" style={{ background: status.enabled ? "#DCFCE7" : "#F4F4F5", color: status.enabled ? "#15803D" : "#71717A" }}>
          {status.enabled ? "Enabled" : "Disabled"}
        </span>
      </div>

      {/* STEP: Idle — not yet enabled */}
      {!status.enabled && step === "idle" && (
        <div className="card p-5">
          <p className="text-[13px] mb-4" style={{ color: "#52525B" }}>
            Protect your account with a time-based one-time password (TOTP) from Google Authenticator, Authy, or any compatible app.
          </p>
          <ul className="space-y-2 mb-5">
            {["Open your authenticator app", "Scan the QR code shown", "Enter the 6-digit code to confirm"].map((s, i) => (
              <li key={i} className="flex items-center gap-2 text-[13px]" style={{ color: "#52525B" }}>
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0" style={{ background: "#2563EB" }}>{i + 1}</span>
                {s}
              </li>
            ))}
          </ul>
          {error && <p className="text-[12px] mb-3" style={{ color: "#DC2626" }}>{error}</p>}
          <button onClick={handleSetup} disabled={isPending} className="btn btn-primary">
            {isPending ? "Generating…" : "Set Up 2FA"}
          </button>
        </div>
      )}

      {/* STEP: QR + Secret */}
      {step === "setup" && (
        <div className="card p-5">
          <p className="text-[13px] font-semibold mb-4" style={{ color: "#18181B" }}>
            1. Scan this QR code with your authenticator app
          </p>
          {qrDataUrl && (
            <div className="flex justify-center mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="2FA QR Code" className="rounded-lg border" style={{ width: 180, height: 180 }} />
            </div>
          )}
          <p className="text-[12px] mb-1" style={{ color: "#71717A" }}>Or enter this secret manually:</p>
          <div className="flex items-center gap-2 p-2 rounded-md mb-5" style={{ background: "#F4F4F5", fontFamily: "monospace" }}>
            <span className="text-[13px] flex-1 break-all" style={{ color: "#18181B" }}>{secret}</span>
            <button onClick={copySecret} className="flex-shrink-0">
              {copied ? <CheckCircle2 className="w-4 h-4" style={{ color: "#16A34A" }} /> : <Copy className="w-4 h-4" style={{ color: "#A1A1AA" }} />}
            </button>
          </div>
          <p className="text-[13px] font-semibold mb-2" style={{ color: "#18181B" }}>2. Enter the 6-digit code to verify</p>
          <input
            className="input mb-3"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={token}
            onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
          {error && <p className="text-[12px] mb-3" style={{ color: "#DC2626" }}>{error}</p>}
          <div className="flex gap-2">
            <button onClick={handleConfirm} disabled={isPending} className="btn btn-primary">{isPending ? "Verifying…" : "Confirm & Enable 2FA"}</button>
            <button onClick={() => { setStep("idle"); setError(null); }} className="btn btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* STEP: Done — show backup codes */}
      {step === "done" && backupCodes.length > 0 && (
        <div className="card p-5" style={{ border: "1px solid #86EFAC" }}>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5" style={{ color: "#16A34A" }} />
            <p className="text-[14px] font-semibold" style={{ color: "#15803D" }}>2FA enabled successfully!</p>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-lg mb-4" style={{ background: "#FEF9C3", border: "1px solid #FDE047" }}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#854D0E" }} />
            <p className="text-[12px]" style={{ color: "#713F12" }}>
              Save these backup codes in a safe place. Each code can only be used once to access your account if you lose your authenticator.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {backupCodes.map((code) => (
              <code key={code} className="text-center py-2 rounded text-[13px] font-mono" style={{ background: "#F4F4F5", color: "#18181B" }}>{code}</code>
            ))}
          </div>
          <button onClick={() => { navigator.clipboard.writeText(backupCodes.join("\n")); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="btn btn-secondary w-full flex items-center justify-center gap-2">
            {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy all backup codes"}
          </button>
        </div>
      )}

      {/* 2FA already enabled — disable flow */}
      {status.enabled && step !== "done" && (
        <div className="card p-5 mt-4" style={{ border: "1px solid #FCA5A5" }}>
          <div className="flex items-center gap-2 mb-3">
            <ShieldOff className="w-4 h-4" style={{ color: "#DC2626" }} />
            <p className="text-[13px] font-semibold" style={{ color: "#B91C1C" }}>Disable Two-Factor Authentication</p>
          </div>
          <p className="text-[12px] mb-3" style={{ color: "#71717A" }}>Enter your current authenticator code to disable 2FA. This will make your account less secure.</p>
          <input
            className="input mb-3"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="6-digit code"
            value={token}
            onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
          {error && <p className="text-[12px] mb-3" style={{ color: "#DC2626" }}>{error}</p>}
          <button onClick={handleDisable} disabled={isPending} className="btn btn-danger">{isPending ? "Disabling…" : "Disable 2FA"}</button>
        </div>
      )}
    </div>
  );
}
