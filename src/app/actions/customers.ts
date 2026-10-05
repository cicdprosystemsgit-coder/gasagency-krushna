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
    const areaRoute = (formData.get("areaRoute") as string)?.trim() || null;
    const type = (formData.get("type") as string) || "DOMESTIC";
    const customerCode = (formData.get("customerCode") as string)?.trim() || null;
    const email = (formData.get("email") as string)?.trim() || null;
    const gstNumber = (formData.get("gstNumber") as string)?.trim() || null;
    const contactPerson = (formData.get("contactPerson") as string)?.trim() || null;
    const businessType = (formData.get("businessType") as string)?.trim() || null;

    if (!name) return { error: "Name is required" };
    if (!phone) return { error: "Phone number is required" };

    if (type === "COMMERCIAL") {
      if (!businessType) return { error: "Business Type is required for commercial customers." };
      if (!address) return { error: "Address is required for commercial customers." };
      if (!customerCode) return { error: "Consumer Number is required." };
    } else {
      // DOMESTIC
      if (!address) return { error: "Address is required." };
      if (!customerCode) return { error: "Consumer Number is required." };
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        phone,
        address,
        areaRoute,
        type: type as "DOMESTIC" | "COMMERCIAL",
        customerCode,
        email,
        gstNumber,
        contactPerson,
        businessType,
        agencyId: session.agencyId,
        isDeleted: false,
        isActive: true,
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
    const areaRoute = (formData.get("areaRoute") as string)?.trim() || null;
    const customerCode = (formData.get("customerCode") as string)?.trim() || null;
    const email = (formData.get("email") as string)?.trim() || null;
    const gstNumber = (formData.get("gstNumber") as string)?.trim() || null;
    const contactPerson = (formData.get("contactPerson") as string)?.trim() || null;
    const businessType = (formData.get("businessType") as string)?.trim() || null;

    if (!name) return { error: "Name is required" };
    if (!phone) return { error: "Phone number is required" };

    const existing = await prisma.customer.findUnique({
      where: { id },
      select: { type: true },
    });
    if (!existing) return { error: "Customer not found." };

    if (existing.type === "COMMERCIAL") {
      if (!businessType) return { error: "Business Type is required for commercial customers." };
      if (!address) return { error: "Address is required for commercial customers." };
      if (!customerCode) return { error: "Commercial Registration Number is required." };
    } else {
      // DOMESTIC
      if (!address) return { error: "Address is required." };
      if (!customerCode) return { error: "Consumer Number is required." };
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: { name, phone, address, areaRoute, customerCode, email, gstNumber, contactPerson, businessType },
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

// ── Soft Delete (1st step delete -> moves to Trash) ───────────────────────────
export async function deleteCustomer(id: string) {
  try {
    const session = await getSession();
    if (!session || !session.agencyId)
      return { error: "Unauthorized" };

    const isAllowed = session.role === "ADMIN" || (await checkPermission(session.userId, "customers", "delete"));
    if (!isAllowed) return { error: "Access Denied: You do not have permission to delete customers." };

    const existing = await prisma.customer.findFirst({ where: { id, agencyId: session.agencyId } });
    if (!existing) return { error: "Customer not found" };

    const cleanName = existing.name.replace(/\s*\(Deleted\)$/i, "").trim();
    const deletedName = `${cleanName} (Deleted)`;

    await prisma.customer.update({
      where: { id },
      data: {
        name: deletedName,
        isActive: false,
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    revalidateAll();
    return { success: true };
  } catch (e) {
    console.error("[deleteCustomer]", e);
    return { error: "Failed to delete customer." };
  }
}

export async function deleteSelectedCustomers(ids: string[]) {
  try {
    const session = await getSession();
    if (!session || !session.agencyId) return { error: "Unauthorized" };

    const isAllowed = session.role === "ADMIN" || (await checkPermission(session.userId, "customers", "delete"));
    if (!isAllowed) return { error: "Access Denied: You do not have permission to delete customers." };

    if (!ids || ids.length === 0) return { error: "No customers selected." };

    const customers = await prisma.customer.findMany({
      where: {
        id: { in: ids },
        agencyId: session.agencyId,
      },
    });

    for (const c of customers) {
      const cleanName = c.name.replace(/\s*\(Deleted\)$/i, "").trim();
      await prisma.customer.update({
        where: { id: c.id },
        data: {
          name: `${cleanName} (Deleted)`,
          isActive: false,
          isDeleted: true,
          deletedAt: new Date(),
        },
      });
    }

    revalidateAll();
    return { success: true, count: customers.length };
  } catch (e: unknown) {
    console.error("[deleteSelectedCustomers]", e);
    return { error: "Failed to delete selected customers." };
  }
}

export async function deleteAllCustomers(type: "DOMESTIC" | "COMMERCIAL" | "ALL" = "ALL") {
  try {
    const session = await getSession();
    if (!session || !session.agencyId) return { error: "Unauthorized" };

    const isAllowed = session.role === "ADMIN" || (await checkPermission(session.userId, "customers", "delete"));
    if (!isAllowed) return { error: "Access Denied: You do not have permission to delete customers." };

    const where: any = {
      agencyId: session.agencyId,
      isDeleted: false,
    };
    if (type !== "ALL") {
      where.type = type;
    }

    const customers = await prisma.customer.findMany({ where, select: { id: true, name: true } });

    for (const c of customers) {
      const cleanName = c.name.replace(/\s*\(Deleted\)$/i, "").trim();
      await prisma.customer.update({
        where: { id: c.id },
        data: {
          name: `${cleanName} (Deleted)`,
          isActive: false,
          isDeleted: true,
          deletedAt: new Date(),
        },
      });
    }

    revalidateAll();
    return { success: true, count: customers.length };
  } catch (e: unknown) {
    console.error("[deleteAllCustomers]", e);
    return { error: "Failed to delete customers." };
  }
}

// ── Restore / Recover Customer ────────────────────────────────────────────────
export async function recoverCustomer(id: string) {
  try {
    const session = await getSession();
    if (!session || !session.agencyId) return { error: "Unauthorized" };

    const isAllowed = session.role === "ADMIN" || (await checkPermission(session.userId, "customers", "update"));
    if (!isAllowed) return { error: "Access Denied" };

    const existing = await prisma.customer.findFirst({
      where: { id, agencyId: session.agencyId },
    });
    if (!existing) return { error: "Customer not found." };

    const cleanName = existing.name.replace(/\s*\(Deleted\)$/i, "").trim();

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name: cleanName,
        isActive: true,
        isDeleted: false,
        deletedAt: null,
      },
    });

    revalidateAll();
    return { success: true, customer };
  } catch (e) {
    console.error("[recoverCustomer]", e);
    return { error: "Failed to restore customer." };
  }
}

export async function recoverSelectedCustomers(ids: string[]) {
  try {
    const session = await getSession();
    if (!session || !session.agencyId) return { error: "Unauthorized" };

    const isAllowed = session.role === "ADMIN" || (await checkPermission(session.userId, "customers", "update"));
    if (!isAllowed) return { error: "Access Denied" };

    if (!ids || ids.length === 0) return { error: "No customers selected." };

    const customers = await prisma.customer.findMany({
      where: { id: { in: ids }, agencyId: session.agencyId },
    });

    for (const c of customers) {
      const cleanName = c.name.replace(/\s*\(Deleted\)$/i, "").trim();
      await prisma.customer.update({
        where: { id: c.id },
        data: {
          name: cleanName,
          isActive: true,
          isDeleted: false,
          deletedAt: null,
        },
      });
    }

    revalidateAll();
    return { success: true, count: customers.length };
  } catch (e) {
    console.error("[recoverSelectedCustomers]", e);
    return { error: "Failed to restore selected customers." };
  }
}

// ── Linked History & Unlink System ───────────────────────────────────────────
export async function getCustomerLinkedHistory(customerId: string) {
  try {
    const session = await getSession();
    if (!session || !session.agencyId) return { error: "Unauthorized", records: [], totalCount: 0 };
    if (!customerId) return { error: "Customer ID is required", records: [], totalCount: 0 };

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, agencyId: session.agencyId },
      select: { id: true, name: true, phone: true, type: true },
    });
    if (!customer) return { error: "Customer not found", records: [], totalCount: 0 };

    const [deliveries, sales, creditEntries, officeTransactions, receipts, complaints, regulators, gstInvoices] =
      await Promise.all([
        prisma.deliveryRecord.findMany({
          where: { customerId, agencyId: session.agencyId },
          include: { product: { select: { name: true } } },
          orderBy: { date: "desc" },
          take: 50,
        }),
        prisma.commercialSale.findMany({
          where: { customerId, agencyId: session.agencyId },
          include: { product: { select: { name: true } } },
          orderBy: { date: "desc" },
          take: 50,
        }),
        prisma.creditLedgerEntry.findMany({
          where: { customerId, agencyId: session.agencyId },
          orderBy: { date: "desc" },
          take: 50,
        }),
        prisma.officeTransaction.findMany({
          where: { customerId, agencyId: session.agencyId },
          include: { product: { select: { name: true } } },
          orderBy: { date: "desc" },
          take: 50,
        }),
        prisma.paymentReceipt.findMany({
          where: { customerId, agencyId: session.agencyId },
          orderBy: { date: "desc" },
          take: 50,
        }),
        prisma.customerComplaint.findMany({
          where: { customerId, agencyId: session.agencyId },
          orderBy: { createdAt: "desc" },
          take: 50,
        }),
        prisma.regulatorRecord.findMany({
          where: { customerId, agencyId: session.agencyId },
          orderBy: { issuedAt: "desc" },
          take: 50,
        }),
        prisma.gstInvoice.findMany({
          where: { customerId, agencyId: session.agencyId },
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
        details: `Product: ${d.product?.name || d.productName || "Cylinder"} · Mode: ${d.paymentMode} · Status: ${d.status}`,
        amountOrQty: `Delivered: ${d.deliveredQty} pcs · Cash: ₹${d.cashCollected}`,
      })),
      ...sales.map((s) => ({
        id: s.id,
        type: "sale" as const,
        typeName: "Commercial Sale",
        date: s.date.toISOString(),
        details: `Product: ${s.product?.name || s.productName || "Cylinder"} · Rate: ₹${s.rate}`,
        amountOrQty: `Qty: ${s.qty} · Total: ₹${s.amount}`,
      })),
      ...creditEntries.map((ce) => ({
        id: ce.id,
        type: "credit" as const,
        typeName: "Credit / Udhaari Ledger",
        date: ce.date.toISOString(),
        details: `${ce.type}: ${ce.description || "Credit ledger entry"}`,
        amountOrQty: `₹${ce.amount}`,
      })),
      ...officeTransactions.map((ot) => ({
        id: ot.id,
        type: "office" as const,
        typeName: "Office Transaction",
        date: ot.date.toISOString(),
        details: `${ot.type}: ${ot.description || "Office counter entry"} ${ot.product?.name ? `(${ot.product.name})` : ""}`,
        amountOrQty: `Qty: ${ot.qty} · ₹${ot.amount}`,
      })),
      ...receipts.map((r) => ({
        id: r.id,
        type: "receipt" as const,
        typeName: "Payment Receipt",
        date: r.date.toISOString(),
        details: `Receipt #${r.receiptNo} · Mode: ${r.paymentMode} ${r.utrNo ? `· Ref: ${r.utrNo}` : ""}`,
        amountOrQty: `₹${r.amount}`,
      })),
      ...complaints.map((c) => ({
        id: c.id,
        type: "complaint" as const,
        typeName: "Customer Complaint",
        date: c.createdAt.toISOString(),
        details: `Category: ${c.category} · Status: ${c.status} · ${c.description.substring(0, 40)}...`,
        amountOrQty: c.status,
      })),
      ...regulators.map((rg) => ({
        id: rg.id,
        type: "regulator" as const,
        typeName: "Regulator Record",
        date: rg.issuedAt.toISOString(),
        details: `Regulator #${rg.regulatorNo} · Status: ${rg.status}`,
        amountOrQty: rg.status,
      })),
      ...gstInvoices.map((inv) => ({
        id: inv.id,
        type: "invoice" as const,
        typeName: "GST Invoice",
        date: inv.date.toISOString(),
        details: `Invoice #${inv.invoiceNo} · Status: ${inv.status}`,
        amountOrQty: `₹${inv.total}`,
      })),
    ];

    records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      customerId: customer.id,
      customerName: customer.name,
      totalCount: records.length,
      records,
    };
  } catch (err: any) {
    console.error("[getCustomerLinkedHistory]", err);
    return { error: err?.message || "Failed to fetch linked records", records: [], totalCount: 0 };
  }
}

