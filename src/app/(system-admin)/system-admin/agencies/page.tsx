import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Plus, Circle } from "lucide-react";
import { AgenciesClient } from "./AgenciesClient";

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  ACTIVE:    { bg: "#DCFCE7", color: "#15803D", label: "Active" },
  INACTIVE:  { bg: "#F4F4F5", color: "#52525B", label: "Inactive" },
  SUSPENDED: { bg: "#FEE2E2", color: "#DC2626", label: "Suspended" },
};

export default async function AgenciesPage() {
  const session = await getSession();
  if (!session || session.role !== "SYSTEM_ADMIN") redirect("/login");

  const agencies = await prisma.agency.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { users: true } },
    },
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 17, fontWeight: 700, color: "#0F172A", letterSpacing: "-0.02em" }}>Agencies</h1>
          <p style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>{agencies.length} agencies onboarded</p>
        </div>
        <Link
          href="/system-admin/agencies/new"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500,
            background: "#6366F1", color: "#fff", textDecoration: "none",
          }}
        >
          <Plus style={{ width: 14, height: 14 }} />
          Onboard Agency
        </Link>
      </div>

      <AgenciesClient initialAgencies={agencies.map((a) => ({
        id: a.id,
        name: a.name,
        ownerName: a.ownerName,
        email: a.email,
        phone: a.phone,
        city: a.city,
        state: a.state,
        oilCompany: a.oilCompany,
        plan: a.plan,
        status: a.status as string,
        userCount: a._count.users,
        createdAt: a.createdAt.toISOString(),
      }))} />
    </div>
  );
}
