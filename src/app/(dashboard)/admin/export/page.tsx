import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ExportPageClient } from "./ExportPageClient";

export default async function ExportPage() {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role)) redirect("/login");

  return <ExportPageClient />;
}
