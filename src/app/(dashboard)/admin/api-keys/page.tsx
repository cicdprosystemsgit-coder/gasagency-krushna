import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getApiKeys, getWebhooks } from "@/app/actions/api-gateway";
import { ApiKeysClient } from "./ApiKeysClient";

export default async function ApiKeysPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId) redirect("/login");

  const [{ keys }, { webhooks }] = await Promise.all([getApiKeys(), getWebhooks()]);

  // Serialize Date objects to strings for the client component
  const serializedKeys = JSON.parse(JSON.stringify(keys));
  const serializedWebhooks = JSON.parse(JSON.stringify(webhooks));

  return <ApiKeysClient apiKeys={serializedKeys} webhooks={serializedWebhooks} />;
}
