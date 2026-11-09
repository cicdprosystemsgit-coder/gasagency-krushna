"use client";

import { useActionState, useState } from "react";
import { signupAgencyAction, SignupState } from "@/app/actions/signup";
import {
  Building2,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  MapPin,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const initial: SignupState = {};

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupAgencyAction, initial);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");
  const router = useRouter();

  // Password rules validation
  const hasMinLength = passwordValue.length >= 8;
  const hasUppercase = /[A-Z]/.test(passwordValue);
  const hasNumber = /[0-9]/.test(passwordValue);
  const hasSpecial = /[^A-Za-z0-9]/.test(passwordValue);

  if (state.success) {
    return (
      <div className="text-center py-12 px-6 max-w-md mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/10">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div>
          <span className="font-mono text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
            Agency Initialized
          </span>
          <h2 className="text-2xl font-black tracking-tight text-zinc-950 dark:text-white mt-3 mb-2">
            Welcome to GasAgency Pro!
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Your agency account has been created with a <strong>14-day full access professional trial</strong>. All 25 operational modules are ready.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-left text-xs space-y-2">
          <div className="flex items-center justify-between text-zinc-700 dark:text-zinc-300">
            <span className="text-zinc-500">Plan Status</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">14-Day Free Trial</span>
          </div>
          <div className="flex items-center justify-between text-zinc-700 dark:text-zinc-300">
            <span className="text-zinc-500">Admin Role</span>
            <span className="font-mono font-semibold">ADMIN (Full Access)</span>
          </div>
          <div className="flex items-center justify-between text-zinc-700 dark:text-zinc-300">
            <span className="text-zinc-500">Reconciliation Gatekeeper</span>
            <span className="font-mono text-blue-600 dark:text-blue-400">4-Tier Verified</span>
          </div>
        </div>

        <button
          onClick={() => router.push("/admin")}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.01]"
        >
          <span>Launch Agency Dashboard</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      {/* Reassurance pill */}
      <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300">
          <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
          <span><strong>14-Day Free Trial</strong> • No Credit Card Required</span>
        </div>
        <span className="font-mono text-[10px] text-blue-700 dark:text-blue-400 font-bold hidden sm:inline">
          Instant Setup
        </span>
      </div>

      {state.error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
          <span className="text-rose-500 font-bold shrink-0 mt-0.5">✕</span>
          <span className="font-medium">{state.error}</span>
        </div>
      )}

      {/* SECTION 1: AGENCY IDENTITY */}
      <div className="space-y-3.5">
        <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
          <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
            Agency Profile
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Agency Name <span className="text-rose-500">*</span>
            </label>
            <input
              name="agencyName"
              type="text"
              required
              placeholder="e.g. Shree Balaji Gas Agency"
              className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Oil Company Brand <span className="text-rose-500">*</span>
            </label>
            <select
              name="oilCompany"
              required
              defaultValue="Indane"
              className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            >
              <option value="Indane">Indane (IOCL)</option>
              <option value="Bharat Gas">Bharat Gas (BPCL)</option>
              <option value="HP Gas">HP Gas (HPCL)</option>
              <option value="Private LPG">Private LPG / Auto LPG</option>
              <option value="Other">Other Distributor</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Distributor SAP / Consumer Code
            </label>
            <input
              name="distributorCode"
              type="text"
              placeholder="e.g. 129480"
              className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              City <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                name="city"
                type="text"
                required
                placeholder="e.g. Jaipur"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              State <span className="text-rose-500">*</span>
            </label>
            <input
              name="state"
              type="text"
              required
              placeholder="e.g. Rajasthan"
              className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: OWNER / ADMINISTRATOR DETAILS */}
      <div className="space-y-3.5 pt-2">
        <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
          <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
            Owner &amp; Admin Credentials
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Owner / Manager Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              name="ownerName"
              type="text"
              required
              placeholder="e.g. Rajeshwar Sharma"
              className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Mobile Number (SMS &amp; Alerts) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                name="phone"
                type="tel"
                required
                maxLength={10}
                placeholder="9876543210"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition font-mono"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Admin Login Email <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                name="email"
                type="email"
                required
                placeholder="admin@youragency.com"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Create Strong Password <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-zinc-500 font-mono">Min 8 chars, 1 uppercase, 1 symbol</span>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                required
                value={passwordValue}
                onChange={(e) => setPasswordValue(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Micro requirements indicator */}
            <div className="flex flex-wrap gap-2 mt-2 text-[10px] font-mono">
              <span className={`flex items-center gap-1 ${hasMinLength ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-zinc-400"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${hasMinLength ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"}`} />
                8+ chars
              </span>
              <span className={`flex items-center gap-1 ${hasUppercase ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-zinc-400"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${hasUppercase ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"}`} />
                Uppercase (A-Z)
              </span>
              <span className={`flex items-center gap-1 ${hasNumber ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-zinc-400"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${hasNumber ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"}`} />
                Number (0-9)
              </span>
              <span className={`flex items-center gap-1 ${hasSpecial ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-zinc-400"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${hasSpecial ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"}`} />
                Symbol (@, #, !)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SUBMIT BUTTON */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={pending}
          className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all"
        >
          {pending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Configuring Agency Workspace...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              <span>Create Agency &amp; Start 14-Day Free Trial</span>
            </>
          )}
        </button>
      </div>

      <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
        Already have an agency account?{" "}
        <Link href="/login" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
          Sign in here
        </Link>
      </p>
    </form>
  );
}
