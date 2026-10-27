"use client";

import { useState, useTransition, useEffect } from "react";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  Download,
  QrCode,
  Key,
  Loader2,
  AlertCircle,
  X,
  Smartphone,
} from "lucide-react";
import { initiate2FASetup, confirm2FASetup, disable2FA, get2FAStatus } from "@/app/actions/twofa";
import QRCode from "qrcode";

interface TwoFactorToggleProps {
  variant?: "card" | "compact";
  onStatusChange?: (enabled: boolean) => void;
}

export function TwoFactorToggle({ variant = "card", onStatusChange }: TwoFactorToggleProps) {
  const [status, setStatus] = useState<{
    enabled: boolean;
    email: string;
    backupCodesRemaining: number;
  } | null>(null);

  // Modals state
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);

  // Setup state
  const [setupStep, setSetupStep] = useState<"scan" | "backup">("scan");
  const [secret, setSecret] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);

  // Disable state
  const [disableCode, setDisableCode] = useState("");

  // Error handling
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadStatus = () => {
    get2FAStatus().then((s) => {
      setStatus(s);
      onStatusChange?.(s.enabled);
    });
  };

  useEffect(() => {
    loadStatus();
  }, []);

  // ── Open Setup ─────────────────────────────────────────────────────────────
  const handleStartSetup = () => {
    setErrorMessage(null);
    setConfirmCode("");
    setSetupStep("scan");
    startTransition(async () => {
      const result = await initiate2FASetup();
      if ("error" in result) {
        setErrorMessage(result.error ?? "Failed to initiate setup");
        return;
      }
      setSecret(result.secret);
      const url = await QRCode.toDataURL(result.uri, {
        width: 220,
        margin: 1.5,
        color: { dark: "#0f172a", light: "#ffffff" },
      });
      setQrDataUrl(url);
      setShowSetupModal(true);
    });
  };

  // ── Confirm Setup ──────────────────────────────────────────────────────────
  const handleConfirmSetup = () => {
    if (confirmCode.trim().length !== 6) {
      setErrorMessage("Please enter the 6-digit code from Google Authenticator.");
      return;
    }
    setErrorMessage(null);
    startTransition(async () => {
      const result = await confirm2FASetup(confirmCode.trim());
      if ("error" in result) {
        setErrorMessage(result.error ?? "Failed to confirm 2FA code.");
        return;
      }
      setBackupCodes(result.backupCodes ?? []);
      setSetupStep("backup");
      setStatus((prev) => (prev ? { ...prev, enabled: true, backupCodesRemaining: 8 } : null));
      onStatusChange?.(true);
    });
  };

  // ── Confirm Disable ────────────────────────────────────────────────────────
  const handleConfirmDisable = () => {
    if (disableCode.trim().length !== 6) {
      setErrorMessage("Please enter your current 6-digit code to disable 2FA.");
      return;
    }
    setErrorMessage(null);
    startTransition(async () => {
      const result = await disable2FA(disableCode.trim());
      if ("error" in result) {
        setErrorMessage(result.error ?? "Failed to disable 2FA.");
        return;
      }
      setShowDisableModal(false);
      setDisableCode("");
      setStatus((prev) => (prev ? { ...prev, enabled: false, backupCodesRemaining: 0 } : null));
      onStatusChange?.(false);
    });
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    setCopiedBackup(true);
    setTimeout(() => setCopiedBackup(false), 2000);
  };

  const downloadBackupCodes = () => {
    const text = `GasAgency SaaS - 2FA Emergency Backup Codes\nGenerated: ${new Date().toISOString()}\n\n` +
      backupCodes.map((c, i) => `${i + 1}. ${c}`).join("\n") +
      `\n\nKeep these codes safe. Each code can only be used once.`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gasagency-2fa-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!status) {
    return (
      <div className="flex items-center gap-2 text-xs text-zinc-400 py-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Loading Two-Factor Security...
      </div>
    );
  }

  return (
    <>
      {/* ── CARD VARIANT ── */}
      {variant === "card" ? (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm transition-all">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                  status.enabled
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                }`}
              >
                {status.enabled ? <ShieldCheck className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                    Two-Step Verification (Google Authenticator)
                  </h3>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      status.enabled
                        ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    {status.enabled ? "Active" : "Disabled"}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-md">
                  Protect your account by requiring a 6-digit code from Google Authenticator or Microsoft Authenticator whenever you sign in.
                </p>
                {status.enabled && status.backupCodesRemaining > 0 && (
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1.5 flex items-center gap-1.5">
                    <Key className="w-3 h-3" />
                    {status.backupCodesRemaining} backup codes remaining
                  </p>
                )}
              </div>
            </div>

            {/* Interactive ON / OFF Switch */}
            <div className="flex flex-col items-end gap-1.5">
              <button
                type="button"
                role="switch"
                aria-checked={status.enabled}
                disabled={isPending}
                onClick={() => {
                  if (status.enabled) {
                    setErrorMessage(null);
                    setDisableCode("");
                    setShowDisableModal(true);
                  } else {
                    handleStartSetup();
                  }
                }}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                  status.enabled ? "bg-emerald-600" : "bg-zinc-300 dark:bg-zinc-700"
                } ${isPending ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <span className="sr-only">Toggle Two-Step Verification</span>
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    status.enabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                {status.enabled ? "Turn OFF" : "Turn ON"}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* ── COMPACT VARIANT (for Dropdowns / Headers) ── */
        <div className="flex items-center justify-between py-2 px-1">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-zinc-500" />
            <div>
              <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">2-Step Verification</p>
              <p className="text-[10px] text-zinc-400">{status.enabled ? "Protected by Authenticator" : "Off"}</p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={status.enabled}
            disabled={isPending}
            onClick={() => {
              if (status.enabled) {
                setErrorMessage(null);
                setDisableCode("");
                setShowDisableModal(true);
              } else {
                handleStartSetup();
              }
            }}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
              status.enabled ? "bg-emerald-600" : "bg-zinc-300 dark:bg-zinc-700"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                status.enabled ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      )}

      {/* ── MODAL: SETUP 2FA (QR Code Scanner) ──────────────────────────────── */}
      {showSetupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <QrCode className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                    {setupStep === "scan" ? "Set Up Google Authenticator" : "Save Emergency Backup Codes"}
                  </h3>
                  <p className="text-[11px] text-zinc-400">Step {setupStep === "scan" ? "1 of 2" : "2 of 2"}</p>
                </div>
              </div>
              <button
                onClick={() => setShowSetupModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: STEP 1 - SCAN QR & CONFIRM */}
            {setupStep === "scan" && (
              <div className="p-6 space-y-5">
                <div className="text-xs text-zinc-600 dark:text-zinc-300 space-y-1.5 leading-relaxed">
                  <p className="font-medium text-zinc-900 dark:text-white">Instructions:</p>
                  <ol className="list-decimal pl-4 space-y-1 text-zinc-500 dark:text-zinc-400">
                    <li>Open <strong>Google Authenticator</strong> or <strong>Microsoft Authenticator</strong> on your phone.</li>
                    <li>Tap the <strong>+</strong> button and choose <strong>Scan a QR code</strong>.</li>
                    <li>Scan the QR code below:</li>
                  </ol>
                </div>

                {/* QR Code Container */}
                <div className="flex flex-col items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="Google Authenticator QR Code"
                      className="w-48 h-48 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700 bg-white p-1"
                    />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                    </div>
                  )}

                  {/* Manual Key Fallback */}
                  <div className="mt-3.5 w-full flex items-center justify-between bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[11px]">
                    <span className="font-mono text-zinc-600 dark:text-zinc-300 truncate mr-2 select-all">
                      Key: {secret}
                    </span>
                    <button
                      type="button"
                      onClick={copySecret}
                      className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium hover:underline flex-shrink-0"
                    >
                      {copiedSecret ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      {copiedSecret ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Confirmation Code Input */}
                <div>
                  <label htmlFor="confirmCode" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Enter the 6-digit code shown in your app to activate:
                  </label>
                  <input
                    id="confirmCode"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="000000"
                    value={confirmCode}
                    onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, ""))}
                    className="w-full text-center text-xl font-bold tracking-[0.25em] h-11 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSetupModal(false)}
                    className="flex-1 px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isPending || confirmCode.length !== 6}
                    onClick={handleConfirmSetup}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all"
                  >
                    {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    Confirm & Activate
                  </button>
                </div>
              </div>
            )}

            {/* Modal Body: STEP 2 - BACKUP CODES */}
            {setupStep === "backup" && (
              <div className="p-6 space-y-5">
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs text-amber-800 dark:text-amber-200 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    Important: Save your backup codes!
                  </p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300">
                    If you lose access to your phone or Google Authenticator, you can use these 8 one-time emergency codes to sign in.
                  </p>
                </div>

                {/* Codes Grid */}
                <div className="grid grid-cols-2 gap-2 p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 font-mono text-xs text-center font-bold text-zinc-800 dark:text-zinc-200">
                  {backupCodes.map((code, idx) => (
                    <div key={idx} className="bg-white dark:bg-zinc-900 py-1.5 px-2 rounded border border-zinc-200/80 dark:border-zinc-800">
                      {code}
                    </div>
                  ))}
                </div>

                {/* Copy & Download Actions */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={copyBackupCodes}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                  >
                    {copiedBackup ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedBackup ? "Copied All" : "Copy Codes"}
                  </button>
                  <button
                    type="button"
                    onClick={downloadBackupCodes}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download .txt
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSetupModal(false)}
                  className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all"
                >
                  I Have Saved My Codes - Finish
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: DISABLE 2FA ──────────────────────────────────────────────── */}
      {showDisableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Turn Off 2-Step Verification?</h3>
                <p className="text-[11px] text-zinc-400">Your account will only be protected by password.</p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              To verify that you own this account, enter the active 6-digit code from Google Authenticator to confirm deactivation:
            </p>

            {errorMessage && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                autoFocus
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ""))}
                className="w-full text-center text-xl font-bold tracking-[0.25em] h-11 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowDisableModal(false)}
                className="flex-1 px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending || disableCode.length !== 6}
                onClick={handleConfirmDisable}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Turn Off 2FA
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