async function getOrCreateArchivedCustomer(agencyId: string, baseName: string, baseCustomer?: any) {
  const clean = baseName.replace(/\s*\(Deleted\)$/i, "").replace(/\s*\(Permanently Deleted\)$/i, "").trim();
  const archivedName = `${clean} (Permanently Deleted)`;

  let archived = await prisma.customer.findFirst({
    where: {
      agencyId,
      name: archivedName,
    },
  });

  if (!archived) {
    archived = await prisma.customer.create({
      data: {
        agencyId,
        name: archivedName,
        phone: baseCustomer?.phone ? `${baseCustomer.phone}-ARCHIVED-${Date.now()}` : `ARCHIVED-${Date.now()}`,
        address: baseCustomer?.address ?? null,
        type: baseCustomer?.type ?? "DOMESTIC",
        customerCode: baseCustomer?.customerCode ? `${baseCustomer.customerCode}-DEL` : null,
        isActive: false,
        isDeleted: true,
        deletedAt: new Date(),
      },
    });
  }

  return archived;
}

export async function unlinkCustomerRecord(
  type: "delivery" | "sale" | "credit" | "office" | "receipt" | "complaint" | "regulator" | "invoice",
  id: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    if (type === "delivery") {
      const rec = await prisma.deliveryRecord.findUnique({ where: { id }, include: { customer: true } });
      if (!rec) return { success: false, error: "Record not found" };
      const archived = await getOrCreateArchivedCustomer(session.agencyId, rec.customer?.name || "Customer", rec.customer);
      await prisma.deliveryRecord.update({ where: { id }, data: { customerId: archived.id } });
    } else if (type === "sale") {
      const rec = await prisma.commercialSale.findUnique({ where: { id }, include: { customer: true } });
      if (!rec) return { success: false, error: "Record not found" };
      const archived = await getOrCreateArchivedCustomer(session.agencyId, rec.customer?.name || "Customer", rec.customer);
      await prisma.commercialSale.update({ where: { id }, data: { customerId: archived.id } });
    } else if (type === "credit") {
      const rec = await prisma.creditLedgerEntry.findUnique({ where: { id }, include: { customer: true } });
      if (!rec) return { success: false, error: "Record not found" };
      const archived = await getOrCreateArchivedCustomer(session.agencyId, rec.customer?.name || "Customer", rec.customer);
      await prisma.creditLedgerEntry.update({ where: { id }, data: { customerId: archived.id } });
    } else if (type === "office") {
      const rec = await prisma.officeTransaction.findUnique({ where: { id }, include: { customer: true } });
      if (!rec) return { success: false, error: "Record not found" };
      const archived = await getOrCreateArchivedCustomer(session.agencyId, rec.customer?.name || "Customer", rec.customer);
      await prisma.officeTransaction.update({ where: { id }, data: { customerId: archived.id } });
    } else if (type === "receipt") {
      const rec = await prisma.paymentReceipt.findUnique({ where: { id }, include: { customer: true } });
      if (!rec) return { success: false, error: "Record not found" };
      const archived = await getOrCreateArchivedCustomer(session.agencyId, rec.customer?.name || "Customer", rec.customer);
      await prisma.paymentReceipt.update({ where: { id }, data: { customerId: archived.id } });
    } else if (type === "complaint") {
      const rec = await prisma.customerComplaint.findUnique({ where: { id }, include: { customer: true } });
      if (!rec) return { success: false, error: "Record not found" };
      const archived = await getOrCreateArchivedCustomer(session.agencyId, rec.customer?.name || "Customer", rec.customer);
      await prisma.customerComplaint.update({ where: { id }, data: { customerId: archived.id } });
    } else if (type === "regulator") {
      const rec = await prisma.regulatorRecord.findUnique({ where: { id }, include: { customer: true } });
      if (!rec) return { success: false, error: "Record not found" };
      const archived = await getOrCreateArchivedCustomer(session.agencyId, rec.customer?.name || "Customer", rec.customer);
      await prisma.regulatorRecord.update({ where: { id }, data: { customerId: archived.id } });
    } else if (type === "invoice") {
      const rec = await prisma.gstInvoice.findUnique({ where: { id } });
      if (!rec) return { success: false, error: "Record not found" };
      const customer = await prisma.customer.findUnique({ where: { id: rec.customerId } });
      const archived = await getOrCreateArchivedCustomer(session.agencyId, customer?.name || "Customer", customer);
      await prisma.gstInvoice.update({ where: { id }, data: { customerId: archived.id } });
    }

    revalidateAll();
    return { success: true };
  } catch (err: any) {
    console.error("[unlinkCustomerRecord]", err);
    return { success: false, error: err?.message || "Failed to unlink record" };
  }
}

