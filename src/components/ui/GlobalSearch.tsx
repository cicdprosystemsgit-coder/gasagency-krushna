"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, ArrowRight, Users, Truck, FileText, Receipt } from "lucide-react";
import { useRouter } from "next/navigation";

type SearchResult = {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  customer: <Users className="w-3.5 h-3.5" />,
  employee: <Users className="w-3.5 h-3.5" />,
  invoice: <FileText className="w-3.5 h-3.5" />,
  transaction: <Receipt className="w-3.5 h-3.5" />,
  delivery: <Truck className="w-3.5 h-3.5" />,
};

const TYPE_COLORS: Record<string, string> = {
  customer: "#2563EB",
  employee: "#7C3AED",
  invoice: "#16A34A",
  transaction: "#D97706",
  delivery: "#0891B2",
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [mobileFocused, setMobileFocused] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const mobileContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keyboard shortcut: Ctrl+K (desktop)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") {
        setOpen(false);
        setMobileFocused(false);
        mobileInputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Close mobile inline dropdown when tapping outside
  useEffect(() => {
    if (!mobileFocused) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (
        mobileContainerRef.current &&
        !mobileContainerRef.current.contains(e.target as Node)
      ) {
        setMobileFocused(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [mobileFocused]);

  useEffect(() => {
    if (!query || query.length < 2) {
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);
  }, [query]);

  const displayedResults = query.length >= 2 ? results : [];

  const handleSelect = (result: SearchResult) => {
    router.push(result.href);
    setOpen(false);
    setMobileFocused(false);
    mobileInputRef.current?.blur();
    setQuery("");
    setResults([]);
  };

  const recentSearches =
    typeof window !== "undefined"
      ? (JSON.parse(localStorage.getItem("ga_recent_searches") ?? "[]") as string[])
      : [];

  const saveRecent = (q: string) => {
    const prev = JSON.parse(
      localStorage.getItem("ga_recent_searches") ?? "[]"
    ) as string[];
    const updated = [q, ...prev.filter((s) => s !== q)].slice(0, 5);
    localStorage.setItem("ga_recent_searches", JSON.stringify(updated));
  };

  const renderResultsList = () => (
    <div className="max-h-[55vh] sm:max-h-[400px] overflow-y-auto">
      {loading && (
        <div className="px-4 py-6 text-center text-[13px] text-zinc-400">
          Searching…
        </div>
      )}

      {!loading && query.length >= 2 && displayedResults.length === 0 && (
        <div className="px-4 py-6 text-center text-[13px] text-zinc-400">
          No results for <strong>&ldquo;{query}&rdquo;</strong>
        </div>
      )}

      {!loading && displayedResults.length > 0 && (
        <div className="py-1.5">
          {displayedResults.map((r) => (
            <button
              key={`${r.type}-${r.id}`}
              type="button"
              onClick={() => {
                saveRecent(query);
                handleSelect(r);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60 active:bg-zinc-100 touch-manipulation"
            >
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                style={{
                  background: (TYPE_COLORS[r.type] ?? "#6B7280") + "15",
                  color: TYPE_COLORS[r.type] ?? "#6B7280",
                }}
              >
                {TYPE_ICONS[r.type] ?? <Search className="w-3.5 h-3.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate text-zinc-900 dark:text-zinc-100">
                  {r.title}
                </p>
                <p className="text-[11px] truncate text-zinc-400">{r.subtitle}</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 flex-shrink-0 text-zinc-300 dark:text-zinc-600" />
            </button>
          ))}
        </div>
      )}

      {!loading && !query && recentSearches.length > 0 && (
        <div className="py-1.5">
          <p className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            Recent
          </p>
          {recentSearches.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setQuery(s)}
              className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/60 touch-manipulation"
            >
              <Search className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-[13px] text-zinc-600 dark:text-zinc-300">
                {s}
              </span>
            </button>
          ))}
        </div>
      )}

      {!loading && !query && recentSearches.length === 0 && (
        <div className="px-4 py-6 text-center text-[13px] text-zinc-400">
          Type to search across your agency data
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile Inline Search: No popup modal — tapping focuses input & opens keyboard directly */}
      <div ref={mobileContainerRef} className="sm:hidden relative w-full">
        <div className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/30 transition-all">
          <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <input
            ref={mobileInputRef}
            type="search"
            inputMode="search"
            enterKeyHint="search"
            value={query}
            onFocus={() => setMobileFocused(true)}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            aria-label="Search"
            className="w-full min-w-0 text-[13px] outline-none bg-transparent text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setResults([]);
                mobileInputRef.current?.focus();
              }}
              className="p-0.5 text-zinc-400 hover:text-zinc-600 shrink-0 touch-manipulation"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Inline Results Dropdown below Navbar (no modal popup) */}
        {mobileFocused && (query.length >= 2 || recentSearches.length > 0) && (
          <div
            className="fixed left-2 right-2 top-[calc(var(--app-header-height,52px)+4px)] z-50 rounded-xl overflow-hidden shadow-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
          >
            {renderResultsList()}
          </div>
        )}
      </div>

      {/* Desktop Trigger button */}
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] transition-colors bg-zinc-100 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 cursor-pointer"
      >
        <Search className="w-3.5 h-3.5" />
        <span>Search…</span>
        <kbd className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
          ⌘K
        </kbd>
      </button>

      {/* Desktop Modal overlay */}
      {open && (
        <div
          className="hidden sm:flex fixed inset-0 z-50 items-start justify-center pt-[12vh]"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg mx-4 rounded-xl overflow-hidden shadow-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-100 dark:border-zinc-800">
              <Search className="w-4 h-4 flex-shrink-0 text-zinc-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search customers, employees, invoices…"
                className="flex-1 text-[14px] outline-none bg-transparent text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                autoComplete="off"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setResults([]);
                  }}
                >
                  <X className="w-4 h-4 text-zinc-400" />
                </button>
              )}
            </div>

            {renderResultsList()}

            {/* Footer */}
            <div className="flex items-center gap-4 px-4 py-2.5 text-[11px] border-t border-zinc-100 dark:border-zinc-800 text-zinc-400">
              <span>
                <kbd className="font-mono">↑↓</kbd> navigate
              </span>
              <span>
                <kbd className="font-mono">↵</kbd> select
              </span>
              <span>
                <kbd className="font-mono">Esc</kbd> close
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
