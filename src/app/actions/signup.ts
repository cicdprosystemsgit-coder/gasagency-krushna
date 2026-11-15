"use server";

import { prisma } from "@/lib/prisma";
import { ALL_FEATURE_KEYS } from "@/lib/features";
import { validatePassword } from "@/lib/passwordPolicy";
import {
  createTokenPair,
  setAuthCookies,
  storeRefreshToken,
} from "@/lib/auth";
import { writeAuditLog, AUDIT_ACTIONS } from "@/lib/audit";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { z } from "zod";

const SignupSchema = z.object({
  agencyName: z.string().min(2, "Agency name must be at least 2 characters"),
  ownerName: z.string().min(2, "Owner name must be at least 2 characters"),
  oilCompany: z.string().min(1, "Please select your oil company"),
  distributorCode: z.string().optional(),
  email: z.string().email("Please enter a valid email address").toLowerCase(),
  phone: z.string().min(10, "Please enter a valid 10-digit mobile number"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type SignupState = {
  error?: string;
  success?: boolean;
  agencyId?: string;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function signupAgencyAction(
  _prevState: SignupState,
  formData: FormData
): Promise<SignupState> {
  const raw = {
    agencyName: (formData.get("agencyName") as string)?.trim(),
    ownerName: (formData.get("ownerName") as string)?.trim(),
    oilCompany: (formData.get("oilCompany") as string)?.trim(),
    distributorCode: (formData.get("distributorCode") as string)?.trim() || undefined,
    email: (formData.get("email") as string)?.trim().toLowerCase(),
    phone: (formData.get("phone") as string)?.trim(),
    city: (formData.get("city") as string)?.trim(),
    state: (formData.get("state") as string)?.trim(),
    password: formData.get("password") as string,
  };

  const parsed = SignupSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const {
    agencyName,
    ownerName,
    oilCompany,
    distributorCode,
    email,
    phone,
    city,
    state,
    password,
  } = parsed.data;

  // Password policy check
  const pwCheck = validatePassword(password);
  if (!pwCheck.valid) {
    return { error: pwCheck.message };
  }

  // Check for duplicate agency email or user email
  const [existingAgency, existingUser] = await Promise.all([
    prisma.agency.findUnique({ where: { email } }),
    prisma.user.findUnique({ where: { email } }),
  ]);

  if (existingAgency || existingUser) {
    return { error: "An agency or user account with this email address already exists. Please sign in instead." };
  }

  // Compute unique slug
  let baseSlug = slugify(agencyName);
  if (!baseSlug) baseSlug = "agency";
  let slug = baseSlug;
  let counter = 1;

  while (await prisma.agency.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  // 14-day free trial expiry date
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  try {
    const agency = await prisma.agency.create({
      data: {
        name: agencyName,
        ownerName,
        email,
        phone,
        address: `${city}, ${state}`,
        city,
        state,
        oilCompany,
        distributorCode: distributorCode ?? null,
        slug,
        status: "ACTIVE",
        plan: "professional",
        subscriptionPlan: "professional",
        trialEndsAt,
        enabledFeatures: ALL_FEATURE_KEYS,
        users: {
          create: {
            name: ownerName,
            email,
            phone,
            password: hashedPassword,
            role: "ADMIN",
            isActive: true,
          },
        },
      },
      include: {
        users: true,
      },
    });

    const adminUser = agency.users[0];

    // Issue initial session cookies so user is automatically logged in
    const reqHeaders = await headers();
    const forwardedFor = reqHeaders.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
    const userAgent = reqHeaders.get("user-agent") ?? "Unknown";

    const { accessToken, rawRefreshToken, refreshJti } = await createTokenPair({
      id: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      role: adminUser.role,
      customRole: adminUser.customRole,
      customRoleId: adminUser.customRoleId,
      agencyId: agency.id,
      agencySlug: agency.slug,
    });

    await storeRefreshToken({
      jti: refreshJti,
      userId: adminUser.id,
      rawToken: rawRefreshToken,
      ipAddress: ip,
      userAgent,
    });

    await setAuthCookies(accessToken, rawRefreshToken, adminUser.email);

    await writeAuditLog({
      userId: adminUser.id,
      agencyId: agency.id,
      action: AUDIT_ACTIONS.CREATE_AGENCY,
      entityType: "Agency",
      entityId: agency.id,
      after: { name: agency.name, plan: agency.plan, trialEndsAt },
    });

    return { success: true, agencyId: agency.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to register agency";
    return { error: msg };
  }
}

