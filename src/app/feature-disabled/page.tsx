import Link from "next/link";
import { ShieldOff, ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function FeatureDisabledPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const back =
    session.role === "ADMIN" ? "/admin" :
    session.role === "MANAGER" ? "/manager" :
    session.role === "GODOWN_KEEPER" ? "/godown-keeper" :
    session.role === "STAFF" ? "/staff" :
    session.role === "DELIVERY_BOY" ? "/delivery-boy" : "/";

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--color-bg, #F8FAFC)",
    }}>
      <div style={{
        maxWidth: 420, width: "100%", textAlign: "center",
        background: "#fff", border: "1px solid #E2E8F0",
        borderRadius: 16, padding: "48px 40px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
      }}>
        {/* Icon */}
        <div style={{
          width: 64, height: 64, borderRadius: "50%",
          background: "#FFF1F2", display: "flex", alignItems: "center",
          justifyContent: "center", margin: "0 auto 20px",
        }}>
          <ShieldOff style={{ width: 30, height: 30, color: "#E11D48" }} />
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>
          Feature Not Enabled
        </h1>
        <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.6, marginBottom: 28 }}>
          This module is not included in your agency&apos;s plan or has not been
          enabled by your system administrator. Contact your admin to request access.
        </p>

        <Link
          href={back}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "10px 24px", borderRadius: 8, fontSize: 14, fontWeight: 600,
            background: "#6366F1", color: "#fff", textDecoration: "none",
          }}
        >
          <ArrowLeft style={{ width: 16, height: 16 }} />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
