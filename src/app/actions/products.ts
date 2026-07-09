"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { type Product } from "@/generated/prisma";

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
    await prisma.product.deleteMany({
      where: { id: { in: ids }, agencyId: session.agencyId },
    });
    return { success: true };
  } catch (err: any) {
    // Prisma error code P2003 = foreign key constraint violation
    // This means the product is referenced in deliveries, stock records, etc.
    if (err?.code === "P2003" || err?.code === "P2014") {
      return {
        success: false,
        error: "Cannot delete: this product is already linked to existing delivery or inventory records. Deactivate it instead.",
      };
    }
    console.error("deleteProducts error:", err);
    return { success: false, error: "An unexpected error occurred while deleting the product." };
  }
}
