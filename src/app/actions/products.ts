"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { type Product } from "@/generated/prisma";
import { revalidatePath } from "next/cache";

export async function createProduct(formData: FormData): Promise<{ product?: Product; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId) return { error: "Unauthorized" };

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Product name is required" };

  const isCylinder = formData.get("isCylinder") === "true";
  const hsnCode = (formData.get("hsnCode") as string)?.trim() || null;

  const product = await prisma.product.create({
    data: {
      name,
      unitCost: Number(formData.get("unitCost")) || 0,
      saleRate: Number(formData.get("saleRate")) || 0,
      margin: Number(formData.get("margin")) || 0,
      isCylinder,
      hsnCode,
      agencyId: session.agencyId,
    },
  });
  return { product };
}

export async function updateProduct(formData: FormData): Promise<{ product?: Product; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId) return { error: "Unauthorized" };

  const id = formData.get("id") as string;
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Product name is required" };

  const isCylinder = formData.get("isCylinder") === "true";
  const hsnCode = (formData.get("hsnCode") as string)?.trim() || null;

  const product = await prisma.product.update({
    where: { id, agencyId: session.agencyId },
    data: {
      name,
      unitCost: Number(formData.get("unitCost")) || 0,
      saleRate: Number(formData.get("saleRate")) || 0,
      margin: Number(formData.get("margin")) || 0,
      isCylinder,
      hsnCode,
    },
  });
  return { product };
}

export async function deleteProducts(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId) return { success: false, error: "Unauthorized" };

  const ids = formData.getAll("ids") as string[];
  if (!ids.length) return { success: false, error: "No products selected" };

  try {
    const products = await prisma.product.findMany({
      where: { id: { in: ids }, agencyId: session.agencyId },
    });

    if (!products.length) {
      return { success: false, error: "No matching products found." };
    }

    for (const product of products) {
      const cleanName = product.name.replace(/\s*\(Deleted\)$/i, "").trim();
      const deletedName = `${cleanName} (Deleted)`;

      // 1st time delete: soft-delete by deactivating, marking as deleted, and recording timestamp.
      // This preserves historical foreign-key integrity in deliveries, godown stock, and sales,
      // while removing the item from the active inventory catalog into the Deleted Items tab.
      await prisma.product.update({
        where: { id: product.id },
        data: {
          name: deletedName,
          isActive: false,
          isDeleted: true,
          deletedAt: new Date(),
        },
      });
    }

    return { success: true };
  } catch (err: any) {
    console.error("deleteProducts error:", err);
    return { success: false, error: err?.message || "An unexpected error occurred while deleting the product." };
  }
}

export async function recoverProduct(formData: FormData): Promise<{ product?: Product; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId) return { error: "Unauthorized" };

  const id = formData.get("id") as string;
  if (!id) return { error: "Product ID is required" };

  const rawName = (formData.get("name") as string)?.trim();
  if (!rawName) return { error: "Product name is required" };

  // Strip any "(Deleted)" suffix so product name is clean upon recovery
  const name = rawName.replace(/\s*\(Deleted\)$/i, "").trim();
  const isCylinder = formData.get("isCylinder") === "true";
  const hsnCode = (formData.get("hsnCode") as string)?.trim() || null;
  const gstRate = Number(formData.get("gstRate")) || 5;
  const unitCost = Number(formData.get("unitCost")) || 0;
  const saleRate = Number(formData.get("saleRate")) || 0;
  const margin = Number(formData.get("margin")) || Math.max(0, saleRate - unitCost);

  try {
    const existing = await prisma.product.findUnique({
      where: { id, agencyId: session.agencyId },
    });
    if (!existing) return { error: "Product not found" };

    const product = await prisma.product.update({
      where: { id, agencyId: session.agencyId },
      data: {
        name,
        unitCost,
        saleRate,
        margin,
        isCylinder,
        hsnCode,
        gstRate,
        isActive: true,
        isDeleted: false,
        deletedAt: null,
      },
    });

    return { product };
  } catch (err: any) {
    console.error("recoverProduct error:", err);
    return { error: err?.message || "Failed to recover product." };
  }
}

