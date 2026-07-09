import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { activateSubscriptionFromPayment } from "@/app/actions/cashfree";
import crypto from "crypto";

const CF_SECRET = process.env.CASHFREE_SECRET!;

// Cashfree signs webhooks with: base64( HMAC-SHA256(secret, timestamp + rawBody) )
function verifySignature(rawBody: string, timestamp: string, signature: string): boolean {
  const expected = crypto
    .createHmac("sha256", CF_SECRET)
    .update(timestamp + rawBody)
    .digest("base64");
  return expected === signature;
}

export async function POST(req: NextRequest) {
  const rawBody  = await req.text();
  const timestamp = req.headers.get("x-webhook-timestamp") ?? "";
  const signature = req.headers.get("x-webhook-signature") ?? "";

  if (!timestamp || !signature) {
    return NextResponse.json({ error: "Missing webhook headers" }, { status: 400 });
  }

  if (!verifySignature(rawBody, timestamp, signature)) {
    console.warn("[cashfree-webhook] Signature mismatch — rejecting request");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const eventType: string = payload.type ?? "";
  const order   = payload.data?.order;
  const payment = payload.data?.payment;

  if (!order?.order_id) {
    return NextResponse.json({ received: true }); // unrecognised shape — ack and ignore
  }

  const orderId = order.order_id as string;

  if (eventType === "PAYMENT_SUCCESS_WEBHOOK") {
    const tx = await prisma.cashfreeTransaction.findUnique({
      where:  { orderId },
      select: { agencyId: true, status: true, plan: true, billingCycle: true, amount: true },
    });

    if (!tx) {
      // Unknown order — log and ack (prevents Cashfree from retrying indefinitely)
      console.warn(`[cashfree-webhook] Unknown orderId "${orderId}"`);
      return NextResponse.json({ received: true });
    }

    if (tx.status === "PAID") {
      // Idempotent — already processed (webhook can fire more than once)
      return NextResponse.json({ received: true });
    }

    await activateSubscriptionFromPayment({
      agencyId:       tx.agencyId,
      orderId,
      plan:           tx.plan         as "basic" | "professional" | "enterprise",
      billingCycle:   tx.billingCycle as "monthly" | "yearly",
      amount:         tx.amount,
      cfPaymentId:    String(payment?.cf_payment_id ?? ""),
      cfPaymentStatus: payment?.payment_status ?? "SUCCESS",
    });

    console.log(`[cashfree-webhook] Activated ${tx.plan}/${tx.billingCycle} for agency ${tx.agencyId}`);
  }

  if (eventType === "PAYMENT_FAILED_WEBHOOK") {
    await prisma.cashfreeTransaction.updateMany({
      where: { orderId, status: { not: "PAID" } },
      data:  { status: "FAILED", cfPaymentStatus: payment?.payment_status ?? "FAILED" },
    });
  }

  return NextResponse.json({ received: true });
}
