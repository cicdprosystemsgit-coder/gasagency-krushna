"use client";

import { useActionState } from "react";
import { submitDemoRequest, DemoState } from "@/app/actions/demo";
import { CheckCircle2, Loader2, Phone, Mail, User } from "lucide-react";

const initial: DemoState = {};

export default function BookDemoForm() {
  const [state, action, pending] = useActionState(submitDemoRequest, initial);

  if (state.success) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-green-600" />
        </div>
        <h3 className="text-[20px] font-bold text-zinc-900">Request received!</h3>
        <p className="text-[15px] text-zinc-500 max-w-xs leading-relaxed">
          Our team will contact you within{" "}
          <span className="font-semibold text-blue-600">48 hours</span> to schedule your demo.
        </p>
        <p className="text-[12px] text-zinc-400">Check your email for a confirmation.</p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      {/* Name */}
      <div>
        <label className="block text-[12px] font-semibold text-zinc-700 mb-1.5 uppercase tracking-wide">
          Your Name
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            name="name"
            type="text"
            placeholder="Rajesh Kumar"
            required
            suppressHydrationWarning
            className="w-full pl-10 pr-4 py-2.5 border border-zinc-300 rounded-lg text-[14px] text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>
      </div>

      {/* Phone */}
      <div>
        <label className="block text-[12px] font-semibold text-zinc-700 mb-1.5 uppercase tracking-wide">
          Mobile Number
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            name="phone"
            type="tel"
            placeholder="9876543210"
            required
            maxLength={13}
            suppressHydrationWarning
            className="w-full pl-10 pr-4 py-2.5 border border-zinc-300 rounded-lg text-[14px] text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="block text-[12px] font-semibold text-zinc-700 mb-1.5 uppercase tracking-wide">
          Email Address
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            name="email"
            type="email"
            placeholder="rajesh@youragency.com"
            required
            suppressHydrationWarning
            className="w-full pl-10 pr-4 py-2.5 border border-zinc-300 rounded-lg text-[14px] text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>
      </div>

      {state.error && (
        <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        suppressHydrationWarning
        className="mt-1 flex items-center justify-center gap-2 w-full py-3 bg-blue-600 text-white text-[14px] font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors shadow-sm"
      >
        {pending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
          </>
        ) : (
          "Book a Free Demo"
        )}
      </button>

      <p className="text-center text-[11px] text-zinc-400">
        No credit card required. Our team contacts you within 48 hours.
      </p>
    </form>
  );
}
