import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Package,
  Truck,
  Shield,
  Flame,
  Star,
  Clock,
  PhoneCall,
  AlertTriangle,
  Receipt,
  ChevronRight,
  HelpCircle,
  Database,
  Calculator,
  ShieldAlert,
} from "lucide-react";
import BookDemoForm from "./BookDemoForm";
import InteractiveLandingCockpit from "./InteractiveLandingCockpit";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 antialiased selection:bg-blue-600 selection:text-white">

      {/* ── 1. Top Announcement Bar ─────────────────────────────────────────── */}
      <div className="bg-zinc-900 dark:bg-black text-zinc-300 text-xs py-2 px-4 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium text-white">Version 2.4 Active</span>
            <span className="text-zinc-500 hidden sm:inline">•</span>
            <span className="hidden sm:inline text-zinc-400">Specially engineered for Indane, Bharat Gas & HP Gas Distributors</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono text-zinc-400">
            <span className="hidden md:inline">Helpline: +91 98765 43210</span>
            <Link href="/login" className="text-blue-400 hover:text-blue-300 underline underline-offset-2">
              Staff Portal &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* ── 2. Sticky Header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-blue-600 dark:bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-extrabold text-base tracking-tight text-zinc-950 dark:text-white">GasAgency</span>
                <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900 rounded">
                  PRO
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium tracking-tight mt-0.5">
                Enterprise LPG Operations
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8 text-[13px] font-medium text-zinc-600 dark:text-zinc-400">
            <a href="#cockpit" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Live Cockpit</a>
            <a href="#features" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Core Capabilities</a>
            <a href="#comparison" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Why Replace Spreadsheets</a>
            <a href="#roles" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Roles & Workspaces</a>
            <a href="#approval" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Audit Flow</a>
            <a href="#faq" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">FAQ</a>
          </nav>

          {/* CTAs */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-[13px] font-semibold px-4 py-2 rounded-lg text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all"
            >
              Sign In
            </Link>
            <a
              href="#demo"
              className="flex items-center gap-1.5 text-[13px] font-bold px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition-all hover:translate-y-[-0.5px]"
            >
              Book a Demo <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* ── 3. Hero Section with Architectural Grid ───────────────────────────── */}
      <section className="relative pt-16 pb-20 px-6 overflow-hidden border-b border-zinc-200/80 dark:border-zinc-800/80">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />

        <div className="relative max-w-5xl mx-auto text-center">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-300 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 text-zinc-800 dark:text-zinc-200 text-xs font-semibold mb-6 shadow-xs backdrop-blur-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Built Exclusively for Indian LPG Distribution Agencies</span>
            <span className="text-zinc-400 font-mono text-[10px]">Indane • Bharatgas • HP Gas</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-zinc-950 dark:text-white leading-[1.08] mb-6">
            The Operating System for
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 bg-clip-text text-transparent">
              High-Precision Gas Agencies
            </span>
          </h1>

          <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed mb-10 max-w-3xl mx-auto">
            Stop losing revenue to lost cylinder chits, uncollected commercial credit, and manual cash mismatch.
            Manage godown truck gate passes, delivery boy runsheets, cash drawer balancing, and 4-tier approvals from a single dashboard.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-14">
            <a
              href="#demo"
              className="flex items-center gap-2.5 px-7 py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02]"
            >
              Book a 1-on-1 Agency Walkthrough <ArrowRight className="w-4 h-4" />
            </a>
            <Link
              href="/login"
              className="flex items-center gap-2 px-7 py-3.5 border border-zinc-300 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 text-sm font-semibold rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            >
              Open Agency Dashboard
            </Link>
          </div>

          {/* Operational Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-zinc-900/60 backdrop-blur-xs">
            {[
              { val: "100%", label: "Cash & UPI Day-End Balance", sub: "Denomination counter verified" },
              { val: "0 Lost", label: "Cylinder Discrepancy", sub: "Truck inward/outward gate tally" },
              { val: "4-Level", label: "Zero-Trust Approval Chain", sub: "Permanent tamper-proof lock" },
              { val: "Offline", label: "Driver Mobile App Ready", sub: "Works in basements & weak zones" },
            ].map((m) => (
              <div key={m.label} className="text-left px-3 py-2 border-l-2 border-blue-500/80">
                <p className="font-mono font-extrabold text-xl sm:text-2xl text-zinc-950 dark:text-white tracking-tight">{m.val}</p>
                <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">{m.label}</p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">{m.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 4. Interactive Live Cockpit ─────────────────────────────────────── */}
        <div id="cockpit" className="mt-14 max-w-6xl mx-auto">
          <div className="text-center mb-5">
            <span className="font-mono text-[11px] uppercase tracking-wider text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-900 px-3 py-1 rounded-full">
              Live Product Experience
            </span>
            <p className="text-xs text-zinc-500 mt-1.5">Interact with the real agency modules below</p>
          </div>
          <InteractiveLandingCockpit />
        </div>
      </section>

      {/* ── 5. Problem vs. Solution (Why Spreadsheets Fail) ───────────────────── */}
      <section id="comparison" className="py-20 px-6 bg-zinc-50 dark:bg-zinc-900/40 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="font-mono text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 px-3 py-1 rounded-full">
              Eliminate Daily Operational Chaos
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-white mt-4">
              Why Indian Gas Distributors Are Ditching Spreadsheets & Registers
            </h2>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 mt-3">
              Running a 10,000+ customer agency on rough paper slips and WhatsApp messages guarantees cash leakages and lost cylinder deposits.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* The Old Way */}
            <div className="p-6 sm:p-8 rounded-2xl border border-rose-200 dark:border-rose-950/80 bg-rose-50/30 dark:bg-rose-950/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950 flex items-center justify-center text-rose-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-rose-950 dark:text-rose-200">The Old Way: Paper Chits & Spreadsheets</h3>
                  <p className="text-xs text-rose-800/80 dark:text-rose-400">Prone to theft, memory bias, and evening accounting headaches</p>
                </div>
              </div>
              <ul className="space-y-4 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
                {[
                  "Delivery boys return with mixed cash, incomplete slips, and lost DAC numbers.",
                  "Commercial hotel udhari (credit) is noted in rough pocket books that get misplaced.",
                  "Plant truck loads (450 cylinders) are signed off without physical weight or valve leak checks.",
                  "Owner spends 2+ hours every evening trying to reconcile why ₹4,200 is short in the cash drawer.",
                  "No automated warning when PESO licenses or driver explosive van fitness certificates expire.",
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="text-rose-500 font-bold shrink-0">✕</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* The GasAgency Pro Way */}
            <div className="p-6 sm:p-8 rounded-2xl border border-emerald-200 dark:border-emerald-950/80 bg-emerald-50/30 dark:bg-emerald-950/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-emerald-950 dark:text-emerald-200">The Modern Way: GasAgency Pro</h3>
                  <p className="text-xs text-emerald-800/80 dark:text-emerald-400">Strict zero-leakage workflow enforced by automated checks</p>
                </div>
              </div>
              <ul className="space-y-4 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
                {[
                  "Driver mobile app enforces consumer OTP entry and separates cash vs UPI instantly.",
                  "Hotel accounts tracked with 30-day credit aging and one-tap WhatsApp payment reminders.",
                  "Godown gate inward module records truck plate number, filled count, and empties returned.",
                  "Cash Denomination Counter (₹500, ₹200, ₹100 notes) balances with delivery records in 10 minutes.",
                  "Proactive 30-day alerts for PESO explosive licenses, driver permits, and fire safety compliance.",
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. Core Features Tailored to Gas Distribution ─────────────────────── */}
      <section id="features" className="py-20 px-6 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="font-mono text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 px-3 py-1 rounded-full">
              Engineered Capabilities
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-white mt-4">
              Everything Needed to Run a Full-Scale Gas Agency
            </h2>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 mt-2">
              Modular, fast, and battle-tested for Indian operational conditions.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: Package,
                tag: "Godown & Yard",
                title: "Cylinder Inventory Tracking",
                desc: "Real-time categorization: 14.2kg Domestic, 19kg Commercial, 47.5kg Industrial, and 5kg Mini cylinders. Track filled vs empty ratios and quarantine defective valves.",
              },
              {
                icon: Truck,
                tag: "Field Logistics",
                title: "Delivery Run Sheets & OTPs",
                desc: "Assign vehicle loads to delivery boys. Mandatory OTP entry guarantees the cylinder reached the genuine consumer before status flips to delivered.",
              },
              {
                icon: Receipt,
                tag: "Accounts & Billing",
                title: "Commercial Credit (Udhari)",
                desc: "Maintain running ledgers for hotels, restaurants, and bakeries. Automated WhatsApp statements with UPI paylinks eliminate outstanding balance chasing.",
              },
              {
                icon: Calculator,
                tag: "Cash Drawer",
                title: "Denomination Counter",
                desc: "Cash reconciliation by physical currency notes (₹500, ₹200, ₹100, ₹50). Flags shortages immediately before delivery staff leaves the agency.",
              },
              {
                icon: ShieldAlert,
                tag: "Legal Compliance",
                title: "Statutory License Watchdog",
                desc: "Automatic reminders 30 days prior to expiry for PESO Explosives Licenses, Explosive Van Road Permits, Driver Hazardous Cargo Training, and Fire NOCs.",
              },
              {
                icon: Database,
                tag: "Audit Proof",
                title: "4-Level Approval Chain",
                desc: "Delivery Boy &rarr; Counter Staff &rarr; Manager &rarr; Agency Owner. Transactions become immutable and locked into permanent accounting records only upon owner approval.",
              },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-lg transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-mono text-[10px] uppercase font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                        {f.tag}
                      </span>
                    </div>
                    <h3 className="font-bold text-base text-zinc-950 dark:text-white mb-2">{f.title}</h3>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{f.desc}</p>
                  </div>
                  <div className="pt-4 mt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400">
                    <span>Inspect feature</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 7. Role-Based Workspaces ─────────────────────────────────────────── */}
      <section id="roles" className="py-20 px-6 bg-zinc-50 dark:bg-zinc-900/40 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="font-mono text-xs uppercase tracking-wider text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-900 px-3 py-1 rounded-full">
              Tailored User Interfaces
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-white mt-4">
              A Specialized Workspace for Every Staff Member
            </h2>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 mt-2">
              Nobody gets overwhelmed by options they don&apos;t use. Field staff see giant buttons; owners see deep analytics.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                role: "Agency Owner / Admin",
                badge: "Total Control",
                tagColor: "bg-blue-600 text-white",
                responsibilities: [
                  "Executive P&L and daily cash dashboard",
                  "Final approval gatekeeper for ledger locks",
                  "Staff attendance & salary payroll register",
                  "Multi-branch & bank deposit management",
                ],
              },
              {
                role: "Godown In-Charge",
                badge: "Stock Operations",
                tagColor: "bg-emerald-600 text-white",
                responsibilities: [
                  "Plant truck inward & outward gate passes",
                  "Full vs empty cylinder inventory audit",
                  "Defective valves & SV replacement logs",
                  "Daily physical stock count reconciliation",
                ],
              },
              {
                role: "Office Billing Staff",
                badge: "Counter & Accounts",
                tagColor: "bg-amber-600 text-white",
                responsibilities: [
                  "Walk-in consumer cash sale & exchange",
                  "Commercial hotel credit billing & GST e-way",
                  "Customer SV / TV transfer vouchers",
                  "Daily cash drawer denomination balancing",
                ],
              },
              {
                role: "Delivery Boys",
                badge: "Field Mobile App",
                tagColor: "bg-indigo-600 text-white",
                responsibilities: [
                  "Touch-friendly mobile interface in Hindi/English",
                  "Consumer DAC/OTP code validation",
                  "UPI dynamic QR vs physical cash collected",
                  "End-of-day run closure submission",
                ],
              },
            ].map((r) => (
              <div
                key={r.role}
                className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col justify-between"
              >
                <div>
                  <span className={`inline-block font-mono text-[10px] font-bold px-2 py-0.5 rounded mb-3 ${r.tagColor}`}>
                    {r.badge}
                  </span>
                  <h3 className="font-bold text-sm text-zinc-950 dark:text-white mb-3">{r.role}</h3>
                  <ul className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                    {r.responsibilities.map((task, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                        <span>{task}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. The 4-Stage Zero-Trust Approval Engine ─────────────────────────── */}
      <section id="approval" className="py-20 px-6 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="font-mono text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 px-3 py-1 rounded-full">
              Accounting Integrity
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-white mt-4">
              How the 4-Level Approval Protects Every Rupee
            </h2>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 mt-2">
              No employee can fabricate deliveries or pocket cash. Records become permanent only after physical checks.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            {[
              {
                num: "01",
                actor: "Delivery Executive",
                action: "Submits Day-End Run",
                detail: "Enters delivered count, empties retrieved, and total cash/UPI collected.",
              },
              {
                num: "02",
                actor: "Office Staff",
                action: "Physically Counts Cash",
                detail: "Verifies currency denominations in the cash drawer against the delivery slip.",
              },
              {
                num: "03",
                actor: "Operations Manager",
                action: "Cross-Checks Godown",
                detail: "Audits cylinder empties returned to the yard vs full cylinders dispatched.",
              },
              {
                num: "04",
                actor: "Distributor / Owner",
                action: "Final Digital Sign-Off",
                detail: "Signs off on consolidated totals; records are locked and immutably written to database.",
              },
            ].map((stage) => (
              <div key={stage.num} className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 relative">
                <span className="font-mono font-black text-2xl text-blue-600/40 dark:text-blue-400/30">
                  {stage.num}
                </span>
                <p className="text-[11px] font-mono font-semibold text-zinc-400 mt-1">{stage.actor}</p>
                <h4 className="font-bold text-sm text-zinc-950 dark:text-white mt-1 mb-2">{stage.action}</h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{stage.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 9. Real Agency Case Proof ────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-zinc-950 text-white border-b border-zinc-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="font-mono text-xs uppercase tracking-wider text-blue-400 font-bold bg-blue-950 border border-blue-900 px-3 py-1 rounded-full">
              Field Feedback
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-4">
              Trusted by Distributors Across India
            </h2>
            <p className="text-sm sm:text-base text-zinc-400 mt-2">
              From high-density metro agencies to multi-tehsil rural distribution networks.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Rajeshwar Sharma",
                distributor: "Indane Gas Distributor",
                city: "Jaipur, Rajasthan",
                connections: "14,500 Domestic • 85 Commercial",
                quote: "Before this system, evening cash tallying used to drag until 9:30 PM. Now our counter staff balances the physical currency counter with delivery runsheets in 15 minutes flat.",
              },
              {
                name: "Sanjay Patel",
                distributor: "HP Gas Agency",
                city: "Surat, Gujarat",
                connections: "18,200 Domestic • 120 Commercial",
                quote: "The Commercial Udhari Khata alone recovered ₹3.2 Lakhs of overdue payments from restaurants. The automated WhatsApp statements with payment links make collection effortless.",
              },
              {
                name: "Anand Murthy",
                distributor: "Bharatgas Dealer",
                city: "Bengaluru, Karnataka",
                connections: "11,000 Domestic",
                quote: "Our delivery boys picked up the mobile app within half an hour. OTP validation stopped fake delivery claims completely, and our stock balance at the godown matches 100%.",
              },
            ].map((t) => (
              <div key={t.name} className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 flex flex-col justify-between">
                <div>
                  <div className="flex gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-6 italic">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                </div>
                <div className="pt-4 border-t border-zinc-800">
                  <p className="font-bold text-sm text-white">{t.name}</p>
                  <p className="text-xs text-blue-400 font-medium">{t.distributor} • {t.city}</p>
                  <p className="text-[10px] font-mono text-zinc-500 mt-1">{t.connections}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 10. Frequently Asked Questions ───────────────────────────────────── */}
      <section id="faq" className="py-20 px-6 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <span className="font-mono text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 px-3 py-1 rounded-full">
              Distributor Questions
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white mt-4">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Does this replace our official oil company software (SDMS / e-Bharat / HP CLOUD)?",
                a: "No, this is your agency's internal operating system. Official oil company portals record statutory allocations, while GasAgency Pro manages your internal physical stock, actual cash drawer currency balancing, staff attendance, commercial customer udhari ledgers, and delivery vehicle dispatch.",
              },
              {
                q: "Can delivery boys operate the mobile app without English fluency?",
                a: "Yes. The delivery interface has been designed with oversized tap buttons, visual color cues (Green for Delivered, Blue for Pending), Hindi language support, and clean numeric keypads for OTP and cash collection.",
              },
              {
                q: "What happens if a driver delivers in a rural area or basement with zero internet?",
                a: "The mobile app is offline-first. The driver can confirm delivery, log cash/UPI, and record the OTP offline. As soon as the device catches mobile signal, records sync automatically with the central agency server.",
              },
              {
                q: "How does the 4-level approval chain prevent employee fraud?",
                a: "Data moves through four gates: Delivery Boy &rarr; Staff &rarr; Manager &rarr; Owner. No transaction is committed as final in financial accounts until the owner signs off. Any discrepancy between truck gate entries and yard counts is flagged before the day can be closed.",
              },
            ].map((faq, idx) => (
              <div key={idx} className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <h3 className="font-bold text-sm sm:text-base text-zinc-950 dark:text-white mb-2 flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-1" />
                  <span>{faq.q}</span>
                </h3>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pl-6">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 11. Book a Demo Section ─────────────────────────────────────────── */}
      <section id="demo" className="py-20 px-6 bg-zinc-50 dark:bg-zinc-900/40 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            {/* Left information */}
            <div>
              <span className="font-mono text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 px-3 py-1 rounded-full">
                Get Started
              </span>
              <h2 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white mt-4 mb-4">
                Schedule a Guided Walkthrough for Your Agency
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-8">
                Our operations specialist will walk you through the entire live system using realistic agency data, demonstrate how the cash counter and godown gate modules operate, and answer your team&apos;s specific questions.
              </p>

              <div className="space-y-4 mb-8 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
                {[
                  { icon: Clock, title: "Quick 20-minute tailored demonstration" },
                  { icon: PhoneCall, title: "Direct call or video screen-share" },
                  { icon: CheckCircle2, title: "Complimentary setup & master data import" },
                  { icon: Shield, title: "Zero long-term lock-in contract" },
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="font-medium">{item.title}</span>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60">
                <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                  <strong>Agency Owner Hotline:</strong> Have urgent questions? Call our technical onboarding lead directly at <strong>+91 98765 43210</strong> (Mon-Sat, 9 AM - 7 PM).
                </p>
              </div>
            </div>

            {/* Right form card */}
            <div className="p-6 sm:p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xl shadow-zinc-200/40 dark:shadow-black/50">
              <h3 className="font-bold text-lg text-zinc-950 dark:text-white mb-1">Book Your Agency Demo</h3>
              <p className="text-xs text-zinc-500 mb-6">Enter your agency details to reserve a demo slot.</p>
              <BookDemoForm />
            </div>
          </div>
        </div>
      </section>

      {/* ── 12. Footer ───────────────────────────────────────────────────────── */}
      <footer className="bg-zinc-950 text-zinc-400 py-12 px-6 border-t border-zinc-900 text-xs">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                  <Flame className="w-4 h-4" />
                </div>
                <span className="font-extrabold text-sm text-white">GasAgency Pro</span>
              </div>
              <p className="text-zinc-500 leading-relaxed text-[11px] mb-3">
                The enterprise management operating system for Indian LPG gas distribution agencies.
              </p>
              <p className="font-mono text-[10px] text-zinc-600">
                Server Status: Operational (99.98% Uptime)
              </p>
            </div>

            <div>
              <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-300 font-bold mb-3">Modules</p>
              <ul className="space-y-2">
                <li><a href="#cockpit" className="hover:text-white transition-colors">Godown Inventory</a></li>
                <li><a href="#cockpit" className="hover:text-white transition-colors">Delivery Run Sheets</a></li>
                <li><a href="#cockpit" className="hover:text-white transition-colors">Commercial Credit (Udhari)</a></li>
                <li><a href="#cockpit" className="hover:text-white transition-colors">Denomination Counter</a></li>
              </ul>
            </div>

            <div>
              <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-300 font-bold mb-3">Agency Portals</p>
              <ul className="space-y-2">
                <li><Link href="/login" className="hover:text-white transition-colors">Owner Admin Portal</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Office Staff Counter</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Godown Keeper Yard</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Delivery Mobile App</Link></li>
              </ul>
            </div>

            <div>
              <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-300 font-bold mb-3">Support & Legal</p>
              <ul className="space-y-2">
                <li><a href="mailto:support@gasagency.app" className="hover:text-white transition-colors">support@gasagency.app</a></li>
                <li><a href="#demo" className="hover:text-white transition-colors">Book a Demo</a></li>
                <li><Link href="/login" className="hover:text-white transition-colors">System Login</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-500">
            <p>
              © {new Date().getFullYear()} All Copyright and Rights Reserved by{" "}
              <a
                href="https://www.cicdtech.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
              >
                CICD Tech
              </a>
            </p>
            <div className="flex items-center gap-4 text-zinc-500">
              <span>ISO 27001 Data Compliant</span>
              <span>•</span>
              <span>Indian Standard Time (IST) Support</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
