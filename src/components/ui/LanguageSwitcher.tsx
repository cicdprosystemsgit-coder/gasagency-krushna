"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { SUPPORTED_LOCALES, getLocale, LocaleCode } from "@/lib/locale";
import { setLocaleCookie, setGoogleTranslateCookie } from "@/app/actions/locale";
import Script from "next/script";

declare global {
  interface Window {
    googleTranslateElementInit: () => void;
    google: any;
  }
}

// Inline SVGs — no lucide-react import to avoid Turbopack ESM factory issues
function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}

// All Indian languages supported via Google Translate
const GOOGLE_TRANSLATE_LANGUAGES = [
  { code: "gu", nativeLabel: "ગુજરાતી", label: "Gujarati" },
  { code: "bn", nativeLabel: "বাংলা",   label: "Bengali"  },
  { code: "ta", nativeLabel: "தமிழ்",   label: "Tamil"    },
  { code: "te", nativeLabel: "తెలుగు",  label: "Telugu"   },
  { code: "kn", nativeLabel: "ಕನ್ನಡ",   label: "Kannada"  },
  { code: "ml", nativeLabel: "മലയാളം",  label: "Malayalam"},
  { code: "pa", nativeLabel: "ਪੰਜਾਬੀ",  label: "Punjabi"  },
  { code: "ur", nativeLabel: "اردو",    label: "Urdu"     },
];

/**
 * Reads the googtrans cookie to find which Google language is active.
 * The cookie format is: /en/<langCode>
 */
function readActiveGoogleLang(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(^|;)\s*googtrans\s*=\s*([^;]+)/);
  if (!match) return "";
  const parts = match[2].split("/");
  const lang = parts[parts.length - 1];
  return lang && lang !== "en" ? lang : "";
}

/**
 * Programmatically switch Google Translate's active language.
 * Works by manipulating the hidden <select> that the widget creates.
 */
function applyGoogleTranslate(langCode: string) {
  const doApply = () => {
    const selectEl = document.querySelector("select.goog-te-combo") as HTMLSelectElement | null;
    if (selectEl && langCode) {
      selectEl.value = langCode;
      selectEl.dispatchEvent(new Event("change"));
    }
  };

  // If widget is already loaded, apply immediately, else retry
  if ((window as any).google?.translate?.TranslateElement) {
    doApply();
  } else {
    let attempts = 0;
    const interval = setInterval(() => {
      const sel = document.querySelector("select.goog-te-combo");
      if (sel) { doApply(); clearInterval(interval); }
      if (++attempts > 20) clearInterval(interval);
    }, 250);
  }
}

