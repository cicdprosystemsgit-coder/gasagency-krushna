"use client";

import { useActionState } from "react";
import { loginAction, loginWithPinAction, verify2FALogin, cancel2FALoginAction } from "@/app/actions/auth";
import {
  Flame,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  ArrowLeft,
  AlertCircle,
  Smartphone,
  KeyRound,
  Hash,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
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
    <div className="min-h-screen flex flex-col lg:flex-row bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* ── Left Showcase Panel (Desktop) ─────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[440px] shrink-0 p-10 bg-zinc-950 text-white border-r border-zinc-800 relative overflow-hidden">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:2.5rem_2.5rem] opacity-35 pointer-events-none" />

        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            {logoBase64 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoBase64}
                alt={agencyName ?? "GasAgency"}
                className="h-8 w-auto object-contain"
              />
            ) : (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform"
                style={{ backgroundColor: themeColor }}
              >
                <Flame className="w-4.5 h-4.5 text-white" />
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-white">
                {agencyName ?? "GasAgency"}
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-800 rounded">
                PRO
              </span>
            </div>
          </Link>
        </div>

        {/* Center narrative */}
        <div className="relative z-10 my-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Multi-Tenant Enterprise Portal</span>
          </div>

          <h2 className="text-2xl font-black tracking-tight leading-snug">
            {t("featureTitle")}
          </h2>

          <ul className="space-y-3.5 text-xs text-zinc-300">
            {[
              { text: t("feature1") || "Real-time cylinder stock & vehicle gate registry" },
              { text: t("feature2") || "Driver run sheets with doorstep consumer OTP" },
              { text: t("feature3") || "Currency denomination counter for cash drawers" },
              { text: t("feature4") || "4-Tier zero-trust approval gatekeeper" },
            ].map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{item.text}</span>
              </li>
            ))}
          </ul>

          <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 text-[11px] text-zinc-400 font-mono space-y-1">
            <p className="text-zinc-200 font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              Security Protocol Active
            </p>
            <p>Role-based access control, SHA-256 session tokens, and encrypted daily closing logs.</p>
          </div>
        </div>

        <div className="relative z-10 pt-6 border-t border-zinc-900 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
          <span>© 2026 {agencyName ?? "GasAgency Pro"}</span>
          <Link href="/" className="hover:text-zinc-300 transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Back to Home
          </Link>
        </div>
      </div>

      {/* ── Right Form Container ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 relative overflow-y-auto">
        {/* Top bar with Navigation and Language Switcher */}
        <div className="flex items-center justify-between w-full max-w-md mx-auto mb-6">
          <Link
            href="/"
            className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 flex items-center gap-1 font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to website
          </Link>
          <LanguageSwitcher />
        </div>

        {/* Center Card */}
        <div className="w-full max-w-md mx-auto my-auto">
          {/* Mobile Logo */}
          <Link href="/" className="flex lg:hidden items-center gap-2 mb-6">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: themeColor }}
            >
              <Flame className="w-4.5 h-4.5" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-zinc-950 dark:text-white">
              {agencyName ?? "GasAgency Pro"}
            </span>
          </Link>

          <div className="p-6 sm:p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-xl shadow-zinc-200/50 dark:shadow-black/50 backdrop-blur-xs">
            {/* ── Step 1: Standard Password or Quick PIN Login ── */}
            {!requires2FA && (
              <>
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900">
                      Agency Portal
                    </span>
                  </div>
                  <h1 className="text-2xl font-black tracking-tight text-zinc-950 dark:text-white">
                    {t("title")}
                  </h1>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    {loginMethod === "password"
                      ? t("desc")
                      : "Quick login for drivers, godown keepers & office staff."}
                  </p>
                </div>

                {/* Login Method Segmented Switcher */}
                <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl mb-5 text-xs font-semibold border border-zinc-200 dark:border-zinc-700/60">
                  <button
                    type="button"
                    onClick={() => setLoginMethod("password")}
                    className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      loginMethod === "password"
                        ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs border border-zinc-200/60 dark:border-zinc-700"
                        : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                    }`}
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Password Login</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginMethod("pin")}
                    className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      loginMethod === "pin"
                        ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs border border-zinc-200/60 dark:border-zinc-700"
                        : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                    }`}
                  >
                    <Hash className="w-3.5 h-3.5" />
                    <span>Fast PIN Login</span>
                  </button>
                </div>

                {activeError && (
                  <div className="flex items-start gap-2.5 p-3.5 rounded-xl mb-5 text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                    <span className="font-medium leading-relaxed">{activeError}</span>
                  </div>
                )}

                {/* ── Method A: Email + Password ── */}
                {loginMethod === "password" ? (
                  <form key="form-password-login" action={loginActionFn} className="space-y-4">
                    <div>
                      <label htmlFor="email" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
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
                        className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      />
                    </div>
                    <div>
                      <label htmlFor="password" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
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
                          className="w-full pl-3.5 pr-10 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPwd(!showPwd)}
                          tabIndex={-1}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                        >
                          {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loginPending}
                      className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all mt-2"
                      style={{ backgroundColor: themeColor }}
                    >
                      {loginPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{t("signingIn")}</span>
                        </>
                      ) : (
                        <span>{t("signInBtn")}</span>
                      )}
                    </button>
                  </form>
                ) : (
                  /* ── Method B: Identifier + PIN ── */
                  <form key="form-pin-login" action={pinActionFn} className="space-y-4 animate-in fade-in-50 duration-150">
                    <div>
                      <label htmlFor="identifier" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                        Mobile Number or Email
                      </label>
                      <input
                        key="input-pin-identifier"
                        id="identifier"
                        name="identifier"
                        type="text"
                        required
                        autoComplete="username"
                        placeholder="9876543210 or staff@agency.com"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label htmlFor="pin" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          Security PIN (Numbers only)
                        </label>
                        <span className="text-[10px] text-zinc-400 font-mono">4–6 digits</span>
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
                          className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-mono text-center tracking-[0.35em] font-bold text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPin(!showPin)}
                          tabIndex={-1}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                        >
                          {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={pinPending || pinValue.length < 4}
                      className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all mt-2"
                      style={{ backgroundColor: themeColor }}
                    >
                      {pinPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Verifying PIN...</span>
                        </>
                      ) : (
                        <span>Sign In with PIN</span>
                      )}
                    </button>
                  </form>
                )}

                {/* Sign-Up Agency Trial CTA Link */}
                <div className="mt-6 pt-5 border-t border-zinc-200 dark:border-zinc-800 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                    <span>New gas distribution agency?</span>
                    <Link
                      href="/signup"
                      className="font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
                    >
                      Start 14-Day Free Trial <ArrowRight className="w-3 h-3 ml-0.5" />
                    </Link>
                  </div>
                </div>
              </>
            )}

            {/* ── Step 2: Dedicated MFA (2FA) Verification Screen ── */}
            {requires2FA && (
              <div className="space-y-5 animate-in fade-in-50 duration-200">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 shadow-sm">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white">
                      Two-Step Verification
                    </h1>
                    {targetEmail ? (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mt-1 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Signing in as {targetEmail}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Additional security verification required
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {useBackup ? (
                    <div className="flex items-start gap-2">
                      <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <span>Enter one of your 8-character emergency backup codes (e.g. <code>ABCD-1234</code>).</span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <Smartphone className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                      <span>Open <strong>Google Authenticator</strong> or <strong>Microsoft Authenticator</strong> and enter the 6-digit code.</span>
                    </div>
                  )}
                </div>

                {twoFAState.error && (
                  <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs space-y-1">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                      <span className="font-semibold">{twoFAState.error}</span>
                    </div>
                    {!useBackup && (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 pl-6">
                        Hint: Ensure your phone&apos;s Date &amp; Time settings are set to &quot;Automatic&quot; (network-provided).
                      </p>
                    )}
                  </div>
                )}

                <form key="form-twofa-verification" action={twoFAActionFn} className="space-y-4">
                  <input key="input-twofa-backup-hidden" type="hidden" name="useBackup" value={useBackup ? "true" : "false"} />
                  <div>
                    <label htmlFor="token" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
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
                      className="w-full py-3 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-center font-mono font-bold tracking-[0.3em] text-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={twoFAPending || isCancelling2FA}
                    className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all"
                    style={{ backgroundColor: themeColor }}
                  >
                    {twoFAPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying Code...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Verify &amp; Enter Dashboard</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-2.5 text-center">
                  <button
                    type="button"
                    onClick={() => setUseBackup(!useBackup)}
                    className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors inline-flex items-center gap-1.5"
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
                      className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors inline-flex items-center gap-1"
                    >
                      {isCancelling2FA ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowLeft className="w-3 h-3" />}
                      Cancel and sign in as another user
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Role pills — only shown on step 1 */}
          {!requires2FA && (
            <div className="mt-5 rounded-xl p-4 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800">
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
                Supported Agency Roles
              </p>
              <div className="flex flex-wrap gap-1.5">
                {["ADMIN", "MANAGER", "GODOWN_KEEPER", "CASHIER", "STAFF", "DELIVERY_BOY"].map((role) => (
                  <span
                    key={role}
                    className="font-mono text-[10px] font-medium px-2 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300/60 dark:border-zinc-700/60"
                  >
                    {tRoles.has(role) ? tRoles(role) : role}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
            © {new Date().getFullYear()} All Copyright and Rights Reserved by{" "}
            <a
              href="https://www.cicdtech.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              CICD Tech
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
