import crypto from "crypto";

/**
 * Firebase Cloud Messaging (FCM) — HTTP v1 API sender
 *
 * Uses OAuth2 Service Account credentials (FIREBASE_SERVICE_ACCOUNT_JSON)
 * to authenticate with the modern FCM HTTP v1 endpoint.
 *
 * Project: gasagency-50daa
 */

const DEFAULT_PROJECT_ID = "gasagency-50daa";
const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";

interface ServiceAccount {
  project_id?: string;
  client_email: string;
  private_key: string;
}

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

function getServiceAccount(): ServiceAccount | null {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson) as ServiceAccount;
      if (parsed.client_email && parsed.private_key) {
        return {
          ...parsed,
          private_key: parsed.private_key.replace(/\\n/g, "\n"),
        };
      }
    } catch (err) {
      console.error("[FCM] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:", err);
    }
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();
  if (clientEmail && privateKey) {
    return {
      project_id: process.env.FIREBASE_PROJECT_ID?.trim() || DEFAULT_PROJECT_ID,
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, "\n"),
    };
  }

  return null;
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function getAccessToken(sa: ServiceAccount): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 300) {
    return cachedAccessToken.token;
  }

  try {
    const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const payload = base64UrlEncode(
      JSON.stringify({
        iss: sa.client_email,
        scope: FCM_SCOPE,
        aud: OAUTH_TOKEN_URL,
        iat: now,
        exp: now + 3600,
      })
    );
    const unsigned = `${header}.${payload}`;
    const signer = crypto.createSign("RSA-SHA256");
    signer.update(unsigned);
    signer.end();
    const signature = base64UrlEncode(signer.sign(sa.private_key));
    const assertion = `${unsigned}.${signature}`;

    const res = await fetch(OAUTH_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });

    if (!res.ok) {
      console.error("[FCM] OAuth token error:", await res.text());
      return null;
    }

    const data = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!data.access_token) return null;

    cachedAccessToken = {
      token: data.access_token,
      expiresAt: now + (data.expires_in ?? 3600),
    };
    return data.access_token;
  } catch (err) {
    console.error("[FCM] Failed to get OAuth access token:", err);
    return null;
  }
}

/**
 * Send a push notification to one FCM token via FCM HTTP v1 API.
 * Silently fails so it never breaks the main server action flow.
 */
export async function sendPushNotification({
  token,
  title,
  body,
  data,
}: {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<void> {
  if (!token) return;

  const sa = getServiceAccount();
  if (!sa) return;

  const accessToken = await getAccessToken(sa);
  if (!accessToken) return;

  const projectId = sa.project_id || process.env.FIREBASE_PROJECT_ID || DEFAULT_PROJECT_ID;
  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  try {
    const payload = {
      message: {
        token,
        notification: {
          title,
          body,
        },
        android: {
          priority: "HIGH",
          notification: {
            channel_id: "gasagency_alerts",
            icon: "ic_launcher",
            color: "#2563EB",
            sound: "default",
            notification_priority: "PRIORITY_HIGH",
            visibility: "PUBLIC",
          },
        },
        data: data ?? {},
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[FCM] Error sending push:", err);
    }
  } catch (err) {
    console.error("[FCM] Exception sending push:", err);
  }
}

/**
 * Send push notification to multiple FCM tokens via FCM HTTP v1 API.
 */
export async function sendPushToTokens({
  tokens,
  title,
  body,
  data,
}: {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<void> {
  if (!tokens.length) return;

  const uniqueTokens = Array.from(new Set(tokens.filter(Boolean)));
  await Promise.all(
    uniqueTokens.map((token) => sendPushNotification({ token, title, body, data }))
  );
}
