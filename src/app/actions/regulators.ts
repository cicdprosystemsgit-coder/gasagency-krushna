"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function getRegulatorRecords() {
  const session = await getSession();
  if (!session || !session.agencyId) return [];

  const records = await prisma.regulatorRecord.findMany({
    where: { agencyId: session.agencyId },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
          customerCode: true,
          type: true,
        },
      },
      officeTransaction: {
        select: {
          id: true,
          date: true,
          amount: true,
          paymentMode: true,
          type: true,
          addedBy: { select: { name: true } },
        },
      },
      replacedBy: {
        select: {
          id: true,
          regulatorNo: true,
          issuedAt: true,
        },
      },
      replaces: {
        select: {
          id: true,
          regulatorNo: true,
          issuedAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return records;
}
