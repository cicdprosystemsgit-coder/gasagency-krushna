import { getSessionWithFeatures } from "@/lib/feature-gate";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Users } from "lucide-react";
import { CustomerManagementClient } from "./CustomerManagementClient";

export default async function AdminCustomerManagementPage() {
  const session = await getSessionWithFeatures();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId)
    redirect("/login");

  const [customers, domesticCount, commercialCount, activeCount, inactiveCount, deletedCount] = await Promise.all([
    prisma.customer.findMany({
      where: { agencyId: session.agencyId, type: "DOMESTIC", isDeleted: false },
      orderBy: { name: "asc" },
      take: 50,
    }),
    prisma.customer.count({ where: { agencyId: session.agencyId, type: "DOMESTIC", isDeleted: false } }),
    prisma.customer.count({ where: { agencyId: session.agencyId, type: "COMMERCIAL", isDeleted: false } }),
    prisma.customer.count({ where: { agencyId: session.agencyId, isActive: true, isDeleted: false } }),
    prisma.customer.count({ where: { agencyId: session.agencyId, isActive: false, isDeleted: false } }),
    prisma.customer.count({ where: { agencyId: session.agencyId, isDeleted: true } }),
  ]);

  const serialized = customers.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    deletedAt: c.deletedAt ? c.deletedAt.toISOString() : null,
    updatedAt: undefined,
  }));

  return (
    <div>
      <PageHeader
        title="Customer Management"
        subtitle="Register and manage regular (domestic) and commercial customers"
        icon={<Users className="w-5 h-5" />}
      />
      <CustomerManagementClient
        initialCustomers={serialized as Parameters<typeof CustomerManagementClient>[0]["initialCustomers"]}
        canDelete={session.role === "ADMIN"}
        initialCounts={{
          domestic: domesticCount,
          commercial: commercialCount,
          active: activeCount,
          inactive: inactiveCount,
          deleted: deletedCount,
        }}
      />
    </div>
  );
}