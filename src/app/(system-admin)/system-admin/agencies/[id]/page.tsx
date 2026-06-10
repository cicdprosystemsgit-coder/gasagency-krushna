import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { ChevronLeft, Building2, Circle } from "lucide-react";
import { AgencyDetailClient } from "./AgencyDetailClient";

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  ACTIVE:    { bg: "#DCFCE7", color: "#15803D", label: "Active" },
  INACTIVE:  { bg: "#F4F4F5", color: "#52525B", label: "Inactive" },
  SUSPENDED: { bg: "#FEE2E2", color: "#DC2626", label: "Suspended" },
};

const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
  ADMIN:         { bg: "#DBEAFE", color: "#1D4ED8" },
  MANAGER:       { bg: "#D1FAE5", color: "#065F46" },
  GODOWN_KEEPER: { bg: "#EDE9FE", color: "#5B21B6" },
  STAFF:         { bg: "#FEF3C7", color: "#92400E" },
  DELIVERY_BOY:  { bg: "#FEE2E2", color: "#991B1B" },
};

export default async function AgencyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session || session.role !== "SYSTEM_ADMIN") redirect("/login");

  const agency = await prisma.agency.findUnique({
    where: { id },
    include: {
      users: { orderBy: { createdAt: "asc" } },
      _count: {
        select: {
          godownRecords: true, deliveryRecords: true,
          commercialSales: true, officeTransactions: true,
          customers: true, products: true,
        },
      },
    },
  });

  if (!agency) notFound();

  const s = STATUS_STYLE[agency.status] ?? STATUS_STYLE.INACTIVE;

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <Link href="/system-admin/agencies" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "#6366F1", textDecoration: "none" }}>
          <ChevronLeft style={{ width: 14, height: 14 }} /> Agencies
        </Link>
        <span style={{ color: "#CBD5E1" }}>/</span>
        <span style={{ fontSize: 13, color: "#64748B" }}>{agency.name}</span>
      </div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#6366F1" }}>
            {agency.name.charAt(0)}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A" }}>{agency.name}</h1>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 500, background: s.bg, color: s.color, padding: "2px 9px", borderRadius: 999 }}>
                <Circle style={{ width: 5, height: 5, fill: s.color, stroke: "none" }} />
                {s.label}
              </span>
            </div>
            <p style={{ fontSize: 13, color: "#64748B" }}>{agency.email} · {agency.phone} · {agency.city}, {agency.state}</p>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>
        {/* Main column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {[
              { label: "Users",          value: agency.users.length },
              { label: "Customers",      value: agency._count.customers },
              { label: "Products",       value: agency._count.products },
              { label: "Deliveries",     value: agency._count.deliveryRecords },
              { label: "Comm. Sales",    value: agency._count.commercialSales },
              { label: "Godown Records", value: agency._count.godownRecords },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, padding: "12px 16px", textAlign: "center" }}>
                <p style={{ fontSize: 22, fontWeight: 700, color: "#0F172A" }}>{value}</p>
                <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Users table */}
          <AgencyDetailClient
            agencyId={agency.id}
            initialUsers={agency.users.map((u) => ({
              id: u.id, name: u.name, email: u.email,
              phone: u.phone, role: u.role as string,
              isActive: u.isActive, createdAt: u.createdAt.toISOString(),
            }))}
            initialEnabledFeatures={agency.enabledFeatures}
          />
        </div>

        {/* Info panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, padding: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 14 }}>Agency Details</p>
            {[
              { label: "Owner", value: agency.ownerName },
              { label: "Oil Company", value: agency.oilCompany || "—" },
              { label: "Distributor Code", value: agency.distributorCode || "—" },
              { label: "License No.", value: agency.licenseNo || "—" },
              { label: "GSTIN", value: agency.gstin || "—" },
              { label: "Plan", value: agency.plan.toUpperCase() },
              { label: "Onboarded", value: formatDate(agency.createdAt) },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #F8FAFC" }}>
                <p style={{ fontSize: 12, color: "#94A3B8" }}>{label}</p>
                <p style={{ fontSize: 12, fontWeight: 500, color: "#0F172A" }}>{value}</p>
              </div>
            ))}
            {agency.notes && (
              <div style={{ marginTop: 12, padding: "10px 12px", background: "#F8FAFC", borderRadius: 6 }}>
                <p style={{ fontSize: 11, color: "#94A3B8", marginBottom: 4 }}>Notes</p>
                <p style={{ fontSize: 12, color: "#475569" }}>{agency.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