export async function unlinkAllCustomerRecords(
  customerId: string
): Promise<{ success: boolean; unlinkedCount?: number; error?: string }> {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    return { success: false, error: "Unauthorized" };
  }
  if (!customerId) return { success: false, error: "Customer ID is required" };

  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId, agencyId: session.agencyId },
    });
    if (!customer) return { success: false, error: "Customer not found" };

    const archived = await getOrCreateArchivedCustomer(session.agencyId, customer.name, customer);

    const [dRes, sRes, cRes, oRes, rRes, cpRes, rgRes, invRes] = await prisma.$transaction([
      prisma.deliveryRecord.updateMany({
        where: { customerId, agencyId: session.agencyId },
        data: { customerId: archived.id },
      }),
      prisma.commercialSale.updateMany({
        where: { customerId, agencyId: session.agencyId },
        data: { customerId: archived.id },
      }),
      prisma.creditLedgerEntry.updateMany({
        where: { customerId, agencyId: session.agencyId },
        data: { customerId: archived.id },
      }),
      prisma.officeTransaction.updateMany({
        where: { customerId, agencyId: session.agencyId },
        data: { customerId: archived.id },
      }),
      prisma.paymentReceipt.updateMany({
        where: { customerId, agencyId: session.agencyId },
        data: { customerId: archived.id },
      }),
      prisma.customerComplaint.updateMany({
        where: { customerId, agencyId: session.agencyId },
        data: { customerId: archived.id },
      }),
      prisma.regulatorRecord.updateMany({
        where: { customerId, agencyId: session.agencyId },
        data: { customerId: archived.id },
      }),
      prisma.gstInvoice.updateMany({
        where: { customerId, agencyId: session.agencyId },
        data: { customerId: archived.id },
      }),
    ]);

    const total =
      dRes.count + sRes.count + cRes.count + oRes.count + rRes.count + cpRes.count + rgRes.count + invRes.count;

    revalidateAll();
    return { success: true, unlinkedCount: total };
  } catch (err: any) {
    console.error("[unlinkAllCustomerRecords]", err);
    return { success: false, error: err?.message || "Failed to unlink records" };
  }
}

