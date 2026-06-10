"use client";

import { useState, useEffect, useRef, useTransition } from "react";
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
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keyboard shortcut: Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return; }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results ?? []);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 280);
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    router.push(result.href);
    setOpen(false);
    setQuery("");
    setResults([]);
  };

  const recentSearches = typeof window !== "undefined"
    ? JSON.parse(localStorage.getItem("ga_recent_searches") ?? "[]") as string[]
    : [];

  const saveRecent = (q: string) => {
    const prev = JSON.parse(localStorage.getItem("ga_recent_searches") ?? "[]") as string[];
    const updated = [q, ...prev.filter((s) => s !== q)].slice(0, 5);
    localStorage.setItem("ga_recent_searches", JSON.stringify(updated));
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] transition-colors"
        style={{ background: "#F4F4F5", color: "#71717A", border: "1px solid #E4E4E7" }}
      >
        <Search className="w-3.5 h-3.5" />
        <span className="hidden sm:block">Search…</span>
        <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#E4E4E7", color: "#71717A" }}>
          ⌘K
        </kbd>
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg mx-4 rounded-xl overflow-hidden shadow-2xl"
            style={{ background: "#FFFFFF", border: "1px solid #E4E4E7" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: "1px solid #F4F4F5" }}>
              <Search className="w-4 h-4 flex-shrink-0" style={{ color: "#A1A1AA" }} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search customers, employees, invoices…"
                className="flex-1 text-[14px] outline-none bg-transparent"
                style={{ color: "#18181B" }}
                autoComplete="off"
              />
              {query && (
                <button onClick={() => { setQuery(""); setResults([]); }}>
                  <X className="w-4 h-4" style={{ color: "#A1A1AA" }} />
                </button>
              )}
            </div>

            {/* Results */}
            <div className="max-h-[400px] overflow-y-auto">
              {loading && (
                <div className="px-4 py-8 text-center text-[13px]" style={{ color: "#A1A1AA" }}>
                  Searching…
                </div>
              )}

              {!loading && query.length >= 2 && results.length === 0 && (
                <div className="px-4 py-8 text-center text-[13px]" style={{ color: "#A1A1AA" }}>
                  No results for <strong>"{query}"</strong>
                </div>
              )}

              {!loading && results.length > 0 && (
                <div className="py-2">
                  {results.map((r) => (
                    <button
                      key={`${r.type}-${r.id}`}
                      onClick={() => { saveRecent(query); handleSelect(r); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-zinc-50"
                    >
                      <div
                        className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{ background: (TYPE_COLORS[r.type] ?? "#6B7280") + "15", color: TYPE_COLORS[r.type] ?? "#6B7280" }}
                      >
                        {TYPE_ICONS[r.type] ?? <Search className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate" style={{ color: "#18181B" }}>{r.title}</p>
                        <p className="text-[11px] truncate" style={{ color: "#A1A1AA" }}>{r.subtitle}</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#E4E4E7" }} />
                    </button>
                  ))}
                </div>
              )}

              {!loading && !query && recentSearches.length > 0 && (
                <div className="py-2">
                  <p className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#A1A1AA" }}>Recent</p>
                  {recentSearches.map((s) => (
                    <button
                      key={s}
                      onClick={() => setQuery(s)}
                      className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-zinc-50"
                    >
                      <Search className="w-3.5 h-3.5" style={{ color: "#A1A1AA" }} />
                      <span className="text-[13px]" style={{ color: "#52525B" }}>{s}</span>
                    </button>
                  ))}
                </div>
              )}

              {!loading && !query && recentSearches.length === 0 && (
                <div className="px-4 py-8 text-center text-[13px]" style={{ color: "#A1A1AA" }}>
                  Type to search across your agency data
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-4 px-4 py-2.5 text-[11px]" style={{ borderTop: "1px solid #F4F4F5", color: "#A1A1AA" }}>
              <span><kbd className="font-mono">↑↓</kbd> navigate</span>
              <span><kbd className="font-mono">↵</kbd> select</span>
              <span><kbd className="font-mono">Esc</kbd> close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