export async function getProductLinkedHistory(productId: string) {
  const session = await getSession();
  if (!session || !session.agencyId) return { error: "Unauthorized", records: [], totalCount: 0 };
  if (!productId) return { error: "Product ID is required", records: [], totalCount: 0 };

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId, agencyId: session.agencyId },
      select: { id: true, name: true },
    });
    if (!product) return { error: "Product not found", records: [], totalCount: 0 };

    const [deliveries, godownMovements, commercialSales, stockRecords, officeTransactions, companyPayments] = await Promise.all([
      prisma.deliveryRecord.findMany({
        where: { productId, agencyId: session.agencyId },
        include: { customer: { select: { name: true, type: true } } },
        orderBy: { date: "desc" },
        take: 50,
      }),
      prisma.godownInventory.findMany({
        where: { productId, agencyId: session.agencyId },
        orderBy: { date: "desc" },
        take: 50,
      }),
      prisma.commercialSale.findMany({
        where: { productId, agencyId: session.agencyId },
        include: { customer: { select: { name: true } } },
        orderBy: { date: "desc" },
        take: 50,
      }),
      prisma.stockRecord.findMany({
        where: { productId, agencyId: session.agencyId },
        orderBy: { date: "desc" },
        take: 50,
      }),
      prisma.officeTransaction.findMany({
        where: { inventoryId: productId, agencyId: session.agencyId },
        include: { customer: { select: { name: true } } },
        orderBy: { date: "desc" },
        take: 50,
      }),
      prisma.companyPayment.findMany({
        where: { productId, agencyId: session.agencyId },
        orderBy: { date: "desc" },
        take: 50,
      }),
    ]);

    const records = [
      ...deliveries.map((d) => ({
        id: d.id,
        type: "delivery" as const,
        typeName: "Delivery Record",
        date: d.date.toISOString(),
        details: `Customer: ${d.customer?.name || "General"} (${d.customer?.type || "DOMESTIC"}) · Mode: ${d.paymentMode}`,
        amountOrQty: `Delivered: ${d.deliveredQty} pcs · Cash: ₹${d.cashCollected}`,
      })),
      ...godownMovements.map((gm) => ({
        id: gm.id,
        type: "godown" as const,
        typeName: "Godown Movement",
        date: gm.date.toISOString(),
        details: `Move: ${gm.moveType} ${gm.batchNo ? `· Batch: ${gm.batchNo}` : ""} ${gm.notes ? `· ${gm.notes}` : ""}`,
        amountOrQty: `${gm.qty} units`,
      })),
      ...commercialSales.map((cs) => ({
        id: cs.id,
        type: "commercial" as const,
        typeName: "Commercial Sale",
        date: cs.date.toISOString(),
        details: `Customer: ${cs.customer?.name || "Commercial"} · Rate: ₹${cs.rate}`,
        amountOrQty: `Qty: ${cs.qty} · ₹${cs.amount}`,
      })),
      ...stockRecords.map((sr) => ({
        id: sr.id,
        type: "stock" as const,
        typeName: "Daily Stock Log",
        date: sr.date.toISOString(),
        details: `Opening: ${sr.openingStock} · Sales: ${sr.salesQty} · Closing: ${sr.closingStock}`,
        amountOrQty: `${sr.salesQty} sold`,
      })),
      ...officeTransactions.map((ot) => ({
        id: ot.id,
        type: "office" as const,
        typeName: "Office Transaction",
        date: ot.date.toISOString(),
        details: `${ot.type}: ${ot.description || "Direct office entry"} ${ot.customer ? `(${ot.customer.name})` : ""}`,
        amountOrQty: `Qty: ${ot.qty} · ₹${ot.amount}`,
      })),
      ...companyPayments.map((cp) => ({
        id: cp.id,
        type: "payment" as const,
        typeName: "Company Payment",
        date: cp.date.toISOString(),
        details: `Payment: ${cp.paymentMode} ${cp.oilCompany ? `· ${cp.oilCompany}` : ""} ${cp.referenceNo ? `· Ref: ${cp.referenceNo}` : ""}`,
        amountOrQty: `₹${cp.amount} ${cp.qtyCylinders ? `(${cp.qtyCylinders} cyl)` : ""}`,
      })),
    ];

    records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      productId: product.id,
      productName: product.name,
      totalCount: records.length,
      records,
    };
  } catch (err: any) {
    console.error("getProductLinkedHistory error:", err);
    return { error: err?.message || "Failed to fetch linked history", records: [], totalCount: 0 };
  }
}

