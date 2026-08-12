import { getSessionWithFeatures, requireFeature } from "@/lib/feature-gate";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ComplaintsClient } from "./ComplaintsClient";

export default async function ComplaintsPage() {
  const session = await getSessionWithFeatures();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) redirect("/login");
  requireFeature(session, "complaints");

  const complaints = await prisma.customerComplaint.findMany({
    where: { agencyId: session.agencyId },
    include: {
      customer: { select: { name: true, phone: true, customerCode: true } },
      resolvedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <ComplaintsClient
      complaints={JSON.parse(JSON.stringify(complaints))}
      role={session.role}
      userId={session.userId}
    />
  );
}