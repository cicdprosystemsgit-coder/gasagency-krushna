"use client";

import { useState, useTransition, useEffect } from "react";
import { Hash, CheckCircle2, AlertCircle, Key, Loader2, Eye, EyeOff, Check, X } from "lucide-react";
import { get2FAStatus, setUserLoginPin } from "@/app/actions/twofa";

export function PinSettingsCard() {
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    get2FAStatus().then((res) => {
      setHasPin(res.hasPin ?? false);
    });
  }, []);

  const handleSavePin = () => {
    setError(null);
    setSuccess(null);

    if (!pin || !/^\d{4,6}$/.test(pin)) {
      setError("PIN must be 4 to 6 numbers only.");
      return;
    }
    if (pin !== confirmPin) {
      setError("PINs do not match. Please re-enter.");
      return;
    }

    startTransition(async () => {
      const res = await setUserLoginPin(pin);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(res.message ?? "PIN saved successfully!");
        setHasPin(true);
        setTimeout(() => {
          setIsModalOpen(false);
          setPin("");
          setConfirmPin("");
          setSuccess(null);
        }, 1500);
      }
    });
  };

  return (
    <>
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm transition-all">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                hasPin
                  ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
              }`}
            >
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                  Security Login PIN
                </h3>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    hasPin
                      ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                      : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                  }`}
                >
                  {hasPin ? "Configured" : "Not Set"}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-md">
                Allows you to sign in quickly from the login page using your phone number or email and a 4–6 digit numeric PIN.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setError(null);
              setSuccess(null);
              setPin("");
              setConfirmPin("");
              setIsModalOpen(true);
            }}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors flex-shrink-0"
          >
            {hasPin ? "Change PIN" : "Set Up PIN"}
          </button>
        </div>
      </div>

      {/* PIN Setup Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Hash className="w-4.5 h-4.5" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                  {hasPin ? "Change Security PIN" : "Set Up Security PIN"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Choose a 4 to 6 digit numeric code. Only numbers are allowed.
            </p>

            {error && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs">
                <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  New PIN (Numbers only, 4–6 digits)
                </label>
                <div className="relative">
                  <input
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="••••"
                    className="w-full text-center text-lg font-mono tracking-[0.25em] font-bold h-10 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white pr-9 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300 mb-1">
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
                  className="w-full text-center text-lg font-mono tracking-[0.25em] font-bold h-10 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending || pin.length < 4 || confirmPin.length < 4}
                onClick={handleSavePin}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Save PIN
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