async function getOrCreateArchivedProduct(agencyId: string, baseName: string, baseProduct?: Product | null) {
  const clean = baseName.replace(/\s*\(Deleted\)$/i, "").replace(/\s*\(Permanently Deleted\)$/i, "").trim();
  const archivedName = `${clean} (Permanently Deleted)`;

  let archived = await prisma.product.findFirst({
    where: {
      agencyId,
      name: archivedName,
    },
  });

  if (!archived) {
    archived = await prisma.product.create({
      data: {
        agencyId,
        name: archivedName,
        unitCost: baseProduct?.unitCost ?? 0,
        saleRate: baseProduct?.saleRate ?? 0,
        margin: baseProduct?.margin ?? 0,
        isCylinder: baseProduct?.isCylinder ?? true,
        hsnCode: baseProduct?.hsnCode ?? null,
        gstRate: baseProduct?.gstRate ?? 5,
        isActive: false,
        isDeleted: true,
        deletedAt: new Date(),
      },
    });
  }

  return archived;
}

export async function unlinkProductRecord(
  type: "delivery" | "godown" | "commercial" | "stock" | "office" | "payment",
  id: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    if (type === "delivery") {
      const rec = await prisma.deliveryRecord.findUnique({ where: { id }, include: { product: true } });
      if (!rec) return { success: false, error: "Record not found" };
      const baseName = rec.product?.name ? rec.product.name.replace(/\s*\(Deleted\)$/i, "").trim() : "Product";
      const archived = await getOrCreateArchivedProduct(session.agencyId, baseName, rec.product);
      await prisma.deliveryRecord.update({
        where: { id },
        data: { productId: archived.id, productName: archived.name },
      });
    } else if (type === "godown") {
      const rec = await prisma.godownInventory.findUnique({ where: { id }, include: { product: true } });
      if (!rec) return { success: false, error: "Record not found" };
      const baseName = rec.product?.name ? rec.product.name.replace(/\s*\(Deleted\)$/i, "").trim() : "Product";
      const archived = await getOrCreateArchivedProduct(session.agencyId, baseName, rec.product);
      await prisma.godownInventory.update({
        where: { id },
        data: { productId: archived.id, productName: archived.name },
      });
    } else if (type === "commercial") {
      const rec = await prisma.commercialSale.findUnique({ where: { id }, include: { product: true } });
      if (!rec) return { success: false, error: "Record not found" };
      const baseName = rec.product?.name ? rec.product.name.replace(/\s*\(Deleted\)$/i, "").trim() : "Product";
      const archived = await getOrCreateArchivedProduct(session.agencyId, baseName, rec.product);
      await prisma.commercialSale.update({
        where: { id },
        data: { productId: archived.id, productName: archived.name },
      });
    } else if (type === "stock") {
      const rec = await prisma.stockRecord.findUnique({ where: { id }, include: { product: true } });
      if (!rec) return { success: false, error: "Record not found" };
      const baseName = rec.product?.name ? rec.product.name.replace(/\s*\(Deleted\)$/i, "").trim() : "Product";
      const archived = await getOrCreateArchivedProduct(session.agencyId, baseName, rec.product);
      await prisma.stockRecord.update({
        where: { id },
        data: { productId: archived.id, productName: archived.name },
      });
    } else if (type === "office") {
      const rec = await prisma.officeTransaction.findUnique({ where: { id }, include: { product: true } });
      if (!rec) return { success: false, error: "Record not found" };
      const baseName = rec.product?.name ? rec.product.name.replace(/\s*\(Deleted\)$/i, "").trim() : "Product";
      const archived = await getOrCreateArchivedProduct(session.agencyId, baseName, rec.product);
      await prisma.officeTransaction.update({
        where: { id },
        data: { inventoryId: archived.id, productName: archived.name },
      });
    } else if (type === "payment") {
      const rec = await prisma.companyPayment.findUnique({ where: { id }, include: { product: true } });
      if (!rec) return { success: false, error: "Record not found" };
      const baseName = rec.product?.name ? rec.product.name.replace(/\s*\(Deleted\)$/i, "").trim() : "Product";
      const archived = await getOrCreateArchivedProduct(session.agencyId, baseName, rec.product);
      await prisma.companyPayment.update({
        where: { id },
        data: { productId: archived.id, productName: archived.name },
      });
    }
    revalidatePath("/admin/inventory");
    return { success: true };
  } catch (err: any) {
    console.error("unlinkProductRecord error:", err);
    return { success: false, error: err?.message || "Failed to unlink record" };
  }
}

