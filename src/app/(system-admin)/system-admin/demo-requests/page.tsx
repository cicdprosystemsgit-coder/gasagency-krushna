import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PhoneCall } from "lucide-react";
import { DemoRequestsClient } from "./DemoRequestsClient";

export default async function DemoRequestsPage() {
  const session = await getSession();
  if (!session || session.role !== "SYSTEM_ADMIN") redirect("/login");

  const requests = await prisma.demoRequest.findMany({
    orderBy: { createdAt: "desc" },
  });

  const newCount = requests.filter((r) => r.status === "NEW").length;
  const total = requests.length;

  const serialised = requests.map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    email: r.email,
    status: r.status,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, background: "#EFF6FF",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <PhoneCall style={{ width: 18, height: 18, color: "#2563EB" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 17, fontWeight: 700, color: "#0F172A", letterSpacing: "-0.02em" }}>
              Demo Requests
            </h1>
            <p style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
              {total} total · {newCount} new &amp; awaiting action
            </p>
          </div>
        </div>

        {/* Summary chips */}
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { label: "New",       count: requests.filter((r) => r.status === "NEW").length,       bg: "#EFF6FF", color: "#2563EB" },
            { label: "Contacted", count: requests.filter((r) => r.status === "CONTACTED").length, bg: "#FFFBEB", color: "#B45309" },
            { label: "Scheduled", count: requests.filter((r) => r.status === "SCHEDULED").length, bg: "#F5F3FF", color: "#7C3AED" },
            { label: "Resolved",  count: requests.filter((r) => r.status === "RESOLVED").length,  bg: "#F0FDF4", color: "#15803D" },
          ].map((s) => (
            <div key={s.label} style={{
              padding: "6px 12px", borderRadius: 8,
              background: s.bg, border: `1px solid ${s.bg}`,
              textAlign: "center",
            }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.count}</p>
              <p style={{ fontSize: 10, color: s.color, opacity: 0.8, marginTop: 2, fontWeight: 600 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <DemoRequestsClient initialRequests={serialised} />
    </div>
  );
}
