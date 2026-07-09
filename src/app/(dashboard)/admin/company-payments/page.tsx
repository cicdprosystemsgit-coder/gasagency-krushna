import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Building2 } from "lucide-react";
import { CompanyPaymentsClient } from "./CompanyPaymentsClient";

export default async function CompanyPaymentsPage() {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    redirect("/login");
  }

  const [payments, products] = await Promise.all([
    prisma.companyPayment.findMany({
      where: { agencyId: session.agencyId },
      orderBy: { date: "desc" },
      include: {
        product: { select: { name: true } },
        addedBy: { select: { name: true } },
      },
    }),
    prisma.product.findMany({
      where: { agencyId: session.agencyId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Company Payments"
        subtitle="Track direct bank transfers to oil companies for cylinder stock purchases"
        icon={<Building2 className="w-5 h-5" />}
      />
      <CompanyPaymentsClient
        initialPayments={payments as any}
        products={products}
        canEdit={session.role === "ADMIN"}
        userId={session.userId}
      />
    </div>
  );
}