export function LanguageSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeGoogleLang, setActiveGoogleLang] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  // Define the Google Translate callback BEFORE the script loads,
  // then auto-restore any previously saved Google language.
  useEffect(() => {
    // 1. Define the callback Google's script will call
    window.googleTranslateElementInit = () => {
      try {
        new window.google.translate.TranslateElement(
          { pageLanguage: "en", autoDisplay: false },
          "google_translate_element"
        );
      } catch (e) {
        // silently ignore if widget mounts more than once
      }
      // 2. Auto-apply saved Google language after widget is ready
      const savedLang = readActiveGoogleLang();
      if (savedLang) {
        setActiveGoogleLang(savedLang);
        setTimeout(() => applyGoogleTranslate(savedLang), 500);
      }
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleNativeSelect(code: LocaleCode) {
    setIsOpen(false);
    startTransition(async () => {
      if (code === "en") {
        // English: use next-intl only, clear Google Translate
        await setLocaleCookie("en");
        document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`;
        setActiveGoogleLang("");
        window.location.href = window.location.href;
      } else {
        // Hindi / Marathi: set next-intl cookie AND trigger Google Translate
        // Google Translate covers ALL pages & dynamic data that next-intl misses
        await setLocaleCookie(code);
        await setGoogleTranslateCookie(code);
        document.cookie = `googtrans=/en/${code}; path=/;`;
        document.cookie = `googtrans=/en/${code}; path=/; domain=${window.location.hostname}`;
        setActiveGoogleLang(code);
        // Apply immediately if widget is ready, otherwise reload
        const selectEl = document.querySelector("select.goog-te-combo") as HTMLSelectElement | null;
        if (selectEl) {
          applyGoogleTranslate(code);
        } else {
          window.location.href = window.location.href;
        }
      }
    });
  }

  function handleGoogleSelect(code: string) {
    setIsOpen(false);
    startTransition(async () => {
      // 1. Persist in server-readable cookie
      await setGoogleTranslateCookie(code);
      // 2. Also set client-side for immediate pickup
      document.cookie = `googtrans=/en/${code}; path=/;`;
      document.cookie = `googtrans=/en/${code}; path=/; domain=${window.location.hostname}`;
      setActiveGoogleLang(code);
      // 3. Apply without full reload if widget is ready
      applyGoogleTranslate(code);
    });
  }

  // ── Derived display state ─────────────────────────────────────────────────

  const currentLocale = getLocale();
  const activeNativeInfo = SUPPORTED_LOCALES.find((l) => l.code === currentLocale) || SUPPORTED_LOCALES[0];
  const activeGoogleInfo = GOOGLE_TRANSLATE_LANGUAGES.find((l) => l.code === activeGoogleLang);

  // For hi/mr the display label comes from the SUPPORTED_LOCALES entry
  // (Google Translate is running underneath, but the label shown is the native name)
  const activeHiMrAsGoogle = activeGoogleLang === "hi" || activeGoogleLang === "mr"
    ? SUPPORTED_LOCALES.find((l) => l.code === activeGoogleLang)
    : undefined;

  const displayLabel = activeHiMrAsGoogle
    ? activeHiMrAsGoogle.nativeLabel
    : activeGoogleInfo
      ? activeGoogleInfo.nativeLabel
      : activeNativeInfo.nativeLabel;

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Hidden Google Translate mount point */}
      <div id="google_translate_element" style={{ display: "none" }} />

      {/* Google Translate API script — loads once per page, calls googleTranslateElementInit */}
      <Script
        src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
        strategy="afterInteractive"
      />

      {/* Trigger button */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        disabled={isPending}
        className="flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[13px] font-medium transition-all duration-150 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 shadow-sm cursor-pointer select-none disabled:opacity-60"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <GlobeIcon className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
        <span className="hidden sm:inline">{displayLabel}</span>
        <ChevronDownIcon className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          className="absolute right-0 mt-1.5 w-[280px] rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 shadow-xl py-2.5 z-[9999] animate-fade-in"
          style={{ boxShadow: "0 8px 32px -4px rgba(0,0,0,0.12), 0 2px 8px -2px rgba(0,0,0,0.06)" }}
        >
          {/* Section 1 — Native + Google hybrid (EN/HI/MR) */}
          <div className="px-3 pb-2.5">
            <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">
              🔤 Indian Languages (All Pages)
            </p>
            <div className="space-y-0.5">
              {SUPPORTED_LOCALES.map((locale) => {
                // English is active when no google lang is set and locale is 'en'
                // Hindi/Marathi are active when they are the active google lang
                const isActive = locale.code === "en"
                  ? (currentLocale === "en" && !activeGoogleLang)
                  : activeGoogleLang === locale.code;
                return (
                  <button
                    key={locale.code}
                    onClick={() => handleNativeSelect(locale.code as LocaleCode)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-[13px] transition-colors cursor-pointer text-left ${
                      isActive
                        ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 font-semibold"
                        : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="text-base">{locale.flag}</span>
                      <span>{locale.nativeLabel}</span>
                      <span className="text-[11px] text-zinc-400 dark:text-zinc-500">({locale.label})</span>
                    </span>
                    {isActive && <CheckIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="mx-3 mb-2.5 h-px bg-zinc-100 dark:bg-zinc-800" />

          {/* Section 2 — Auto (Google Translate covers entire page including dynamic data) */}
          <div className="px-3">
            <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">
              🌐 Auto-Translate (All Pages)
            </p>
            <div className="grid grid-cols-2 gap-1">
              {GOOGLE_TRANSLATE_LANGUAGES.map((locale) => {
                const isActive = locale.code === activeGoogleLang;
                return (
                  <button
                    key={locale.code}
                    onClick={() => handleGoogleSelect(locale.code)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] transition-colors cursor-pointer text-left ${
                      isActive
                        ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 font-semibold"
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                    }`}
                  >
                    <span className="truncate">{locale.nativeLabel}</span>
                    {isActive && <CheckIcon className="w-3 h-3 text-blue-600 dark:text-blue-400 flex-shrink-0 ml-auto" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer hint */}
          <p className="mt-2.5 mx-3 text-[10px] text-zinc-400 dark:text-zinc-500 leading-snug border-t border-zinc-100 dark:border-zinc-800 pt-2">
            Auto-translate covers all pages & dynamic data via Google Translate.
          </p>
        </div>
      )}
    </div>
  );
}
