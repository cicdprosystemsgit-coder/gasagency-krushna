import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Users } from "lucide-react";
import { CustomerManagementClient } from "@/app/(dashboard)/admin/customer-management/CustomerManagementClient";

export default async function StaffCustomerManagementPage() {
  const session = await getSession();
  if (!session || session.role !== "STAFF" || !session.agencyId)
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
