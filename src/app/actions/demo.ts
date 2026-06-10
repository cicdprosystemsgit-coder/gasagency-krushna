"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const DemoSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Enter a valid 10-digit mobile number"),
  email: z.string().email("Enter a valid email address"),
});

export type DemoState = {
  error?: string;
  success?: boolean;
};

export async function submitDemoRequest(
  _prevState: DemoState,
  formData: FormData
): Promise<DemoState> {
  const raw = {
    name: formData.get("name") as string,
    phone: formData.get("phone") as string,
    email: formData.get("email") as string,
  };

  const parsed = DemoSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await prisma.demoRequest.create({
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email,
      },
    });
    return { success: true };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

const VALID_STATUSES = ["NEW", "CONTACTED", "SCHEDULED", "RESOLVED", "CANCELLED"] as const;
type DemoStatus = typeof VALID_STATUSES[number];

export async function updateDemoStatus(id: string, status: DemoStatus) {
  const session = await getSession();
  if (!session || session.role !== "SYSTEM_ADMIN") {
    return { error: "Unauthorized" };
  }
  if (!VALID_STATUSES.includes(status)) {
    return { error: "Invalid status" };
  }
  await prisma.demoRequest.update({ where: { id }, data: { status } });
  revalidatePath("/system-admin/demo-requests");
  return { success: true };
}

export async function addDemoNote(id: string, notes: string) {
  const session = await getSession();
  if (!session || session.role !== "SYSTEM_ADMIN") {
    return { error: "Unauthorized" };
  }
  await prisma.demoRequest.update({ where: { id }, data: { notes } });
  revalidatePath("/system-admin/demo-requests");
  return { success: true };
}
