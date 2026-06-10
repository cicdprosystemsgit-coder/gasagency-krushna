import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { FileText } from "lucide-react";
import { GstInvoicingClient } from "@/app/(dashboard)/staff/gst-invoicing/GstInvoicingClient";

export default async function AdminGstInvoicingPage() {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) redirect("/login");

  const [invoices, customers, products, agency] = await Promise.all([
    prisma.gstInvoice.findMany({
      where: { agencyId: session.agencyId },
      orderBy: { date: "desc" },
      take: 100,
    }),
    prisma.customer.findMany({
      where: { isActive: true, agencyId: session.agencyId },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { isActive: true, agencyId: session.agencyId },
      orderBy: { name: "asc" },
    }),
    prisma.agency.findUnique({ where: { id: session.agencyId } }),
  ]);

  const agencyInfo = {
    name:    agency?.name    ?? "",
    address: agency?.address ?? "",
    city:    agency?.city    ?? "",
    state:   agency?.state   ?? "",
    phone:   agency?.phone   ?? "",
    gstin:   agency?.gstin   ?? "",
  };

  return (
    <div>
      <PageHeader
        title="GST Invoicing"
        subtitle="Generate and manage GST invoices for commercial customers"
        icon={<FileText className="w-5 h-5" />}
      />
      <GstInvoicingClient
        initialInvoices={invoices}
        customers={customers}
        products={products}
        agencyInfo={agencyInfo}
      />
    </div>
  );
}
