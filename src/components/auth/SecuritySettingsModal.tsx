"use client";

import { useState } from "react";
import { ShieldCheck, Shield } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { TwoFactorToggle } from "@/components/auth/TwoFactorToggle";

interface SecuritySettingsModalProps {
  userName?: string;
  role?: string;
}

export function SecuritySettingsModal({ userName, role }: SecuritySettingsModalProps) {
  const [open, setOpen] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState<boolean | null>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Account Security & 2-Step Verification"
        className="relative flex items-center justify-center w-8 h-8 rounded-md transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
        aria-label="Security Settings"
      >
        {is2FAEnabled ? (
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <Shield className="w-4 h-4" />
        )}
        {is2FAEnabled && (
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900" />
        )}
      </button>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Account Security & Two-Factor Authentication"
        subtitle={userName ? `Manage 2-step verification settings for ${userName}` : "Manage your 2-step verification settings"}
        size="md"
      >
        <div className="py-2">
          <TwoFactorToggle
            variant="card"
            onStatusChange={(enabled) => setIs2FAEnabled(enabled)}
          />
        </div>
      </Modal>
    </>
  );
}
