"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type ActionState = {
  success?: boolean;
  error?: string;
};

export async function updateAgencyBranding(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const session = await getSession();
    if (!session || !session.agencyId || session.role !== "ADMIN") {
      return { error: "Unauthorized: Only administrators can update branding settings." };
    }

    const name = formData.get("name") as string;
    const themeColor = formData.get("themeColor") as string;
    const logoFile = formData.get("logo") as File | null;
    const clearLogo = formData.get("clearLogo") === "true";

    if (!name || name.trim().length === 0) {
      return { error: "Agency name is required." };
    }

    if (!themeColor || !/^#[0-9A-F]{6}$/i.test(themeColor)) {
      return { error: "Invalid theme color format. Please specify a hex color." };
    }

    let logoBase64: string | null | undefined;

    if (clearLogo) {
      logoBase64 = null;
    } else if (logoFile && logoFile.size > 0) {
      // Limit to 1MB
      if (logoFile.size > 1 * 1024 * 1024) {
        return { error: "Logo file size must be less than 1MB." };
      }

      // Convert file to base64
      const buffer = Buffer.from(await logoFile.arrayBuffer());
      const base64Data = buffer.toString("base64");
      logoBase64 = `data:${logoFile.type};base64,${base64Data}`;
    }

    await prisma.agency.update({
      where: { id: session.agencyId },
      data: {
        name: name.trim(),
        themeColor,
        ...(logoBase64 !== undefined ? { logoBase64 } : {}),
      },
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: any) {
    console.error("[updateAgencyBranding] Error updating branding:", error);
    return { error: error.message || "Failed to update branding settings." };
  }
}
