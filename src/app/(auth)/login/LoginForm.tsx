"use client";

import { useActionState } from "react";
import { loginAction, verify2FALogin } from "@/app/actions/auth";
import { Flame, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
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
  const [twoFAState, twoFAActionFn, twoFAPending] = useActionState(verify2FALogin, {});
  const [showPwd, setShowPwd] = useState(false);
  const [useBackup, setUseBackup] = useState(false);
  const t = useTranslations("login");
  const tRoles = useTranslations("roles");

  const requires2FA = loginState.requires2FA;

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
            {/* ── Step 1: Email + Password ── */}
            {!requires2FA && (
              <>
                <div className="mb-7">
                  <h1 className="text-[20px] font-bold tracking-tight text-zinc-900">{t("title")}</h1>
                  <p className="text-[13px] text-zinc-500 mt-1">
                    {t("desc")}
                  </p>
                </div>

                {loginState.error && (
                  <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg mb-5 text-[13px]"
                    style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#B91C1C" }}>
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {loginState.error}
                  </div>
                )}

                <form action={loginActionFn} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-[12px] font-medium text-zinc-700 mb-1.5">
                      {t("emailLabel")}
                    </label>
                    <input id="email" name="email" type="email" required autoComplete="email"
                      placeholder="you@agency.com" className="input" style={{ fontSize: "14px", height: "38px" }} />
                  </div>
                  <div>
                    <label htmlFor="password" className="block text-[12px] font-medium text-zinc-700 mb-1.5">
                      {t("passwordLabel")}
                    </label>
                    <div className="relative">
                      <input id="password" name="password" type={showPwd ? "text" : "password"} required
                        autoComplete="current-password" placeholder="••••••••" className="input pr-10"
                        style={{ fontSize: "14px", height: "38px" }} />
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
                    style={{ height: "38px", fontSize: "14px", backgroundColor: themeColor }}
                  >
                    {loginPending ? <><Loader2 className="w-4 h-4 animate-spin" />{t("signingIn")}</> : t("signInBtn")}
                  </button>
                </form>
              </>
            )}

            {/* ── Step 2: TOTP / Backup Code ── */}
            {requires2FA && (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${themeColor}15` }}
                  >
                    <ShieldCheck className="w-5 h-5" style={{ color: themeColor }} />
                  </div>
                  <div>
                    <h1 className="text-[18px] font-bold tracking-tight text-zinc-900">{t("twoFATitle")}</h1>
                    <p className="text-[13px] text-zinc-500 mt-0.5">
                      {useBackup ? t("twoFADescBackup") : t("twoFADescToken")}
                    </p>
                  </div>
                </div>

                {twoFAState.error && (
                  <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg mb-5 text-[13px]"
                    style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#B91C1C" }}>
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {twoFAState.error}
                  </div>
                )}

                <form action={twoFAActionFn} className="space-y-4">
                  <input type="hidden" name="useBackup" value={useBackup ? "true" : "false"} />
                  <div>
                    <label htmlFor="token" className="block text-[12px] font-medium text-zinc-700 mb-1.5">
                      {useBackup ? t("tokenLabelBackup") : t("tokenLabelSixDigit")}
                    </label>
                    <input id="token" name="token" type="text" required autoFocus autoComplete="one-time-code"
                      placeholder={useBackup ? "XXXX-XXXX" : "000000"}
                      maxLength={useBackup ? 9 : 6}
                      className="input text-center tracking-widest"
                      style={{ fontSize: "20px", height: "48px", letterSpacing: "0.15em" }} />
                  </div>
                  <button
                    type="submit"
                    disabled={twoFAPending}
                    className="btn w-full justify-center text-white hover:brightness-95 transition-all font-medium rounded-lg flex items-center gap-2"
                    style={{ height: "38px", fontSize: "14px", backgroundColor: themeColor }}
                  >
                    {twoFAPending ? <><Loader2 className="w-4 h-4 animate-spin" />{t("verifying")}</> : t("verifyBtn")}
                  </button>
                </form>

                <div className="mt-4 text-center">
                  <button onClick={() => setUseBackup(!useBackup)}
                    className="text-[12px] text-zinc-500 hover:text-zinc-800 transition-colors underline-offset-2 hover:underline">
                    {useBackup ? t("useAppLink") : t("useBackupLink")}
                  </button>
                </div>
              </>
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
        </div>
      </div>
    </div>
  );
}
