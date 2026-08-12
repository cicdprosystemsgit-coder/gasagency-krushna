import { getSessionWithFeatures, requireFeature } from "@/lib/feature-gate";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Users } from "lucide-react";
import { CustomerManagementClient } from "@/app/(dashboard)/admin/customer-management/CustomerManagementClient";

export default async function ManagerCustomerManagementPage() {
  const session = await getSessionWithFeatures();
  if (!session || session.role !== "MANAGER" || !session.agencyId)
    redirect("/login");

  const customers = await prisma.customer.findMany({
    where: { agencyId: session.agencyId },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  const serialized = customers.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
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
        canDelete={false}
      />
    </div>
  );
}