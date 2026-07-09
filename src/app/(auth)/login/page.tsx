import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { LoginForm } from "./LoginForm";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default async function LoginPage() {
  const headersList = await headers();
  const tenantSlug = headersList.get("x-tenant-slug");

  let agencyName: string | null = null;
  let logoBase64: string | null = null;
  let themeColor: string = "#2563eb"; // default blue
  let isValidTenant = true;

  if (tenantSlug && tenantSlug !== "admin") {
    const agency = await prisma.agency.findUnique({
      where: { slug: tenantSlug },
      select: {
        name: true,
        logoBase64: true,
        themeColor: true,
        status: true,
      },
    });

    if (agency && agency.status === "ACTIVE") {
      agencyName = agency.name;
      logoBase64 = agency.logoBase64;
      themeColor = agency.themeColor;
    } else {
      isValidTenant = false;
    }
  }

  if (!isValidTenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-zinc-200 shadow-xl text-center">
          <div className="mx-auto w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4 text-red-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-zinc-900 mb-2">Portal Not Found</h1>
          <p className="text-zinc-600 text-sm mb-6">
            The distributor portal you are looking for at <code className="bg-zinc-100 px-1.5 py-0.5 rounded text-red-600 font-mono text-xs">{tenantSlug}.localhost</code> does not exist or is currently inactive.
          </p>
          <div className="flex flex-col gap-2">
            <Link
              href="http://localhost:3000"
              className="w-full btn btn-primary justify-center py-2 text-sm font-medium rounded-lg"
            >
              Go to SaaS Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <LoginForm
      agencyName={agencyName}
      logoBase64={logoBase64}
      themeColor={themeColor}
    />
  );
}
