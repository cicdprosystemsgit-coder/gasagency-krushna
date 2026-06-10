import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Boxes } from "lucide-react";
import { OfficeInventorySection } from "@/components/ui/OfficeInventorySection";

export default async function StaffInventoryPage() {
  const session = await getSession();
  if (!session || session.role !== "STAFF" || !session.agencyId) redirect("/login");

  const godownMovements = await prisma.godownInventory.findMany({
    where: { agencyId: session.agencyId, product: { is: { isCylinder: false } } },
    orderBy: { date: "desc" },
    include: {
      product: { select: { id: true, name: true } },
      recordedBy: { select: { name: true } },
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Office Stock"
        subtitle="Products received from the godown for office use"
        icon={<Boxes className="w-5 h-5" />}
      />
      <OfficeInventorySection movements={godownMovements as Parameters<typeof OfficeInventorySection>[0]["movements"]} />
    </div>
  );
}
