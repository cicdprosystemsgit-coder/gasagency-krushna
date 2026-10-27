"use client";

import { TwoFactorToggle } from "@/components/auth/TwoFactorToggle";
import { PinSettingsCard } from "@/components/auth/PinSettingsCard";
import { ShieldCheck, Smartphone, CheckCircle2, Lock } from "lucide-react";

interface TwoFactorSecurityViewProps {
  roleName?: string;
  userName?: string;
}

export function TwoFactorSecurityView({ roleName, userName }: TwoFactorSecurityViewProps) {
  return (
    <div className="max-w-3xl space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3.5 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">
            Two-Step Verification (MFA)
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Add an extra layer of security to your account using Google Authenticator or Microsoft Authenticator.
          </p>
        </div>
      </div>

      {/* Main Interactive Toggle Card */}
      <TwoFactorToggle variant="card" />

      {/* Security Login PIN Card */}
      <PinSettingsCard />

      {/* Security Benefits & App Guide */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Why use it */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3 shadow-xs">
          <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Why Enable 2-Step Verification?
          </h3>
          <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-2">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Even if someone discovers your password, they cannot access your account without the 6-digit code.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Zero SMS or carrier dependency. Codes are generated instantly offline on your phone.</span>
            </li>
          </ul>
        </div>

        {/* Apps to use */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3 shadow-xs">
          <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            Recommended Authenticator Apps
          </h3>
          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60">
              <p className="font-semibold text-zinc-800 dark:text-zinc-200">Google Authenticator</p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Free on Google Play Store &amp; Apple App Store.</p>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60">
              <p className="font-semibold text-zinc-800 dark:text-zinc-200">Microsoft Authenticator</p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Supports encrypted cloud backup across devices.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
