"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ── WhatsApp message via Meta Cloud API ────────────────────────────────────
async function sendWhatsAppMessage(
  phoneNumberId: string,
  apiToken: string,
  to: string,
  text: string
): Promise<{ success: boolean; error?: string }> {
  const phone = to.replace(/\D/g, "");
  const formattedPhone = phone.startsWith("91") ? phone : `91${phone}`;

  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: formattedPhone,
          type: "text",
          text: { body: text },
        }),
      }
    );
    if (!res.ok) {
      const err = await res.json();
      return { success: false, error: JSON.stringify(err) };
    }
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message };
  }
}

// ── Send any text message ──────────────────────────────────────────────────
export async function sendWhatsApp(data: {
  recipientPhone: string;
  message: string;
  type: string;
}) {
  const session = await getSession();
  if (!session || !session.agencyId) return { error: "Unauthorized" };

  const agency = await prisma.agency.findUnique({
    where: { id: session.agencyId },
    select: { whatsappApiKey: true },
  });

  if (!agency?.whatsappApiKey) {
    return { error: "WhatsApp API not configured for this agency. Please set it in Agency Settings." };
  }

  // Expected format: "PHONE_NUMBER_ID:ACCESS_TOKEN"
  const [phoneNumberId, ...tokenParts] = agency.whatsappApiKey.split(":");
  const apiToken = tokenParts.join(":");

  if (!phoneNumberId || !apiToken) {
    return { error: "Invalid WhatsApp API key format. Expected: PHONE_NUMBER_ID:ACCESS_TOKEN" };
  }

  const result = await sendWhatsAppMessage(
    phoneNumberId,
    apiToken,
    data.recipientPhone,
    data.message
  );

  // Log the message regardless of success/failure
  await prisma.messageLog.create({
    data: {
      agencyId: session.agencyId,
      recipient: data.recipientPhone,
      type: data.type,
      channel: "WHATSAPP",
      status: result.success ? "SENT" : "FAILED",
      payload: { message: data.message },
      errorMsg: result.error ?? null,
    },
  });

  return result.success ? { success: true } : { error: result.error };
}

// ── Send salary slip notification ──────────────────────────────────────────
export async function sendSalarySlipWhatsApp(employeeId: string, month: number, year: number) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId) return { error: "Unauthorized" };

  const employee = await prisma.user.findFirst({
    where: { id: employeeId, agencyId: session.agencyId },
    select: { name: true, phone: true },
  });

  if (!employee?.phone) return { error: "Employee has no phone number registered" };

  const monthName = new Date(year, month - 1, 1).toLocaleString("en-IN", { month: "long" });
  const message = `Dear ${employee.name},\n\nYour salary slip for ${monthName} ${year} has been processed. Please log in to your dashboard to view and download it.\n\nThank you.`;

  return sendWhatsApp({
    recipientPhone: employee.phone,
    message,
    type: "SALARY_SLIP",
  });
}

// ── Send delivery OTP/confirmation to customer ─────────────────────────────
export async function sendDeliveryConfirmation(customerId: string, cylindersDelivered: number) {
  const session = await getSession();
  if (!session || !session.agencyId) return { error: "Unauthorized" };

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, agencyId: session.agencyId },
    select: { name: true, phone: true },
  });

  if (!customer?.phone) return { error: "Customer has no phone number" };

  const message = `Dear ${customer.name},\n\n✅ Your delivery of ${cylindersDelivered} cylinder(s) has been completed today. Thank you for your business!\n\nFor any queries, please contact your gas agency.`;

  return sendWhatsApp({
    recipientPhone: customer.phone,
    message,
    type: "DELIVERY_REMINDER",
  });
}

// ── Send low stock alert to godown keeper ─────────────────────────────────
export async function sendLowStockAlert(productName: string, closingStock: number) {
  const session = await getSession();
  if (!session || !session.agencyId) return { error: "Unauthorized" };

  const godownKeepers = await prisma.user.findMany({
    where: { agencyId: session.agencyId, role: "GODOWN_KEEPER", isActive: true },
    select: { phone: true, name: true },
  });

  const message = `⚠️ LOW STOCK ALERT\n\nProduct: ${productName}\nCurrent Stock: ${closingStock} units\n\nPlease arrange replenishment urgently.`;

  const results = await Promise.allSettled(
    godownKeepers
      .filter((gk) => gk.phone)
      .map((gk) =>
        sendWhatsApp({ recipientPhone: gk.phone!, message, type: "LOW_STOCK" })
      )
  );

  return { success: true, sent: results.filter((r) => r.status === "fulfilled").length };
}

// ── Get message logs ───────────────────────────────────────────────────────
export async function getMessageLogs(limit = 50) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId) return { logs: [] };

  const logs = await prisma.messageLog.findMany({
    where: { agencyId: session.agencyId },
    orderBy: { sentAt: "desc" },
    take: limit,
  });

  return { logs };
}
