import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { GodownInventoryClient } from "./GodownInventoryClient";

export default async function GodownInventoryPage() {
  const session = await getSession();
  if (!session || session.role !== "GODOWN_KEEPER" || !session.agencyId) redirect("/login");

  const [movements, products] = await Promise.all([
    prisma.godownInventory.findMany({
      where: { agencyId: session.agencyId, product: { is: { isCylinder: false } } },
      orderBy: { date: "desc" },
      include: {
        product: { select: { id: true, name: true } },
        recordedBy: { select: { name: true } },
      },
    }),
    prisma.product.findMany({
      where: { agencyId: session.agencyId, isActive: true, isCylinder: false },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <GodownInventoryClient
      initialMovements={movements as Parameters<typeof GodownInventoryClient>[0]["initialMovements"]}
      products={products}
      userId={session.userId}
    />
  );
}
