"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ── Upload document ───────────────────────────────────────────────────────────
export async function uploadDocument(data: {
  entityType: string;
  entityId: string;
  docType: string;
  fileName: string;
  fileBase64: string;
  mimeType: string;
  expiryDate?: string;
}) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    return { error: "Unauthorized" };
  }

  if (!data.fileBase64 || data.fileBase64.length < 10) return { error: "Invalid file data" };
  if (!data.fileName?.trim()) return { error: "File name is required" };

  // 5MB limit (base64 is ~33% larger than binary)
  const approxSizeKB = Math.round((data.fileBase64.length * 3) / 4 / 1024);
  if (approxSizeKB > 5120) return { error: "File size must be under 5 MB" };

  const doc = await prisma.document.create({
    data: {
      agencyId: session.agencyId,
      entityType: data.entityType,
      entityId: data.entityId,
      docType: data.docType,
      fileName: data.fileName.trim(),
      fileBase64: data.fileBase64,
      mimeType: data.mimeType || "application/pdf",
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      uploadedById: session.userId,
    },
  });

  revalidatePath("/admin/documents");
  revalidatePath("/admin/staff-management");
  return { doc };
}

// ── Get documents for an entity ───────────────────────────────────────────────
export async function getDocuments(entityType?: string, entityId?: string) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    return { docs: [] };
  }

  const docs = await prisma.document.findMany({
    where: {
      agencyId: session.agencyId,
      ...(entityType ? { entityType } : {}),
      ...(entityId ? { entityId } : {}),
    },
    include: { uploadedBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return {
    docs: docs.map(({ fileBase64: _fb, ...rest }) => rest),
  };
}

// ── Get single document (with base64 for download) ───────────────────────────
export async function getDocumentForDownload(id: string) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    return { error: "Unauthorized" };
  }

  const doc = await prisma.document.findFirst({
    where: { id, agencyId: session.agencyId },
  });

  if (!doc) return { error: "Document not found" };
  return { doc };
}

// ── Delete document ───────────────────────────────────────────────────────────
export async function deleteDocument(id: string) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId) {
    return { error: "Unauthorized" };
  }

  await prisma.document.delete({
    where: { id, agencyId: session.agencyId },
  });

  revalidatePath("/admin/documents");
  return { success: true };
}

// ── Get expiring documents (next 30 days) ────────────────────────────────────
export async function getExpiringDocuments() {
  const session = await getSession();
  if (!session || !session.agencyId) return { docs: [] };

  const now = new Date();
  const in30Days = new Date();
  in30Days.setDate(in30Days.getDate() + 30);

  const docs = await prisma.document.findMany({
    where: {
      agencyId: session.agencyId,
      expiryDate: { gte: now, lte: in30Days },
    },
    include: { uploadedBy: { select: { name: true } } },
    orderBy: { expiryDate: "asc" },
  });

  return { docs: docs.map(({ fileBase64: _fb, ...rest }) => rest) };
}
