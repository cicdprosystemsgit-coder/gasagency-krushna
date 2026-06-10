import Link from "next/link";
import {
  ArrowRight, CheckCircle, BarChart3, Package, Truck,
  Users, Shield, Bell, ChevronRight, Flame, Star,
  Clock, HeadphonesIcon, TrendingUp, Zap, Lock, PhoneCall,
} from "lucide-react";
import BookDemoForm from "./BookDemoForm";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}>

      {/* ── Sticky Header ────────────────────────────────────── */}
      <header style={{ borderBottom: "1px solid #E4E4E7" }} className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-sm">
              <Flame className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <span className="font-bold text-[16px] tracking-tight text-zinc-900">GasAgency</span>
              <span className="hidden sm:inline text-[11px] text-zinc-400 font-medium ml-1.5">Pro</span>
            </div>
          </div>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium text-zinc-500">
            <a href="#features" className="hover:text-zinc-900 transition-colors">Features</a>
            <a href="#roles" className="hover:text-zinc-900 transition-colors">Who It&apos;s For</a>
            <a href="#workflow" className="hover:text-zinc-900 transition-colors">How It Works</a>
            <a href="#demo" className="hover:text-zinc-900 transition-colors">Book Demo</a>
          </nav>

          {/* CTAs */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:block text-[13px] font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
            >
              Sign in
            </Link>
            <a
              href="#demo"
              className="flex items-center gap-1.5 text-[13px] font-semibold px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
            >
              Book a Demo <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-blue-50/60 via-white to-white pt-20 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-[12px] font-semibold mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            Built exclusively for Indian gas distributors
          </div>

          <h1 className="text-[48px] sm:text-[56px] font-extrabold tracking-tight text-zinc-900 leading-[1.1] mb-6">
            Run your gas agency
            <br />
            <span className="text-blue-600">like a modern business</span>
          </h1>
          <p className="text-[17px] text-zinc-500 leading-relaxed mb-10 max-w-2xl mx-auto">
            Deliveries, stock, accounts, godown, staff & approvals — all in one platform.
            Trusted by agencies across India to track every cylinder, every rupee, every day.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14">
            <a
              href="#demo"
              className="flex items-center gap-2 px-7 py-3.5 bg-blue-600 text-white text-[15px] font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-200"
            >
              Book a Free Demo <ArrowRight className="w-4 h-4" />
            </a>
            <Link
              href="/login"
              className="flex items-center gap-2 px-7 py-3.5 border-2 border-zinc-200 text-zinc-700 text-[15px] font-semibold rounded-xl hover:bg-zinc-50 hover:border-zinc-300 transition-colors"
            >
              Sign in to dashboard
            </Link>
          </div>

          {/* Trust stats */}
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[13px] text-zinc-500">
            {[
              { value: "500+", label: "Agencies onboarded" },
              { value: "1 Lakh+", label: "Cylinders tracked daily" },
              { value: "4-level", label: "Approval workflow" },
              { value: "24/7", label: "Data accessible" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2">
                <span className="font-bold text-zinc-900">{s.value}</span>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Dashboard mockup */}
        <div className="max-w-5xl mx-auto mt-14">
          <div className="rounded-2xl border border-zinc-200 shadow-2xl overflow-hidden">
            <div className="bg-zinc-100 border-b border-zinc-200 px-4 py-2.5 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-white border border-zinc-200 rounded text-[11px] text-zinc-400 px-3 py-1 max-w-xs">
                  gasagency.app/admin/dashboard
                </div>
              </div>
            </div>
            <div className="bg-zinc-50 flex" style={{ height: 360 }}>
              {/* Sidebar */}
              <div className="w-52 bg-zinc-900 flex-shrink-0 p-3">
                <div className="flex items-center gap-2 px-2 py-2 mb-5">
                  <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center">
                    <Flame className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-[13px] font-bold text-white">GasAgency</span>
                </div>
                {["Dashboard", "Inventory", "Godown", "Commercial Sales", "Credit Ledger", "Expenses", "Approvals"].map((item, i) => (
                  <div key={item} className={`px-3 py-2 rounded-lg text-[11px] mb-0.5 flex items-center gap-2 ${i === 0 ? "bg-white/15 text-white font-semibold" : "text-zinc-500 hover:text-zinc-300"}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? "bg-blue-400" : "bg-zinc-700"}`}></div>
                    {item}
                  </div>
                ))}
              </div>
              {/* Main area */}
              <div className="flex-1 p-5 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[14px] font-bold text-zinc-800">Today&apos;s Overview</p>
                  <span className="text-[11px] text-zinc-400">05 Jun 2026</span>
                </div>
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {[
                    { label: "Cylinders Delivered", value: "247", color: "#2563EB", bg: "#EFF6FF" },
                    { label: "Cash Collected", value: "₹84,500", color: "#16A34A", bg: "#F0FDF4" },
                    { label: "Pending", value: "18", color: "#D97706", bg: "#FFFBEB" },
                    { label: "Stock Balance", value: "312", color: "#7C3AED", bg: "#F5F3FF" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-zinc-200 p-3" style={{ background: s.bg }}>
                      <p className="text-[20px] font-bold" style={{ color: s.color }}>{s.value}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5 font-medium">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-zinc-100 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-600 uppercase tracking-wide">Pending Approvals</span>
                    <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full">3 pending</span>
                  </div>
                  {[
                    { name: "Raju Kumar", role: "Delivery Boy", status: "Pending" },
                    { name: "Suresh Patel", role: "Staff", status: "Approved" },
                    { name: "Godown Entry", role: "Godown Keeper", status: "Pending" },
                  ].map((r) => (
                    <div key={r.name} className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-50 last:border-0">
                      <div>
                        <span className="text-[11px] font-semibold text-zinc-800">{r.name}</span>
                        <span className="text-[10px] text-zinc-400 ml-2">{r.role}</span>
                      </div>
                      <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${r.status === "Approved" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust bar ────────────────────────────────────────── */}
      <section className="border-t border-b border-zinc-100 py-8 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-[12px] font-semibold text-zinc-400 uppercase tracking-widest mb-6">
            Why agencies across India choose GasAgency
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: <Zap className="w-5 h-5 text-blue-600" />, title: "Setup in minutes", desc: "No training needed. Your team starts on day one." },
              { icon: <Lock className="w-5 h-5 text-green-600" />, title: "Secure & reliable", desc: "Role-based access. Your data stays private." },
              { icon: <TrendingUp className="w-5 h-5 text-violet-600" />, title: "Real-time reports", desc: "See deliveries, cash & stock as they happen." },
              { icon: <HeadphonesIcon className="w-5 h-5 text-amber-600" />, title: "Dedicated support", desc: "Our team responds within 24 hours." },
            ].map((t) => (
              <div key={t.title} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center">
                  {t.icon}
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-zinc-800">{t.title}</p>
                  <p className="text-[12px] text-zinc-500 mt-0.5 leading-relaxed">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12 text-center">
            <span className="inline-block text-[11px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 border border-blue-100 px-3 py-1 rounded-full mb-3">
              Features
            </span>
            <h2 className="text-[32px] font-extrabold tracking-tight text-zinc-900">Everything your agency needs</h2>
            <p className="text-[16px] text-zinc-500 mt-3 max-w-xl mx-auto">
              One platform for operations, accounts, staff, and approvals. No spreadsheets, no confusion.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: <Package className="w-5 h-5" />, color: "text-blue-600", bg: "bg-blue-50 border-blue-100", title: "Inventory Management", desc: "Track filled & empty cylinders. Manage product catalog with sale rates and margins." },
              { icon: <Truck className="w-5 h-5" />, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100", title: "Godown Management", desc: "Record every vehicle arrival. Log filled/empty cylinder counts with full timestamps." },
              { icon: <BarChart3 className="w-5 h-5" />, color: "text-violet-600", bg: "bg-violet-50 border-violet-100", title: "Commercial Sales", desc: "Track hotel & restaurant deliveries. Monitor outstanding payments automatically." },
              { icon: <Users className="w-5 h-5" />, color: "text-amber-600", bg: "bg-amber-50 border-amber-100", title: "Credit Ledger (Udhari)", desc: "Per-customer balance with full credit and payment history. Never miss a payment." },
              { icon: <Shield className="w-5 h-5" />, color: "text-rose-600", bg: "bg-rose-50 border-rose-100", title: "4-Level Approvals", desc: "Employee → Manager → Section Summary → Admin. Data saved only after full verification." },
              { icon: <Bell className="w-5 h-5" />, color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-100", title: "Renewal Reminders", desc: "Auto alerts for PUC, transport licence, and agency licence — 30 days before due date." },
            ].map((f) => (
              <div key={f.title} className="bg-white p-6 rounded-2xl border border-zinc-200 hover:border-zinc-300 hover:shadow-md transition-all">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-4 ${f.bg} ${f.color}`}>
                  {f.icon}
                </div>
                <h3 className="text-[15px] font-bold text-zinc-900 mb-2">{f.title}</h3>
                <p className="text-[13px] text-zinc-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Roles ────────────────────────────────────────────── */}
      <section id="roles" className="py-20 px-6 bg-zinc-50 border-t border-zinc-100">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12 text-center">
            <span className="inline-block text-[11px] font-bold text-violet-600 uppercase tracking-widest bg-violet-50 border border-violet-100 px-3 py-1 rounded-full mb-3">
              Role-based access
            </span>
            <h2 className="text-[32px] font-extrabold tracking-tight text-zinc-900">The right tools for every role</h2>
            <p className="text-[16px] text-zinc-500 mt-3">Each person only sees what they need. No clutter, no confusion.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { role: "Admin", tag: "Full Access", color: "bg-blue-600", tagText: "text-white", border: "border-blue-100", duties: ["All modules", "Final approvals", "Staff management", "Asset reports"] },
              { role: "Manager", tag: "Review", color: "bg-violet-600", tagText: "text-white", border: "border-violet-100", duties: ["Approve summaries", "All section data", "Section reports"] },
              { role: "Godown Keeper", tag: "Stock", color: "bg-emerald-600", tagText: "text-white", border: "border-emerald-100", duties: ["Vehicle entries", "Cylinder in/out", "Submit for approval"] },
              { role: "Staff", tag: "Office", color: "bg-amber-500", tagText: "text-white", border: "border-amber-100", duties: ["Office transactions", "Commercial sales", "Credit ledger", "GST invoicing"] },
              { role: "Delivery Boy", tag: "Field", color: "bg-rose-500", tagText: "text-white", border: "border-rose-100", duties: ["My deliveries", "Cash collection", "Delivery ledger"] },
            ].map((r) => (
              <div key={r.role} className={`bg-white border ${r.border} rounded-2xl p-5 hover:shadow-md transition-shadow`}>
                <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full mb-3 ${r.color} ${r.tagText}`}>
                  {r.tag}
                </span>
                <p className="text-[15px] font-bold text-zinc-900 mb-3">{r.role}</p>
                <ul className="space-y-2">
                  {r.duties.map((d) => (
                    <li key={d} className="flex items-center gap-2 text-[12px] text-zinc-500">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Workflow ──────────────────────────────────────────── */}
      <section id="workflow" className="py-20 px-6 border-t border-zinc-100">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12 text-center">
            <span className="inline-block text-[11px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full mb-3">
              Approval workflow
            </span>
            <h2 className="text-[32px] font-extrabold tracking-tight text-zinc-900">4-level verification before data is saved</h2>
            <p className="text-[16px] text-zinc-500 mt-3">No data is permanently stored until it passes all approval stages. Zero errors.</p>
          </div>
          <div className="flex flex-col lg:flex-row items-start gap-0">
            {[
              { step: "01", title: "Employee submits", desc: "Delivery Boy, Staff, or Godown Keeper submits a complete day-end summary — one entry for all work." },
              { step: "02", title: "Manager reviews", desc: "Manager verifies deliveries, stock, and cash. Can approve, reject, or send back for correction." },
              { step: "03", title: "Section summary", desc: "System auto-generates Delivery, Stock, and Accounts section summaries after manager approval." },
              { step: "04", title: "Admin finalises", desc: "Admin reviews section totals and reconciliation. Approval triggers permanent database storage." },
            ].map((s, i) => (
              <div key={s.step} className="flex-1 flex items-start gap-0">
                <div className="flex-1 p-6 border border-zinc-200 rounded-2xl bg-white hover:shadow-md transition-shadow">
                  <span className="text-[28px] font-black text-zinc-100">{s.step}</span>
                  <h3 className="text-[15px] font-bold text-zinc-900 mt-1 mb-2">{s.title}</h3>
                  <p className="text-[13px] text-zinc-500 leading-relaxed">{s.desc}</p>
                </div>
                {i < 3 && (
                  <div className="hidden lg:flex items-center px-2 pt-12">
                    <ChevronRight className="w-4 h-4 text-zinc-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials / Social proof ───────────────────────── */}
      <section className="py-20 px-6 bg-gradient-to-br from-blue-600 to-blue-700 border-t border-blue-700">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-[12px] font-bold text-blue-200 uppercase tracking-widest mb-10">
            What agency owners say
          </p>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                name: "Ramesh Gupta",
                location: "Jaipur, Rajasthan",
                quote: "Before GasAgency, I used to spend 2 hours every evening reconciling my books. Now it takes 15 minutes. The approval flow is a game-changer.",
              },
              {
                name: "Priya Nair",
                location: "Kochi, Kerala",
                quote: "My godown keeper, staff, and delivery boys all use it on their phones. I get a complete picture of the agency from anywhere. Best investment I&apos;ve made.",
              },
              {
                name: "Arvind Mehta",
                location: "Surat, Gujarat",
                quote: "The udhari (credit ledger) tracking alone saved us from losing over ₹2 lakh in uncollected payments. Highly recommended for any gas agency.",
              },
            ].map((t) => (
              <div key={t.name} className="bg-white/10 border border-white/20 rounded-2xl p-6 backdrop-blur-sm">
                <div className="flex gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-[13px] text-blue-100 leading-relaxed mb-4">&ldquo;{t.quote}&rdquo;</p>
                <div>
                  <p className="text-[13px] font-bold text-white">{t.name}</p>
                  <p className="text-[11px] text-blue-300">{t.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Book a Demo ───────────────────────────────────────── */}
      <section id="demo" className="py-20 px-6 bg-white border-t border-zinc-100">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            {/* Left — info */}
            <div>
              <span className="inline-block text-[11px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 border border-blue-100 px-3 py-1 rounded-full mb-4">
                Free Demo
              </span>
              <h2 className="text-[32px] font-extrabold tracking-tight text-zinc-900 mb-4 leading-tight">
                See GasAgency in action for your agency
              </h2>
              <p className="text-[15px] text-zinc-500 leading-relaxed mb-8">
                Book a free personalised demo. Our team will walk you through the entire system, answer your questions, and help you get set up — at no cost.
              </p>

              <ul className="space-y-4 mb-8">
                {[
                  { icon: <Clock className="w-4 h-4 text-blue-600" />, text: "Our team contacts you within 48 hours" },
                  { icon: <PhoneCall className="w-4 h-4 text-green-600" />, text: "Personalised demo over call or video" },
                  { icon: <CheckCircle className="w-4 h-4 text-violet-600" />, text: "Free setup assistance for your agency" },
                  { icon: <Shield className="w-4 h-4 text-amber-600" />, text: "No credit card or commitment required" },
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-[14px] text-zinc-700">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center">
                      {item.icon}
                    </div>
                    {item.text}
                  </li>
                ))}
              </ul>

              {/* contact note */}
              <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-100">
                <Bell className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <p className="text-[13px] text-amber-800 font-medium">
                  After you submit, our team will call you within <strong>48 hours</strong> on the mobile number you provide.
                </p>
              </div>
            </div>

            {/* Right — form */}
            <div className="bg-white border-2 border-zinc-200 rounded-2xl p-8 shadow-xl shadow-zinc-100">
              <h3 className="text-[18px] font-bold text-zinc-900 mb-1">Book your free demo</h3>
              <p className="text-[13px] text-zinc-500 mb-6">Fill in your details and we&apos;ll reach out to you.</p>
              <BookDemoForm />
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-zinc-900 border-t border-zinc-800">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-6">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-[32px] font-extrabold tracking-tight text-white mb-4">
            Ready to digitise your gas agency?
          </h2>
          <p className="text-[16px] text-zinc-400 mb-10 leading-relaxed">
            Join hundreds of Indian gas distributors who manage their entire agency from a single dashboard.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="#demo"
              className="flex items-center gap-2 px-7 py-3.5 bg-blue-600 text-white text-[15px] font-bold rounded-xl hover:bg-blue-500 transition-colors"
            >
              Book a Free Demo <ArrowRight className="w-4 h-4" />
            </a>
            <Link
              href="/login"
              className="flex items-center gap-2 px-7 py-3.5 border border-zinc-600 text-zinc-300 text-[15px] font-semibold rounded-xl hover:bg-zinc-800 transition-colors"
            >
              Sign in to dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="bg-zinc-950 py-12 px-6 border-t border-zinc-900">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
                  <Flame className="w-4 h-4 text-white" />
                </div>
                <span className="text-[15px] font-bold text-white">GasAgency</span>
              </div>
              <p className="text-[12px] text-zinc-500 leading-relaxed">
                The complete management platform for Indian gas distributors.
              </p>
            </div>

            {/* Product */}
            <div>
              <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Product</p>
              <ul className="space-y-2">
                {["Features", "Who It&apos;s For", "How It Works", "Book a Demo"].map((l) => (
                  <li key={l}><a href="#" className="text-[13px] text-zinc-500 hover:text-white transition-colors">{l.replace("&apos;", "'")}</a></li>
                ))}
              </ul>
            </div>

            {/* Platform */}
            <div>
              <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Platform</p>
              <ul className="space-y-2">
                {["Sign In", "Admin Dashboard", "Staff Portal", "Delivery App"].map((l) => (
                  <li key={l}><a href="/login" className="text-[13px] text-zinc-500 hover:text-white transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Contact</p>
              <ul className="space-y-2">
                <li className="text-[13px] text-zinc-500">support@gasagency.app</li>
                <li className="text-[13px] text-zinc-500">Mon–Sat, 9am–6pm IST</li>
              </ul>
              <a
                href="#demo"
                className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-blue-400 hover:text-blue-300 transition-colors"
              >
                Book a demo <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="pt-6 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[12px] text-zinc-600">© 2026 GasAgency. Built for Indian gas distributors.</p>
            <div className="flex items-center gap-5 text-[12px] text-zinc-600">
              <a href="#" className="hover:text-zinc-400 transition-colors">Privacy</a>
              <a href="#" className="hover:text-zinc-400 transition-colors">Terms</a>
              <Link href="/login" className="hover:text-zinc-400 transition-colors">Sign in</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
