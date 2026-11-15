import { LoginForm } from "./LoginForm";
import { getSession, getRoleDashboard } from "@/lib/auth";
import { redirect } from "next/navigation";

/**
 * Single-domain SaaS login page.
 *
 * If the user visited or logged in within the last 6 hours, getSession()
 * resolves and automatically redirects them directly to their role dashboard
 * without prompting for credentials.
 */
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();
  if (session && session.role) {
    redirect(getRoleDashboard(session.role));
  }

  return (
    <LoginForm
      agencyName={null}
      logoBase64={null}
      themeColor="#2563eb"
    />
  );
}
