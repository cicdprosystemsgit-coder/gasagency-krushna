import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ApiDocsClient } from "./ApiDocsClient";

export const metadata = { title: "API Documentation — GasAgency" };

export default async function ApiDocsPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  return <ApiDocsClient />;
}