export async function permanentDeleteCustomer(id: string): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId) return { success: false, error: "Unauthorized" };
  if (!id) return { success: false, error: "Customer ID is required" };

  try {
    const customer = await prisma.customer.findUnique({
      where: { id, agencyId: session.agencyId },
      include: {
        _count: {
          select: {
            deliveries: true,
            creditEntries: true,
            commercialSales: true,
            complaints: true,
            paymentReceipts: true,
            officeTransactions: true,
            regulators: true,
          },
        },
      },
    });

    if (!customer) return { success: false, error: "Customer not found" };

    const invoiceCount = await prisma.gstInvoice.count({
      where: { customerId: id, agencyId: session.agencyId },
    });

    const linkCount =
      (customer._count?.deliveries ?? 0) +
      (customer._count?.creditEntries ?? 0) +
      (customer._count?.commercialSales ?? 0) +
      (customer._count?.complaints ?? 0) +
      (customer._count?.paymentReceipts ?? 0) +
      (customer._count?.officeTransactions ?? 0) +
      (customer._count?.regulators ?? 0) +
      invoiceCount;

    if (linkCount > 0) {
      const details = [];
      if (customer._count?.deliveries) details.push(`${customer._count.deliveries} deliveries`);
      if (customer._count?.commercialSales) details.push(`${customer._count.commercialSales} commercial sales`);
      if (customer._count?.creditEntries) details.push(`${customer._count.creditEntries} credit entries`);
      if (customer._count?.officeTransactions) details.push(`${customer._count.officeTransactions} office transactions`);
      if (customer._count?.paymentReceipts) details.push(`${customer._count.paymentReceipts} payment receipts`);
      if (customer._count?.complaints) details.push(`${customer._count.complaints} complaints`);
      if (customer._count?.regulators) details.push(`${customer._count.regulators} regulators`);
      if (invoiceCount) details.push(`${invoiceCount} GST invoices`);

      return {
        success: false,
        error: `Cannot permanently delete: this customer is linked to ${details.join(", ")}. Please use "Unlink All Records" to preserve transaction history as [Customer Name] (Permanently Deleted) before deleting.`,
      };
    }

    await prisma.customer.delete({
      where: { id: customer.id },
    });

    revalidateAll();
    return { success: true };
  } catch (err: any) {
    console.error("[permanentDeleteCustomer]", err);
    return { success: false, error: err?.message || "Failed to permanently delete customer." };
  }
}

