import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getBranches, getBranchManagers } from "@/app/actions/branches";
import { BranchesClient } from "./BranchesClient";
import { prisma } from "@/lib/prisma";

export default async function BranchesPage() {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) redirect("/login");

  const [{ branches }, { managers }, products] = await Promise.all([
    getBranches(),
    getBranchManagers(),
    prisma.product.findMany({
      where: { agencyId: session.agencyId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <BranchesClient
      branches={JSON.parse(JSON.stringify(branches))}
      managers={managers}
      role={session.role}
      products={products}
    />
  );
}
