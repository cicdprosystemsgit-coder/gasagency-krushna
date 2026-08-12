import { getSessionWithFeatures, requireFeature } from "@/lib/feature-gate";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PaymentReceiptsClient } from "./PaymentReceiptsClient";

export default async function PaymentReceiptsPage() {
  const session = await getSessionWithFeatures();
  if (!session || !["ADMIN", "MANAGER", "STAFF"].includes(session.role) || !session.agencyId) {
    redirect("/login");
  }

  const [receipts, customers] = await Promise.all([
    prisma.paymentReceipt.findMany({
      where: { agencyId: session.agencyId },
      include: {
        customer: { select: { name: true, phone: true } },
        collectedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.customer.findMany({
      where: { agencyId: session.agencyId, isActive: true },
      select: { id: true, name: true, phone: true, customerCode: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <PaymentReceiptsClient
      receipts={JSON.parse(JSON.stringify(receipts))}
      customers={customers}
      role={session.role}
    />
  );
}