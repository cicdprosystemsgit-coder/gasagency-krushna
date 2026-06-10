import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Boxes, Package } from "lucide-react";
import { InventoryClient } from "./InventoryClient";
import { OfficeInventorySection } from "@/components/ui/OfficeInventorySection";

export default async function InventoryPage() {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role)) redirect("/login");

  const isAdmin = session.role === "ADMIN";

  const [products, godownMovements] = await Promise.all([
    prisma.product.findMany({
      where: { agencyId: session.agencyId!, isActive: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.godownInventory.findMany({
      where: { agencyId: session.agencyId!, product: { is: { isCylinder: false } } },
      orderBy: { date: "desc" },
      include: {
        product: { select: { id: true, name: true } },
        recordedBy: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Management"
        subtitle={isAdmin ? "Add, edit and delete products · View stock received from godown" : "View product catalog and godown stock"}
        icon={<Boxes className="w-5 h-5" />}
      />

      {/* ── Product Catalog section ── */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #E4E4E7", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        {/* Section header */}
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid #F4F4F5", background: "#FAFAFA" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#EFF6FF" }}>
            <Package className="w-4 h-4" style={{ color: "#2563EB" }} />
          </div>
          <div>
            <p className="text-[14px] font-semibold" style={{ color: "#18181B" }}>Product Catalog</p>
            <p className="text-[12px]" style={{ color: "#71717A" }}>
              {isAdmin ? "Add, edit, or remove products from your agency catalog" : "View your product catalog and pricing"}
            </p>
          </div>
        </div>
        <div className="p-5">
          <InventoryClient initialProducts={products} isAdmin={isAdmin} />
        </div>
      </div>

      {/* ── Godown stock received section ── */}
      <OfficeInventorySection movements={godownMovements as Parameters<typeof OfficeInventorySection>[0]["movements"]} />
    </div>
  );
}
