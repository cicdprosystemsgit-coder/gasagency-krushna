import { getSessionWithFeatures, requireFeature } from "@/lib/feature-gate";
import { redirect } from "next/navigation";
import { getDocuments, getExpiringDocuments } from "@/app/actions/documents";
import { prisma } from "@/lib/prisma";
import { DocumentsPageClient } from "./DocumentsPageClient";

export default async function DocumentsPage() {
  const session = await getSessionWithFeatures();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    redirect("/login");
  }

  const [docsResult, expiringResult, employees, vehicles] = await Promise.all([
    getDocuments(),
    getExpiringDocuments(),
    prisma.user.findMany({
      where: { agencyId: session.agencyId, isActive: true, role: { not: "SYSTEM_ADMIN" } },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
    prisma.deliveryVehicle.findMany({
      where: { agencyId: session.agencyId },
      select: { id: true, vehicleNo: true, vehicleName: true },
      orderBy: { vehicleNo: "asc" },
    }),
  ]);

  return (
    <DocumentsPageClient
      docs={docsResult.docs as never[]}
      expiringDocs={expiringResult.docs as never[]}
      employees={employees}
      vehicles={vehicles}
      role={session.role}
    />
  );
}