export async function permanentDeleteSelectedCustomers(ids: string[]): Promise<{ success: boolean; count?: number; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId) return { success: false, error: "Unauthorized" };
  if (!ids.length) return { success: false, error: "No customers selected" };

  try {
    let deletedCount = 0;
    for (const id of ids) {
      const res = await permanentDeleteCustomer(id);
      if (res.success) deletedCount++;
    }
    revalidateAll();
    return { success: true, count: deletedCount };
  } catch (err: any) {
    console.error("[permanentDeleteSelectedCustomers]", err);
    return { success: false, error: err?.message || "Failed to permanently delete selected customers." };
  }
}

// ── Paginated Query ───────────────────────────────────────────────────────────
export async function getCustomersPaginated({
  page = 1,
  limit = 50,
  search = "",
  type = "DOMESTIC",
  status = "ALL",
  isDeleted = false,
}: {
  page?: number;
  limit?: number;
  search?: string;
  type?: "DOMESTIC" | "COMMERCIAL" | "ALL";
  status?: "ALL" | "ACTIVE" | "INACTIVE";
  isDeleted?: boolean;
}) {
  try {
    const session = await getSession();
    if (!session || !session.agencyId) return { error: "Unauthorized" };

    const isAllowed = await checkPermission(session.userId, "customers", "read");
    if (!isAllowed && !["ADMIN", "MANAGER", "STAFF"].includes(session.role)) {
      return { error: "Access Denied" };
    }

    const where: any = {
      agencyId: session.agencyId,
      isDeleted,
    };

    if (type !== "ALL") {
      where.type = type;
    }

    if (!isDeleted) {
      if (status === "ACTIVE") where.isActive = true;
      if (status === "INACTIVE") where.isActive = false;
    }

    if (search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { customerCode: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        { address: { contains: q, mode: "insensitive" } },
        { areaRoute: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, customers, deletedCount, domesticCount, commercialCount] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.customer.count({ where: { agencyId: session.agencyId, isDeleted: true } }),
      prisma.customer.count({ where: { agencyId: session.agencyId, isDeleted: false, type: "DOMESTIC" } }),
      prisma.customer.count({ where: { agencyId: session.agencyId, isDeleted: false, type: "COMMERCIAL" } }),
    ]);

    return {
      customers: customers.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        deletedAt: c.deletedAt ? c.deletedAt.toISOString() : null,
        updatedAt: undefined,
      })),
      total,
      totalPages: Math.ceil(total / limit) || 1,
      page,
      counts: {
        domestic: domesticCount,
        commercial: commercialCount,
        deleted: deletedCount,
      },
    };
  } catch (err) {
    console.error("[getCustomersPaginated]", err);
    return { error: "Failed to fetch customers" };
  }
}
