"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { checkPermission } from "@/lib/rbac";

const REVALIDATE_PATHS = [
  "/admin/customer-management",
  "/manager/customer-management",
  "/staff/customer-management",
];

function revalidateAll() {
  REVALIDATE_PATHS.forEach((p) => revalidatePath(p));
}

export async function createCustomer(formData: FormData) {
  try {
    const session = await getSession();
    if (!session || !session.agencyId)
      return { error: "Unauthorized" };

    const isAllowed = await checkPermission(session.userId, "customers", "create");
    if (!isAllowed) return { error: "Access Denied: You do not have permission to create customers." };

    const name = (formData.get("name") as string)?.trim();
    const phone = (formData.get("phone") as string)?.trim();
    const address = (formData.get("address") as string)?.trim() || null;
    const type = (formData.get("type") as string) || "DOMESTIC";
    const customerCode = (formData.get("customerCode") as string)?.trim() || null;
    const email = (formData.get("email") as string)?.trim() || null;
    const gstNumber = (formData.get("gstNumber") as string)?.trim() || null;
    const contactPerson = (formData.get("contactPerson") as string)?.trim() || null;
    const businessType = (formData.get("businessType") as string)?.trim() || null;

    if (!name) return { error: "Name is required" };
    if (!phone) return { error: "Phone number is required" };

    const customer = await prisma.customer.create({
      data: {
        name,
        phone,
        address,
        type: type as "DOMESTIC" | "COMMERCIAL",
        customerCode,
        email,
        gstNumber,
        contactPerson,
        businessType,
        agencyId: session.agencyId,
      },
    });

    revalidateAll();
    return { customer };
  } catch (e: unknown) {
    console.error("[createCustomer]", e);
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("Unique constraint") || msg.includes("unique"))
      return { error: "A customer with this phone number already exists." };
    return { error: "Failed to create customer. Please try again." };
  }
}

export async function updateCustomer(id: string, formData: FormData) {
  try {
    const session = await getSession();
    if (!session || !session.agencyId)
      return { error: "Unauthorized" };

    const isAllowed = await checkPermission(session.userId, "customers", "update");
    if (!isAllowed) return { error: "Access Denied: You do not have permission to update customers." };

    const name = (formData.get("name") as string)?.trim();
    const phone = (formData.get("phone") as string)?.trim();
    const address = (formData.get("address") as string)?.trim() || null;
    const customerCode = (formData.get("customerCode") as string)?.trim() || null;
    const email = (formData.get("email") as string)?.trim() || null;
    const gstNumber = (formData.get("gstNumber") as string)?.trim() || null;
    const contactPerson = (formData.get("contactPerson") as string)?.trim() || null;
    const businessType = (formData.get("businessType") as string)?.trim() || null;

    if (!name) return { error: "Name is required" };
    if (!phone) return { error: "Phone number is required" };

    const customer = await prisma.customer.update({
      where: { id },
      data: { name, phone, address, customerCode, email, gstNumber, contactPerson, businessType },
    });

    revalidateAll();
    return { customer };
  } catch (e) {
    console.error("[updateCustomer]", e);
    return { error: "Failed to update customer." };
  }
}

export async function toggleCustomerStatus(id: string) {
  try {
    const session = await getSession();
    if (!session || !session.agencyId)
      return { error: "Unauthorized" };

    const isAllowed = await checkPermission(session.userId, "customers", "update");
    if (!isAllowed) return { error: "Access Denied: You do not have permission to modify customer status." };

    const existing = await prisma.customer.findFirst({ where: { id, agencyId: session.agencyId } });
    if (!existing) return { error: "Customer not found" };

    const customer = await prisma.customer.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });

    revalidateAll();
    return { customer };
  } catch (e) {
    console.error("[toggleCustomerStatus]", e);
    return { error: "Failed to update customer status." };
  }
}

export async function deleteCustomer(id: string) {
  try {
    const session = await getSession();
    if (!session || !session.agencyId)
      return { error: "Unauthorized" };

    const isAllowed = await checkPermission(session.userId, "customers", "delete");
    if (!isAllowed) return { error: "Access Denied: You do not have permission to delete customers." };

    const existing = await prisma.customer.findFirst({ where: { id, agencyId: session.agencyId } });
    if (!existing) return { error: "Customer not found" };

    await prisma.customer.delete({ where: { id } });

    revalidateAll();
    return { success: true };
  } catch (e) {
    console.error("[deleteCustomer]", e);
    return { error: "Cannot delete — customer has associated records." };
  }
}
