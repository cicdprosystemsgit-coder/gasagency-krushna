import Link from "next/link";
import { Flame, CheckCircle2, ShieldCheck, ArrowLeft } from "lucide-react";
import { SignupForm } from "./SignupForm";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

export const metadata = {
  title: "Register Your Gas Agency | GasAgency Pro",
  description: "Start your 14-day full access trial for your LPG distribution agency.",
};

export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* ── Left Showcase Panel ────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[440px] shrink-0 p-10 bg-zinc-950 text-white border-r border-zinc-800 relative overflow-hidden">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:2.5rem_2.5rem] opacity-30 pointer-events-none" />

        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30 group-hover:scale-105 transition-transform">
              <Flame className="w-4.5 h-4.5" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-white">GasAgency</span>
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-800 rounded">
                PRO
              </span>
            </div>
          </Link>
        </div>

        <div className="relative z-10 my-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-800/80 text-blue-300 text-xs font-mono font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            14-Day Free Trial • Instant Activation
          </div>

          <h1 className="text-2xl font-black tracking-tight leading-snug">
            Digitize Your Gas Agency in Less Than 5 Minutes
          </h1>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Join hundreds of LPG distributors across India. Stop lost cylinder chits, uncollected hotel credits, and cash drawer mismatch.
          </p>

          <div className="space-y-3 pt-2 text-xs text-zinc-300">
            {[
              "Complete Multi-Role System: Admin, Staff, Godown & Driver App",
              "Truck Gate Pass & Defective Cylinder Quarantine",
              "Currency Denomination Cash Drawer Auto-Reconciler",
              "Commercial Customer Udhari Khata with WhatsApp Statements",
              "Proactive 30-Day PESO & Vehicle Explosive License Alerts",
            ].map((feature, idx) => (
              <div key={idx} className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 space-y-1 font-mono">
            <p className="text-zinc-300 font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              100% Data Isolation Guarantee
            </p>
            <p>Your agency records, customer ledgers, and cash books are encrypted and segregated.</p>
          </div>
        </div>

        <div className="relative z-10 pt-6 border-t border-zinc-900 flex items-center justify-between text-[11px] text-zinc-500">
          <span>© {new Date().getFullYear()} GasAgency Pro</span>
          <Link href="/" className="hover:text-zinc-300 transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Back to Home
          </Link>
        </div>
      </div>

      {/* ── Right Form Container ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 relative overflow-y-auto">
        {/* Top utilities */}
        <div className="flex items-center justify-between w-full max-w-2xl mx-auto mb-6">
          <Link href="/login" className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 font-medium transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
          </Link>
          <LanguageSwitcher />
        </div>

        {/* Center Card */}
        <div className="w-full max-w-2xl mx-auto">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900">
                Self-Service Onboarding
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-zinc-950 dark:text-white">
              Register Your Gas Distribution Agency
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Fill in your agency details below to initialize your workspace with a 14-day free trial.
            </p>
          </div>

          <div className="p-6 sm:p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xl shadow-zinc-200/50 dark:shadow-black/40">
            <SignupForm />
          </div>

          <div className="mt-8 text-center text-xs text-zinc-400">
            <p>
              By signing up, you agree to agency operational guidelines and data terms. Need assistance? Call our onboarding desk at <strong>+91 98765 43210</strong>.
            </p>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="w-full max-w-2xl mx-auto pt-8 text-center text-[11px] text-zinc-400 dark:text-zinc-600">
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
  );
}