export async function unlinkAllProductRecords(
  productId: string
): Promise<{ success: boolean; unlinkedCount?: number; error?: string }> {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    return { success: false, error: "Unauthorized" };
  }
  if (!productId) return { success: false, error: "Product ID is required" };

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId, agencyId: session.agencyId },
    });
    if (!product) return { success: false, error: "Product not found" };

    const archived = await getOrCreateArchivedProduct(session.agencyId, product.name, product);

    const [dRes, gRes, cRes, sRes, oRes, pRes] = await prisma.$transaction([
      prisma.deliveryRecord.updateMany({
        where: { productId, agencyId: session.agencyId },
        data: { productId: archived.id, productName: archived.name },
      }),
      prisma.godownInventory.updateMany({
        where: { productId, agencyId: session.agencyId },
        data: { productId: archived.id, productName: archived.name },
      }),
      prisma.commercialSale.updateMany({
        where: { productId, agencyId: session.agencyId },
        data: { productId: archived.id, productName: archived.name },
      }),
      prisma.stockRecord.updateMany({
        where: { productId, agencyId: session.agencyId },
        data: { productId: archived.id, productName: archived.name },
      }),
      prisma.officeTransaction.updateMany({
        where: { inventoryId: productId, agencyId: session.agencyId },
        data: { inventoryId: archived.id, productName: archived.name },
      }),
      prisma.companyPayment.updateMany({
        where: { productId, agencyId: session.agencyId },
        data: { productId: archived.id, productName: archived.name },
      }),
    ]);

    const total = dRes.count + gRes.count + cRes.count + sRes.count + oRes.count + pRes.count;
    revalidatePath("/admin/inventory");
    return { success: true, unlinkedCount: total };
  } catch (err: any) {
    console.error("unlinkAllProductRecords error:", err);
    return { success: false, error: err?.message || "Failed to unlink records" };
  }
}

export async function permanentDeleteProduct(id: string): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId) return { success: false, error: "Unauthorized" };
  if (!id) return { success: false, error: "Product ID is required" };

  try {
    const product = await prisma.product.findUnique({
      where: { id, agencyId: session.agencyId },
      include: {
        _count: {
          select: {
            stockRecords: true,
            deliveryRecords: true,
            commercialSales: true,
            officeTransactions: true,
            godownInventory: true,
            companyPayments: true,
          },
        },
      },
    });

    if (!product) return { success: false, error: "Product not found" };

    const linkCount =
      (product._count?.stockRecords ?? 0) +
      (product._count?.deliveryRecords ?? 0) +
      (product._count?.commercialSales ?? 0) +
      (product._count?.officeTransactions ?? 0) +
      (product._count?.godownInventory ?? 0) +
      (product._count?.companyPayments ?? 0);

    if (linkCount > 0) {
      const details = [];
      if (product._count?.deliveryRecords) details.push(`${product._count.deliveryRecords} deliveries`);
      if (product._count?.godownInventory) details.push(`${product._count.godownInventory} godown movements`);
      if (product._count?.commercialSales) details.push(`${product._count.commercialSales} commercial sales`);
      if (product._count?.stockRecords) details.push(`${product._count.stockRecords} stock records`);
      if (product._count?.officeTransactions) details.push(`${product._count.officeTransactions} office transactions`);
      if (product._count?.companyPayments) details.push(`${product._count.companyPayments} company payments`);

      return {
        success: false,
        error: `Cannot permanently delete: this product is linked to ${details.join(", ")}. Please use "Unlink All Records" below first to preserve transaction history as [Item Name] (Permanently Deleted) before deleting.`,
      };
    }

    await prisma.product.delete({
      where: { id: product.id },
    });

    revalidatePath("/admin/inventory");
    return { success: true };
  } catch (err: any) {
    console.error("permanentDeleteProduct error:", err);
    const isFk =
      err?.code === "P2003" ||
      err?.code === "P2014" ||
      err?.code === "23503" ||
      err?.message?.toLowerCase().includes("foreign key") ||
      err?.message?.includes("P2003");

    if (isFk) {
      return {
        success: false,
        error: "Cannot permanently delete: this product has linked records in the database. Please unlink them first.",
      };
    }

    return { success: false, error: err?.message || "Failed to permanently delete product." };
  }
}

export async function updateProductsSortOrder(
  orderedIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    return { success: false, error: "Unauthorized" };
  }
  const agencyId = session.agencyId;
  if (!orderedIds || orderedIds.length === 0) return { success: true };

  try {
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.product.update({
          where: { id, agencyId },
          data: { sortOrder: index },
        })
      )
    );
    revalidatePath("/admin/inventory");
    return { success: true };
  } catch (err: any) {
    console.error("updateProductsSortOrder error:", err);
    return { success: false, error: err?.message || "Failed to update sequence order" };
  }
}



