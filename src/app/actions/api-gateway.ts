"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/lib/audit";
import crypto from "crypto";
import { z } from "zod";

const ALLOWED_SCOPES = [
  "customers:read", "customers:write",
  "deliveries:read", "deliveries:write",
  "inventory:read", "inventory:write",
  "payments:read", "reports:read",
];

// ── Generate API key ──────────────────────────────────────────────────────────
export async function generateApiKey(name: string, scopes: string[], expiresInDays?: number) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId) return { error: "Unauthorized" };

  const schema = z.object({
    name: z.string().min(1).max(80),
    scopes: z.array(z.enum(ALLOWED_SCOPES as [string, ...string[]])).min(1),
  });
  const parsed = schema.safeParse({ name, scopes });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  // Generate cryptographically secure key
  const rawKey = `gak_${crypto.randomBytes(32).toString("hex")}`;
  const prefix = rawKey.slice(0, 12);
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 86400000)
    : null;

  const apiKey = await prisma.apiKey.create({
    data: {
      agencyId: session.agencyId,
      name,
      keyHash,
      prefix,
      scopes,
      expiresAt,
    },
  });

  await createAuditLog({
    agencyId: session.agencyId,
    userId: session.userId,
    action: "CREATE_API_KEY",
    entityType: "ApiKey",
    entityId: apiKey.id,
  });

  revalidatePath("/admin/api-keys");
  // Return raw key ONCE — never stored again
  return { apiKey: { ...apiKey, rawKey } };
}

// ── List API keys ─────────────────────────────────────────────────────────────
export async function getApiKeys() {
  const session = await getSession();
  if (!session || !session.agencyId) return { keys: [] };

  const keys = await prisma.apiKey.findMany({
    where: { agencyId: session.agencyId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, prefix: true, scopes: true, isActive: true, lastUsedAt: true, expiresAt: true, createdAt: true },
  });

  return { keys };
}

// ── Revoke API key ────────────────────────────────────────────────────────────
export async function revokeApiKey(id: string) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId) return { error: "Unauthorized" };

  await prisma.apiKey.update({
    where: { id, agencyId: session.agencyId },
    data: { isActive: false },
  });

  revalidatePath("/admin/api-keys");
  return { success: true };
}

// ── Validate incoming API key (used in v1 route middleware) ───────────────────
export async function validateApiKey(rawKey: string): Promise<{
  valid: boolean;
  agencyId?: string;
  scopes?: string[];
}> {
  if (!rawKey?.startsWith("gak_")) return { valid: false };

  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  const key = await prisma.apiKey.findFirst({
    where: { keyHash, isActive: true },
  });

  if (!key) return { valid: false };
  if (key.expiresAt && key.expiresAt < new Date()) return { valid: false };

  // Update last-used timestamp asynchronously
  prisma.apiKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  return { valid: true, agencyId: key.agencyId, scopes: key.scopes };
}

// ── Webhooks management ───────────────────────────────────────────────────────
export async function createWebhook(url: string, events: string[]) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId) return { error: "Unauthorized" };

  const schema = z.object({
    url: z.string().url("Invalid webhook URL"),
    events: z.array(z.string()).min(1),
  });
  const parsed = schema.safeParse({ url, events });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  const secret = crypto.randomBytes(32).toString("hex");

  const webhook = await prisma.webhook.create({
    data: { agencyId: session.agencyId, url, events, secret },
  });

  revalidatePath("/admin/webhooks");
  return { webhook: { ...webhook, secret } }; // Return secret once
}

export async function getWebhooks() {
  const session = await getSession();
  if (!session || !session.agencyId) return { webhooks: [] };

  const webhooks = await prisma.webhook.findMany({
    where: { agencyId: session.agencyId },
    select: { id: true, url: true, events: true, isActive: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return { webhooks };
}

export async function deleteWebhook(id: string) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId) return { error: "Unauthorized" };

  await prisma.webhook.delete({ where: { id, agencyId: session.agencyId } });
  revalidatePath("/admin/webhooks");
  return { success: true };
}

// ── Fire webhook event (internal utility) ────────────────────────────────────
export async function fireWebhookEvent(agencyId: string, event: string, payload: object) {
  const hooks = await prisma.webhook.findMany({
    where: { agencyId, isActive: true, events: { has: event } },
  });

  const results = await Promise.allSettled(
    hooks.map(async (hook) => {
      const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
      const sig = crypto.createHmac("sha256", hook.secret).update(body).digest("hex");

      await fetch(hook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-GasAgency-Signature": `sha256=${sig}`,
          "X-GasAgency-Event": event,
        },
        body,
        signal: AbortSignal.timeout(5000),
      });
    })
  );

  return results;
}
