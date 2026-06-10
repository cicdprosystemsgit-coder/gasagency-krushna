import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NewAgencyForm } from "./NewAgencyForm";

export default async function NewAgencyPage() {
  const session = await getSession();
  if (!session || session.role !== "SYSTEM_ADMIN") redirect("/login");

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 17, fontWeight: 700, color: "#0F172A", letterSpacing: "-0.02em" }}>Onboard New Agency</h1>
        <p style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>Fill in agency details and create the first admin account</p>
      </div>
      <NewAgencyForm />
    </div>
  );
}
