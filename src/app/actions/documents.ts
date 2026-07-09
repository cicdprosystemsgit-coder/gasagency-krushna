"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { uploadToAdminDrive, deleteFromAdminDrive, isDriveConfigured } from "@/lib/google-drive";

// ── Upload document (auto-selects Drive or Base64 fallback) ──────────────────
export async function uploadDocument(data: {
  entityType: string;
  entityId: string;
  docType: string;
  fileName: string;
  fileBase64: string;       // always sent from client; used as fallback if Drive unavailable
  mimeType: string;
  expiryDate?: string;
  employeeName?: string;    // required for Drive folder naming
}) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    return { error: "Unauthorized" };
  }

  if (!data.fileBase64 || data.fileBase64.length < 10) return { error: "Invalid file data" };
  if (!data.fileName?.trim()) return { error: "File name is required" };

  // 10MB limit
  const approxSizeKB = Math.round((data.fileBase64.length * 3) / 4 / 1024);
  if (approxSizeKB > 10240) return { error: "File size must be under 10 MB" };

  let storageType = "LOCAL";
  let driveFileId: string | undefined;
  let driveViewUrl: string | undefined;
  let storedBase64: string | undefined = data.fileBase64;

  // ── Try Google Drive first ───────────────────────────────────────────────
  if (isDriveConfigured() && data.entityType === "USER" && data.entityId) {
    try {
      const fileBuffer = Buffer.from(data.fileBase64, "base64");
      const employeeName = data.employeeName ?? data.entityId;
      const result = await uploadToAdminDrive({
        fileBuffer,
        fileName: `${data.docType}_${data.fileName}`,
        mimeType: data.mimeType,
        employeeId: data.entityId,
        employeeName,
      });
      driveFileId  = result.fileId;
      driveViewUrl = result.driveViewUrl;
      storageType  = "GOOGLE_DRIVE";
      storedBase64 = undefined; // don't waste DB space when Drive is used
    } catch (err) {
      console.error("[uploadDocument] Drive upload failed, falling back to DB:", err);
      // Fallback to Base64 in DB
    }
  }

  const doc = await prisma.document.create({
    data: {
      agencyId:    session.agencyId,
      entityType:  data.entityType,
      entityId:    data.entityId,
      docType:     data.docType,
      fileName:    data.fileName.trim(),
      fileBase64:  storedBase64 ?? null,
      mimeType:    data.mimeType || "application/pdf",
      expiryDate:  data.expiryDate ? new Date(data.expiryDate) : null,
      uploadedById: session.userId,
      storageType,
      driveFileId:  driveFileId  ?? null,
      driveViewUrl: driveViewUrl ?? null,
    },
  });

  revalidatePath("/admin/documents");
  revalidatePath("/admin/staff-management");
  return { doc, storageType, driveViewUrl };
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

// ── Get single document (with base64 for download — LOCAL only) ───────────────
export async function getDocumentForDownload(id: string) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    return { error: "Unauthorized" };
  }

  const doc = await prisma.document.findFirst({
    where: { id, agencyId: session.agencyId },
  });

  if (!doc) return { error: "Document not found" };

  // For Drive documents — return the view URL instead
  if (doc.storageType === "GOOGLE_DRIVE" && doc.driveViewUrl) {
    return { doc: { ...doc, isDrive: true } };
  }

  return { doc };
}

// ── Delete document ───────────────────────────────────────────────────────────
export async function deleteDocument(id: string) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId) {
    return { error: "Unauthorized" };
  }

  const doc = await prisma.document.findFirst({
    where: { id, agencyId: session.agencyId },
  });
  if (!doc) return { error: "Document not found" };

  // If stored in Drive, delete from there too
  if (doc.storageType === "GOOGLE_DRIVE" && doc.driveFileId) {
    await deleteFromAdminDrive(doc.driveFileId);
  }

  await prisma.document.delete({ where: { id } });

  revalidatePath("/admin/documents");
  revalidatePath("/admin/staff-management");
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

// ── Get employee documents (for staff management view) ───────────────────────
export async function getEmployeeDocuments(employeeId: string) {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    return { docs: [] };
  }

  const docs = await prisma.document.findMany({
    where: { agencyId: session.agencyId, entityType: "USER", entityId: employeeId },
    include: { uploadedBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return {
    docs: docs.map(({ fileBase64: _fb, ...rest }) => rest),
  };
}
