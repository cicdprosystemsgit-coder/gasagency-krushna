"use client";

import { useState, useTransition, useEffect } from "react";
import {
  KeyRound,
  Hash,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  X,
  Eye,
  EyeOff,
  Send,
  Sparkles,
  Smartphone,
  Lock,
} from "lucide-react";
import {
  updateCredentialWithMFA,
  requestSecurityChange,
  updateCredentialWithApprovalToken,
} from "@/app/actions/security-requests";

interface CredentialChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "CHANGE_PASSWORD" | "CHANGE_PIN";
  hasMFA: boolean;
  approvalToken?: string | null;
  onSuccess: () => void;
  onOpenMfaSetup?: () => void;
}

export function CredentialChangeModal({
  isOpen,
  onClose,
  type,
  hasMFA,
  approvalToken,
  onSuccess,
  onOpenMfaSetup,
}: CredentialChangeModalProps) {
  const [totpCode, setTotpCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [userReason, setUserReason] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Reset form whenever modal opens or credentials type changes
  useEffect(() => {
    if (isOpen) {
      setTotpCode("");
      setUseBackupCode(false);
      setNewPassword("");
      setConfirmPassword("");
      setNewPin("");
      setConfirmPin("");
      setUserReason("");
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen, type]);

  if (!isOpen) return null;

  const isPassword = type === "CHANGE_PASSWORD";
  const title = isPassword ? "Change Password" : "Change Security PIN";

  // ── Flow 1: Direct update using active Admin Approval Token ──────────────────
  const handleUpdateWithToken = () => {
    if (!approvalToken) return;
    setError(null);

    if (isPassword) {
      if (!newPassword || newPassword.length < 6) {
        setError("Password must be at least 6 characters long.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    } else {
      if (!newPin || !/^\d{4,6}$/.test(newPin.trim())) {
        setError("PIN must be 4 to 6 numbers only.");
        return;
      }
      if (newPin !== confirmPin) {
        setError("PINs do not match.");
        return;
      }
    }

    startTransition(async () => {
      const res = await updateCredentialWithApprovalToken({
        approvalToken,
        newPassword: isPassword ? newPassword : undefined,
        newPin: !isPassword ? newPin : undefined,
      });

      if (res.error) {
        setError(res.error);
      } else {
        setSuccessMsg(res.message || "Credential updated successfully!");
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1200);
      }
    });
  };

  // ── Flow 2: User has MFA -> Submit credentials & verify TOTP ─────────────────
  const handleMfaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate Password or PIN first
    if (isPassword) {
      if (!newPassword || newPassword.length < 6) {
        setError("New password must be at least 6 characters.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    } else {
      if (!newPin || !/^\d{4,6}$/.test(newPin.trim())) {
        setError("PIN must be 4 to 6 numbers only.");
        return;
      }
      if (newPin !== confirmPin) {
        setError("PINs do not match.");
        return;
      }
    }

    // Validate TOTP / Backup code
    const cleanToken = totpCode.trim().replace(/[\s-]/g, "");
    if (!cleanToken) {
      setError(useBackupCode ? "Please enter your backup code." : "Please enter the 6-digit code from Google Authenticator.");
      return;
    }
    if (!useBackupCode && cleanToken.length !== 6) {
      setError("Authenticator code must be exactly 6 digits.");
      return;
    }

    startTransition(async () => {
      const res = await updateCredentialWithMFA({
        type,
        totpToken: totpCode.trim(),
        newPassword: isPassword ? newPassword : undefined,
        newPin: !isPassword ? newPin : undefined,
      });

      if (res.error) {
        setError(res.error);
      } else {
        setSuccessMsg(res.message || "Updated successfully!");
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1200);
      }
    });
  };

  // ── Flow 3: User does NOT have MFA -> Request Admin Approval ─────────────────
  const handleSendAdminRequest = () => {
    setError(null);
    startTransition(async () => {
      const res = await requestSecurityChange(type, userReason);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccessMsg("Request submitted! Your administrator has been notified to review and approve your request.");
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1800);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              {isPassword ? <KeyRound className="w-4.5 h-4.5" /> : <Hash className="w-4.5 h-4.5" />}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{title}</h3>
              <p className="text-[11px] text-zinc-400">
                {approvalToken
                  ? "Administrator Approved"
                  : hasMFA
                  ? "Google Authenticator MFA Verified"
                  : "MFA Check & Admin Request"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              CASE A: APPROVED BY ADMIN WITH TOKEN
             ══════════════════════════════════════════════════════════════════ */}
          {approvalToken ? (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-xs text-emerald-800 dark:text-emerald-200">
                <p className="font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Administrator Approval Active
                </p>
                <p className="text-[11px] mt-0.5 opacity-90">
                  Your administrator has approved your {isPassword ? "password" : "PIN"} change. Please enter your new credentials below.
                </p>
              </div>

              {isPassword ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      New Password (min 6 characters)
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-10 px-3 pr-10 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-10 px-3 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        New Security PIN (Numbers only)
                      </label>
                      <span className="text-[10px] text-zinc-400">4–6 digits</span>
                    </div>
                    <div className="relative">
                      <input
                        type={showPin ? "text" : "password"}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="••••"
                        className="w-full h-10 px-3 pr-10 text-center font-mono font-bold tracking-[0.25em] text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                      >
                        {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Confirm New PIN
                    </label>
                    <input
                      type={showPin ? "text" : "password"}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="••••"
                      className="w-full h-10 px-3 text-center font-mono font-bold tracking-[0.25em] text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleUpdateWithToken}
                disabled={isPending}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Save New {isPassword ? "Password" : "PIN"}
              </button>
            </div>
          ) : hasMFA ? (
            /* ══════════════════════════════════════════════════════════════════
               CASE B: USER HAS MFA ENABLED (TOTP 2FA) - SEAMLESS ATOMIC FORM
               ══════════════════════════════════════════════════════════════════ */
            <form onSubmit={handleMfaSubmit} className="space-y-4">
              {/* Credentials Fields */}
              {isPassword ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      New Password (min 6 characters)
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        className="w-full h-10 px-3 pr-10 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="w-full h-10 px-3 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        New Security PIN (Numbers only)
                      </label>
                      <span className="text-[10px] text-zinc-400">4–6 digits</span>
                    </div>
                    <div className="relative">
                      <input
                        type={showPin ? "text" : "password"}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="••••"
                        className="w-full h-10 px-3 pr-10 text-center font-mono font-bold tracking-[0.25em] text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        tabIndex={-1}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                      >
                        {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Confirm New PIN
                    </label>
                    <input
                      type={showPin ? "text" : "password"}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="••••"
                      className="w-full h-10 px-3 text-center font-mono font-bold tracking-[0.25em] text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>
              )}

              {/* MFA Code Authorization Input */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                    {useBackupCode ? "Emergency Backup Code" : "Google Authenticator 6-Digit Code"}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setUseBackupCode(!useBackupCode);
                      setTotpCode("");
                      setError(null);
                    }}
                    className="text-[11px] text-blue-600 hover:underline"
                  >
                    {useBackupCode ? "Use Authenticator App" : "Use Backup Code"}
                  </button>
                </div>

                <input
                  type="text"
                  inputMode={useBackupCode ? "text" : "numeric"}
                  maxLength={useBackupCode ? 9 : 6}
                  value={totpCode}
                  onChange={(e) => {
                    const val = useBackupCode ? e.target.value.toUpperCase() : e.target.value.replace(/\D/g, "").slice(0, 6);
                    setTotpCode(val);
                  }}
                  placeholder={useBackupCode ? "XXXX-XXXX" : "000000"}
                  className="w-full h-11 text-center font-mono font-bold text-lg tracking-[0.25em] rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <p className="text-[11px] text-zinc-400 text-center">
                  {useBackupCode
                    ? "Enter one of your 8-character one-time emergency backup codes."
                    : "Open Google Authenticator on your phone and enter the current code."}
                </p>
              </div>

              <button
                type="submit"
                disabled={isPending || (!useBackupCode && totpCode.trim().length !== 6)}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Authorize &amp; Update {isPassword ? "Password" : "PIN"}
              </button>
            </form>
          ) : (
            /* ══════════════════════════════════════════════════════════════════
               CASE C: MFA IS NOT ENABLED
               ══════════════════════════════════════════════════════════════════ */
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
                <p className="font-semibold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  Two-Factor Authentication is Not Enabled
                </p>
                <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
                  To protect your account against unauthorized changes, changing your password or PIN requires either <strong>enabling Google Authenticator (MFA)</strong> or <strong>submitting an approval request to your Administrator</strong>.
                </p>
              </div>

              {/* Option 1: Enable 2FA Now */}
              <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-900 dark:text-white">Option 1: Enable MFA (Recommended)</p>
                    <p className="text-[11px] text-zinc-500">Scan QR code now and self-verify instantly without waiting for admin.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenMfaSetup?.();
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex-shrink-0 transition-colors shadow-xs"
                >
                  Enable 2FA
                </button>
              </div>

              {/* Divider */}
              <div className="relative my-2 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
                </div>
                <span className="relative bg-white dark:bg-zinc-900 px-3 text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
                  OR
                </span>
              </div>

              {/* Option 2: Request Admin Approval */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Option 2: Send Request to Administrator
                  </label>
                  <textarea
                    rows={2}
                    value={userReason}
                    onChange={(e) => setUserReason(e.target.value)}
                    placeholder="Optional: Enter a brief reason for requesting this credential change (e.g., Forgot current password/PIN)"
                    className="w-full p-2.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSendAdminRequest}
                  disabled={isPending}
                  className="w-full py-2.5 px-4 text-xs font-semibold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Submit Request to Admin
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
