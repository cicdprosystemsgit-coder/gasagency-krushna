"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { AgencyStatus } from "@/generated/prisma";
import { validatePassword } from "@/lib/passwordPolicy";
import { writeAuditLog, AUDIT_ACTIONS } from "@/lib/audit";
import { ALL_FEATURE_KEYS } from "@/lib/features";

async function requireSystemAdmin() {
  const session = await getSession();
  if (!session || session.role !== "SYSTEM_ADMIN") throw new Error("Unauthorized");
  return session;
}

export async function createAgency(fd: FormData) {
  await requireSystemAdmin();

  const name          = (fd.get("name") as string)?.trim();
  const ownerName     = (fd.get("ownerName") as string)?.trim();
  const email         = (fd.get("email") as string)?.trim().toLowerCase();
  const phone         = (fd.get("phone") as string)?.trim();
  const address       = (fd.get("address") as string)?.trim();
  const city          = (fd.get("city") as string)?.trim();
  const state         = (fd.get("state") as string)?.trim();
  const gstin         = (fd.get("gstin") as string)?.trim() || null;
  const distributorCode = (fd.get("distributorCode") as string)?.trim() || null;
  const oilCompany    = (fd.get("oilCompany") as string)?.trim() || null;
  const licenseNo     = (fd.get("licenseNo") as string)?.trim() || null;
  const plan          = (fd.get("plan") as string)?.trim() || "basic";
  const notes         = (fd.get("notes") as string)?.trim() || null;
  const adminName     = (fd.get("adminName") as string)?.trim();
  const adminEmail    = (fd.get("adminEmail") as string)?.trim().toLowerCase();
  const adminPhone    = (fd.get("adminPhone") as string)?.trim() || null;
  const adminPassword = fd.get("adminPassword") as string;

  if (!name || !ownerName || !email || !phone || !address || !city || !state) {
    return { error: "Agency details are incomplete" };
  }
  if (!adminName || !adminEmail || !adminPassword) {
    return { error: "Admin account details are incomplete" };
  }
  const pwCheck = validatePassword(adminPassword);
  if (!pwCheck.valid) {
    return { error: pwCheck.message };
  }

  const [agencyExists, userExists] = await Promise.all([
    prisma.agency.findUnique({ where: { email } }),
    prisma.user.findUnique({ where: { email: adminEmail } }),
  ]);
  if (agencyExists) return { error: "An agency with this email already exists" };
  if (userExists)   return { error: "Admin email is already registered" };

  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  // Parse and validate feature keys
  const rawFeatures = fd.get("enabledFeatures") as string | null;
  let enabledFeatures: string[] = [];
  if (rawFeatures) {
    try {
      const parsed = JSON.parse(rawFeatures);
      if (Array.isArray(parsed)) {
        enabledFeatures = parsed.filter((k) => ALL_FEATURE_KEYS.includes(k));
      }
    } catch (_e) { /* ignore malformed JSON */ }
  }

  const agency = await prisma.agency.create({
    data: {
      name, ownerName, email, phone, address, city, state,
      gstin, distributorCode, oilCompany, licenseNo, plan, notes,
      enabledFeatures,
      users: {
        create: {
          name: adminName,
          email: adminEmail,
          phone: adminPhone,
          password: hashedPassword,
          role: "ADMIN",
        },
      },
    },
    include: { users: true },
  });

  revalidatePath("/system-admin/agencies");
  return { success: true, agencyId: agency.id };
}

export async function updateAgencyFeatures(agencyId: string, features: string[]) {
  await requireSystemAdmin();
  const enabledFeatures = features.filter((k) => ALL_FEATURE_KEYS.includes(k));
  await prisma.agency.update({ where: { id: agencyId }, data: { enabledFeatures } });
  revalidatePath(`/system-admin/agencies/${agencyId}`);
  return { success: true };
}

export async function updateAgencyStatus(id: string, status: AgencyStatus) {
  await requireSystemAdmin();
  await prisma.agency.update({ where: { id }, data: { status } });
  revalidatePath("/system-admin/agencies");
  return { success: true };
}

export async function updateAgency(id: string, fd: FormData) {
  await requireSystemAdmin();

  const data = {
    name:           (fd.get("name") as string)?.trim(),
    ownerName:      (fd.get("ownerName") as string)?.trim(),
    phone:          (fd.get("phone") as string)?.trim(),
    address:        (fd.get("address") as string)?.trim(),
    city:           (fd.get("city") as string)?.trim(),
    state:          (fd.get("state") as string)?.trim(),
    gstin:          (fd.get("gstin") as string)?.trim() || null,
    distributorCode:(fd.get("distributorCode") as string)?.trim() || null,
    oilCompany:     (fd.get("oilCompany") as string)?.trim() || null,
    licenseNo:      (fd.get("licenseNo") as string)?.trim() || null,
    plan:           (fd.get("plan") as string)?.trim() || "basic",
    notes:          (fd.get("notes") as string)?.trim() || null,
  };

  await prisma.agency.update({ where: { id }, data });
  revalidatePath(`/system-admin/agencies/${id}`);
  revalidatePath("/system-admin/agencies");
  return { success: true };
}

export async function addAgencyUser(agencyId: string, fd: FormData) {
  await requireSystemAdmin();

  const name     = (fd.get("name") as string)?.trim();
  const email    = (fd.get("email") as string)?.trim().toLowerCase();
  const phone    = (fd.get("phone") as string)?.trim() || null;
  const role     = fd.get("role") as string;
  const password = fd.get("password") as string;

  if (!name || !email || !role || !password) return { error: "All fields required" };
  const pwCheck = validatePassword(password);
  if (!pwCheck.valid) return { error: pwCheck.message };

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { error: "Email already registered" };

  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: { name, email, phone, password: hashed, role: role as never, agencyId },
  });

  revalidatePath(`/system-admin/agencies/${agencyId}`);
  return { success: true };
}

export async function toggleAgencyUser(userId: string, isActive: boolean, agencyId: string) {
  await requireSystemAdmin();
  await prisma.user.update({ where: { id: userId }, data: { isActive } });
  revalidatePath(`/system-admin/agencies/${agencyId}`);
  return { success: true };
}

export async function getPlatformStats() {
  await requireSystemAdmin();

  const [totalAgencies, activeAgencies, totalUsers, recentAgencies] = await Promise.all([
    prisma.agency.count(),
    prisma.agency.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { role: { not: "SYSTEM_ADMIN" } } }),
    prisma.agency.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { users: true } } },
    }),
  ]);

  return { totalAgencies, activeAgencies, totalUsers, recentAgencies };
}
