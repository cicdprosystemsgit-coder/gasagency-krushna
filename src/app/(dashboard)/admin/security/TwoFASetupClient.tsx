"use client";

import { TwoFactorToggle } from "@/components/auth/TwoFactorToggle";
import { Smartphone, CheckCircle2, ShieldCheck, Download } from "lucide-react";

export function TwoFASetupClient() {
  return (
    <div className="max-w-2xl space-y-6">
      {/* Interactive Trigger Card */}
      <TwoFactorToggle variant="card" />

      {/* Helpful Guide Card */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 p-5 space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
          <Smartphone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          Supported Authenticator Apps
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <p className="font-semibold text-zinc-800 dark:text-zinc-200">Google Authenticator</p>
            <p className="text-zinc-400 text-[11px] mt-0.5">Recommended for Android & iOS. Fast offline code generation.</p>
          </div>
          <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <p className="font-semibold text-zinc-800 dark:text-zinc-200">Microsoft Authenticator</p>
            <p className="text-zinc-400 text-[11px] mt-0.5">Compatible with cloud backup and cross-device sync.</p>
          </div>
        </div>

        <div className="pt-2 border-t border-zinc-200/80 dark:border-zinc-800/80 text-[11px] text-zinc-500 dark:text-zinc-400 space-y-1.5">
          <p className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            Works 100% offline without cellular network or internet on your phone.
          </p>
          <p className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            Rotating codes change every 30 seconds for maximum security against unauthorized access.
          </p>
        </div>
      </div>
    </div>
  );
}
