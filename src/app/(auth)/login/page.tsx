import { LoginForm } from "./LoginForm";

/**
 * Single-domain SaaS login page.
 *
 * Previously this page read x-tenant-slug from the request headers to load
 * per-agency branding (logo, theme color). That was part of the subdomain
 * architecture. Now that all agencies share one domain, we show a generic
 * login and apply agency branding inside the dashboard (via /api/session)
 * after the user has authenticated.
 */
export default function LoginPage() {
  return (
    <LoginForm
      agencyName={null}
      logoBase64={null}
      themeColor="#2563eb"
    />
  );
}
