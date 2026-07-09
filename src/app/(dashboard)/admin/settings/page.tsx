import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { BrandingConfigForm } from "./BrandingConfigForm";
import { Palette } from "lucide-react";

export default async function SettingsPage() {
  const session = await getSession();

  if (!session || !session.agencyId || session.role !== "ADMIN") {
    redirect("/login");
  }

  const agency = await prisma.agency.findUnique({
    where: { id: session.agencyId },
    select: {
      name: true,
      slug: true,
      themeColor: true,
      logoBase64: true,
    },
  });

  if (!agency) {
    return (
      <div className="p-6 text-center text-zinc-500">
        Agency data not found. Please contact support.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shadow-xs">
            <Palette className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-zinc-900 tracking-tight">System Settings</h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Customize portal visuals and default branding parameters.
            </p>
          </div>
        </div>
      </div>

      <div className="divider" />

      {/* Form Content */}
      <BrandingConfigForm
        initialName={agency.name}
        initialSlug={agency.slug}
        initialThemeColor={agency.themeColor}
        initialLogoBase64={agency.logoBase64}
      />
    </div>
  );
}
