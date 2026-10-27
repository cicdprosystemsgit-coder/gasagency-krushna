"use client";

import { useActionState } from "react";
import { loginAction, loginWithPinAction, verify2FALogin, cancel2FALoginAction } from "@/app/actions/auth";
import { Flame, Eye, EyeOff, Loader2, ShieldCheck, ArrowLeft, AlertCircle, Smartphone, KeyRound, Lock, Hash } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

interface LoginFormProps {
  agencyName?: string | null;
  logoBase64?: string | null;
  themeColor?: string;
}

export function LoginForm({
  agencyName,
  logoBase64,
  themeColor = "#2563eb",
}: LoginFormProps) {
  const [loginState, loginActionFn, loginPending] = useActionState(loginAction, {});
  const [pinState, pinActionFn, pinPending] = useActionState(loginWithPinAction, {});
  const [twoFAState, twoFAActionFn, twoFAPending] = useActionState(verify2FALogin, {});

  const [loginMethod, setLoginMethod] = useState<"password" | "pin">("password");
  const [showPwd, setShowPwd] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [pinValue, setPinValue] = useState("");
  const [useBackup, setUseBackup] = useState(false);
  const [isCancelling2FA, startCancelTransition] = useTransition();
  const [cancelled2FA, setCancelled2FA] = useState(false);
  const t = useTranslations("login");
  const tRoles = useTranslations("roles");

  const requires2FA = (loginState.requires2FA || pinState.requires2FA || Boolean(twoFAState.error && twoFAState.email)) && !cancelled2FA;
  const targetEmail = twoFAState.email || loginState.email || pinState.email || "";

  const activeError = loginMethod === "password" ? loginState.error : pinState.error;

  const handleCancel2FA = () => {
    startCancelTransition(async () => {
      await cancel2FALoginAction();
      setCancelled2FA(true);
      window.location.reload();
    });
  };

  return (
    <div className="min-h-screen flex" style={{ background: "#FFFFFF" }}>
      {/* ── Left Panel (Desktop only) ─────────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 p-10"
        style={{ background: "#F8FAFC", borderRight: "1px solid #E2E8F0" }}
      >
        <div>
          <Link href="/" className="flex items-center gap-2.5">
            {logoBase64 ? (
              <img
                src={logoBase64}
                alt={agencyName ?? "GasAgency"}
                className="h-8 w-auto object-contain"
              />
            ) : (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
                style={{ backgroundColor: themeColor }}
              >
                <Flame className="w-4.5 h-4.5 text-white" />
              </div>
            )}
            <span className="text-[15px] font-semibold text-zinc-900">
              {agencyName ?? "GasAgency"}
            </span>
          </Link>
        </div>
        <div>
          <h2 className="text-[22px] font-bold text-zinc-900 leading-snug mb-4">
            {t("featureTitle")}
          </h2>
          <ul className="space-y-3">
            {[
              t("feature1"),
              t("feature2"),
              t("feature3"),
              t("feature4"),
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5">
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: themeColor }}
                >
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-[13px] text-zinc-600">{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[12px] text-zinc-400">© 2026 {agencyName ?? "GasAgency"}</p>
      </div>

      {/* ── Right Panel ────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white relative">
        {/* Floating Language Switcher in the top right of the login screen */}
        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>

        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <Link href="/" className="flex lg:hidden items-center gap-2 mb-8">
            {logoBase64 ? (
              <img
                src={logoBase64}
                alt={agencyName ?? "GasAgency"}
                className="h-7 w-auto object-contain"
              />
            ) : (
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: themeColor }}
              >
                <Flame className="w-4.5 h-4.5 text-white" />
              </div>
            )}
            <span className="text-[15px] font-semibold text-zinc-900">
              {agencyName ?? "GasAgency"}
            </span>
          </Link>

          <div
            className="rounded-xl p-8"
            style={{
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              boxShadow: "0 4px 6px -1px rgba(15,23,42,0.05), 0 2px 4px -2px rgba(15,23,42,0.04)",
            }}
          >
            {/* ── Step 1: Password or PIN Login ── */}
            {!requires2FA && (
              <>
                <div className="mb-6">
                  <h1 className="text-[20px] font-bold tracking-tight text-zinc-900">{t("title")}</h1>
                  <p className="text-[13px] text-zinc-500 mt-1">
                    {loginMethod === "password" ? t("desc") : "Enter your mobile number or email and secret PIN."}
                  </p>
                </div>

                {/* Login Method Tabs */}
                <div className="flex p-1 bg-zinc-100 rounded-lg mb-5 text-[12px] font-semibold border border-zinc-200/80">
                  <button
                    type="button"
                    onClick={() => setLoginMethod("password")}
                    className={`flex-1 py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                      loginMethod === "password"
                        ? "bg-white text-zinc-900 shadow-xs border border-zinc-200/60"
                        : "text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    Password Login
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginMethod("pin")}
                    className={`flex-1 py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                      loginMethod === "pin"
                        ? "bg-white text-zinc-900 shadow-xs border border-zinc-200/60"
                        : "text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    <Hash className="w-3.5 h-3.5" />
                    PIN Login
                  </button>
                </div>

                {activeError && (
                  <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg mb-5 text-[13px]"
                    style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#B91C1C" }}>
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{activeError}</span>
                  </div>
                )}

                {/* ── Method A: Email + Password ── */}
                {loginMethod === "password" ? (
                  <form key="form-password-login" action={loginActionFn} className="space-y-4">
                    <div>
                      <label htmlFor="email" className="block text-[12px] font-medium text-zinc-700 mb-1.5">
                        {t("emailLabel")}
                      </label>
                      <input
                        key="input-password-email"
                        id="email"
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="you@agency.com"
                        className="input"
                        style={{ fontSize: "14px", height: "38px" }}
                      />
                    </div>
                    <div>
                      <label htmlFor="password" className="block text-[12px] font-medium text-zinc-700 mb-1.5">
                        {t("passwordLabel")}
                      </label>
                      <div className="relative">
                        <input
                          key="input-password-secret"
                          id="password"
                          name="password"
                          type={showPwd ? "text" : "password"}
                          required
                          autoComplete="current-password"
                          placeholder="••••••••"
                          className="input pr-10"
                          style={{ fontSize: "14px", height: "38px" }}
                        />
                        <button type="button" onClick={() => setShowPwd(!showPwd)} tabIndex={-1}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors">
                          {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loginPending}
                      className="btn w-full justify-center mt-2 text-white hover:brightness-95 transition-all font-medium rounded-lg flex items-center gap-2"
                      style={{ height: "40px", fontSize: "14px", backgroundColor: themeColor }}
                    >
                      {loginPending ? <><Loader2 className="w-4 h-4 animate-spin" />{t("signingIn")}</> : t("signInBtn")}
                    </button>
                  </form>
                ) : (
                  /* ── Method B: Identifier + PIN (Numbers Only) ── */
                  <form key="form-pin-login" action={pinActionFn} className="space-y-4 animate-in fade-in-50 duration-150">
                    <div>
                      <label htmlFor="identifier" className="block text-[12px] font-medium text-zinc-700 mb-1.5">
                        Mobile Number or Email
                      </label>
                      <input
                        key="input-pin-identifier"
                        id="identifier"
                        name="identifier"
                        type="text"
                        required
                        autoComplete="username"
                        placeholder="9876543210 or you@agency.com"
                        className="input"
                        style={{ fontSize: "14px", height: "38px" }}
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label htmlFor="pin" className="block text-[12px] font-medium text-zinc-700">
                          Security PIN (Numbers only)
                        </label>
                        <span className="text-[11px] text-zinc-400 font-medium">4–6 digits</span>
                      </div>
                      <div className="relative">
                        <input
                          key="input-pin-val"
                          id="pin"
                          name="pin"
                          type={showPin ? "text" : "password"}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          required
                          value={pinValue}
                          onChange={(e) => setPinValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="••••"
                          className="input font-mono text-center tracking-[0.3em] font-bold text-lg pr-10"
                          style={{ height: "42px" }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPin(!showPin)}
                          tabIndex={-1}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                        >
                          {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={pinPending || pinValue.length < 4}
                      className="btn w-full justify-center mt-2 text-white hover:brightness-95 transition-all font-medium rounded-lg flex items-center gap-2"
                      style={{ height: "40px", fontSize: "14px", backgroundColor: themeColor }}
                    >
                      {pinPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Verifying PIN...
                        </>
                      ) : (
                        "Sign In with PIN"
                      )}
                    </button>
                  </form>
                )}
              </>
            )}

            {/* ── Step 2: Dedicated MFA Verification Screen ── */}
            {requires2FA && (
              <div className="space-y-5 animate-in fade-in-50 duration-200">
                {/* Header */}
                <div className="text-center space-y-2">
                  <div
                    className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center shadow-sm"
                    style={{ backgroundColor: `${themeColor}15`, border: `1px solid ${themeColor}30` }}
                  >
                    <ShieldCheck className="w-6 h-6" style={{ color: themeColor }} />
                  </div>
                  <div>
                    <h1 className="text-[20px] font-bold tracking-tight text-zinc-900">
                      Two-Step Verification
                    </h1>
                    {targetEmail ? (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mt-1 rounded-full bg-zinc-100 border border-zinc-200 text-[11px] font-medium text-zinc-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Signing in as {targetEmail}
                      </div>
                    ) : (
                      <p className="text-[12px] text-zinc-500 mt-0.5">
                        Additional security verification required
                      </p>
                    )}
                  </div>
                </div>

                {/* Instructions */}
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/80 text-[12px] text-zinc-600 leading-relaxed">
                  {useBackup ? (
                    <div className="flex items-start gap-2">
                      <KeyRound className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <span>Enter one of your 8-character emergency backup codes (e.g. <code>ABCD-1234</code>).</span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <Smartphone className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span>Open <strong>Google Authenticator</strong> or <strong>Microsoft Authenticator</strong> on your phone and enter the current 6-digit code.</span>
                    </div>
                  )}
                </div>

                {/* Informative Error Card */}
                {twoFAState.error && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-[12px] space-y-1">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span className="font-semibold">{twoFAState.error}</span>
                    </div>
                    {!useBackup && (
                      <p className="text-[11px] text-red-600 pl-6">
                        Hint: If your code fails, make sure your phone&apos;s Date &amp; Time settings are set to &quot;Automatic&quot; (network-provided).
                      </p>
                    )}
                  </div>
                )}

                {/* Verification Form */}
                <form key="form-twofa-verification" action={twoFAActionFn} className="space-y-4">
                  <input key="input-twofa-backup-hidden" type="hidden" name="useBackup" value={useBackup ? "true" : "false"} />
                  <div>
                    <label htmlFor="token" className="block text-[12px] font-medium text-zinc-700 mb-1.5">
                      {useBackup ? "Emergency Backup Code" : "6-Digit Authenticator Code"}
                    </label>
                    <input
                      key={`input-twofa-token-${useBackup ? "backup" : "otp"}`}
                      id="token"
                      name="token"
                      type="text"
                      required
                      autoFocus
                      autoComplete="one-time-code"
                      inputMode={useBackup ? "text" : "numeric"}
                      placeholder={useBackup ? "XXXX-XXXX" : "000000"}
                      maxLength={useBackup ? 9 : 6}
                      className="input text-center font-mono font-bold tracking-[0.25em]"
                      style={{ fontSize: "22px", height: "50px", letterSpacing: "0.2em" }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={twoFAPending || isCancelling2FA}
                    className="btn w-full justify-center text-white hover:brightness-95 transition-all font-semibold rounded-lg flex items-center gap-2 shadow-sm"
                    style={{ height: "42px", fontSize: "14px", backgroundColor: themeColor }}
                  >
                    {twoFAPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verifying Code...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        Verify &amp; Enter Dashboard
                      </>
                    )}
                  </button>
                </form>

                {/* Switcher & Cancel Controls */}
                <div className="pt-2 border-t border-zinc-100 space-y-2.5 text-center">
                  <button
                    type="button"
                    onClick={() => setUseBackup(!useBackup)}
                    className="text-[12px] text-zinc-600 hover:text-zinc-900 transition-colors underline-offset-2 hover:underline inline-flex items-center gap-1.5"
                  >
                    {useBackup ? (
                      <>
                        <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                        Switch to Google Authenticator Code
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                        Lost access to your phone? Use a backup code
                      </>
                    )}
                  </button>

                  <div>
                    <button
                      type="button"
                      onClick={handleCancel2FA}
                      disabled={isCancelling2FA}
                      className="text-[12px] text-zinc-400 hover:text-zinc-600 transition-colors inline-flex items-center gap-1"
                    >
                      {isCancelling2FA ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowLeft className="w-3 h-3" />}
                      Cancel and sign in as another user
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Role hint — only show on step 1 */}
          {!requires2FA && (
            <div className="mt-5 rounded-lg p-4" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2.5">{t("availableRoles")}</p>
              <div className="flex flex-wrap gap-1.5">
                {["ADMIN", "MANAGER", "GODOWN_KEEPER", "CASHIER", "STAFF", "DELIVERY_BOY"].map((role) => (
                  <span key={role} className="text-[11px] font-medium px-2.5 py-1 rounded-md"
                    style={{ background: "#E2E8F0", color: "#475569" }}>
                    {tRoles.has(role) ? tRoles(role) : role}
                  </span>
                ))}
              </div>
            </div>
          )}

          <p className="text-center mt-5 text-[12px] text-zinc-400">
            <Link href="/" className="hover:text-zinc-700 transition-colors">{t("backToHome")}</Link>
          </p>

          <div className="mt-8 pt-4 border-t border-zinc-200/80 dark:border-zinc-800/80 text-center text-[12px] text-zinc-400 dark:text-zinc-500">
            <p>
              © {new Date().getFullYear()} All Copyright and Rights Reserved by{" "}
              <a
                href="https://www.cicdtech.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-600 dark:text-blue-400 hover:underline transition-colors"
              >
                CICD Tech
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
