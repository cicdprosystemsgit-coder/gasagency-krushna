"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { generateInvoiceNo } from "@/lib/utils";

export async function createGstInvoice(formData: FormData) {
  const session = await getSession();
  if (!session || !session.agencyId) return { error: "Unauthorized" };

  const customerId = formData.get("customerId") as string;
  if (!customerId) return { error: "Customer required" };

  const items = JSON.parse(formData.get("items") as string);
  if (!items?.length) return { error: "At least one item required" };

  const invoice = await prisma.gstInvoice.create({
    data: {
      invoiceNo: generateInvoiceNo(),
      customerId,
      date: new Date(formData.get("date") as string),
      items,
      subtotal: Number(formData.get("subtotal")),
      gstAmount: Number(formData.get("gstAmount")),
      total: Number(formData.get("total")),
      agencyId: session.agencyId,
      status: "PENDING",
    },
  });
  return { invoice };
}
