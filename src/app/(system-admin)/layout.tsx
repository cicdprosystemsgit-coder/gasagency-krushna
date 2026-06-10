"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { SystemAdminSidebar } from "@/components/layout/SystemAdminSidebar";

interface Session {
  userId: string;
  email: string;
  name: string;
  role: string;
}

export default function SystemAdminLayout({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [newDemoCount, setNewDemoCount] = useState(0);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/session")
      .then((r) => r.json())
      .then((data) => {
        if (!data || data.role !== "SYSTEM_ADMIN") {
          router.replace("/login");
        } else {
          setSession(data);
          setLoading(false);
        }
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  // Refresh demo count whenever the path changes (catches status updates too)
  useEffect(() => {
    if (!session) return;
    fetch("/api/demo-count")
      .then((r) => r.json())
      .then((d) => setNewDemoCount(d.count ?? 0))
      .catch(() => {});
  }, [session, pathname]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0F172A" }}>
        <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid #6366F1", borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F8FAFC" }}>
      <SystemAdminSidebar name={session!.name} newDemoCount={newDemoCount} />
      <main style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
        {children}
      </main>
    </div>
  );
}
