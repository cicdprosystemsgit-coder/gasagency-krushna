"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Copy, CheckCircle2, Key, Globe, BookOpen } from "lucide-react";

type Method = "GET" | "POST" | "PUT" | "DELETE";

interface Endpoint {
  method: Method;
  path: string;
  description: string;
  scope: string;
  params?: { name: string; type: string; required: boolean; desc: string }[];
  response: string;
}

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://your-domain.com";

const METHOD_COLORS: Record<Method, { bg: string; text: string }> = {
  GET:    { bg: "#DCFCE7", text: "#15803D" },
  POST:   { bg: "#DBEAFE", text: "#1D4ED8" },
  PUT:    { bg: "#FEF9C3", text: "#92400E" },
  DELETE: { bg: "#FEE2E2", text: "#991B1B" },
};

const ENDPOINTS: Endpoint[] = [
  {
    method: "GET",
    path: "/api/v1/customers",
    description: "List all active customers for your agency. Supports pagination and search.",
    scope: "customers:read",
    params: [
      { name: "page",   type: "number",  required: false, desc: "Page number (default: 1)" },
      { name: "limit",  type: "number",  required: false, desc: "Results per page (default: 50, max: 200)" },
      { name: "search", type: "string",  required: false, desc: "Filter by name or phone" },
    ],
    response: `{
  "data": [
    {
      "id": "clxxx...",
      "name": "Ramesh Patel",
      "phone": "+91 9876543210",
      "type": "DOMESTIC",
      "address": "123 Main St",
      "customerCode": "C001",
      "isActive": true,
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ],
  "meta": { "total": 142, "page": 1, "limit": 50 }
}`,
  },
  {
    method: "GET",
    path: "/api/v1/deliveries",
    description: "List delivery records. Filter by date range.",
    scope: "deliveries:read",
    params: [
      { name: "from",  type: "string (ISO date)", required: false, desc: "Start date e.g. 2026-01-01" },
      { name: "to",    type: "string (ISO date)", required: false, desc: "End date e.g. 2026-01-31" },
      { name: "page",  type: "number",            required: false, desc: "Page number" },
      { name: "limit", type: "number",            required: false, desc: "Results per page (max: 200)" },
    ],
    response: `{
  "data": [
    {
      "id": "clxxx...",
      "date": "2026-06-09T00:00:00.000Z",
      "customer": { "id": "...", "name": "Ramesh Patel", "phone": "..." },
      "product": { "id": "...", "name": "14.2kg Cylinder" },
      "deliveredQty": 2,
      "returnedQty": 0,
      "cashCollected": 1800,
      "deliveredBy": { "id": "...", "name": "Suresh" }
    }
  ],
  "meta": { "total": 320, "page": 1, "limit": 50 }
}`,
  },
  {
    method: "GET",
    path: "/api/v1/inventory",
    description: "Get current net stock per product, aggregated from all godown movements.",
    scope: "inventory:read",
    params: [],
    response: `{
  "data": [
    {
      "productId": "clxxx...",
      "product": "14.2kg Cylinder",
      "unitCost": 850,
      "saleRate": 950,
      "totalIn": 500,
      "totalOut": 320,
      "netStock": 180
    }
  ],
  "meta": { "total": 3, "timestamp": "2026-06-09T10:00:00.000Z" }
}`,
  },
];

const SCOPES = [
  { scope: "customers:read",    desc: "Read customer list and details" },
  { scope: "customers:write",   desc: "Create or update customers" },
  { scope: "deliveries:read",   desc: "Read delivery records" },
  { scope: "deliveries:write",  desc: "Create delivery records" },
  { scope: "inventory:read",    desc: "Read stock levels" },
  { scope: "inventory:write",   desc: "Update inventory" },
  { scope: "payments:read",     desc: "Read payment receipts and credit ledger" },
  { scope: "reports:read",      desc: "Access analytics and reports" },
];

const WEBHOOK_EVENTS = [
  { event: "delivery.completed",  desc: "Fired when a delivery record is saved" },
  { event: "delivery.pending",    desc: "Fired when a delivery is created with pending status" },
  { event: "payment.received",    desc: "Fired when a payment receipt is recorded" },
  { event: "customer.created",    desc: "Fired when a new customer is added" },
  { event: "inventory.low-stock", desc: "Fired when stock falls below threshold" },
  { event: "document.expiring",   desc: "Fired 7 and 30 days before a document expires" },
];

function MethodBadge({ method }: { method: Method }) {
  const { bg, text } = METHOD_COLORS[method];
  return (
    <span className="text-[11px] font-bold px-2 py-0.5 rounded font-mono" style={{ background: bg, color: text }}>
      {method}
    </span>
  );
}

function EndpointBlock({ ep }: { ep: Endpoint }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card mb-3 overflow-hidden">
      <button className="w-full flex items-center gap-3 p-4 text-left hover:bg-zinc-50 transition-colors" onClick={() => setOpen(!open)}>
        <MethodBadge method={ep.method} />
        <code className="text-[13px] font-mono font-medium flex-1" style={{ color: "#18181B" }}>{ep.path}</code>
        <span className="text-[11px] px-2 py-0.5 rounded font-mono" style={{ background: "#F5F3FF", color: "#6D28D9" }}>{ep.scope}</span>
        {open ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
      </button>

      {open && (
        <div style={{ borderTop: "1px solid #E4E4E7" }}>
          <div className="p-4">
            <p className="text-[13px] mb-4" style={{ color: "#52525B" }}>{ep.description}</p>

            {ep.params && ep.params.length > 0 && (
              <div className="mb-4">
                <p className="text-[12px] font-semibold mb-2" style={{ color: "#18181B" }}>Query Parameters</p>
                <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #E4E4E7" }}>
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr style={{ background: "#F4F4F5" }}>
                        <th className="text-left px-3 py-2 font-medium" style={{ color: "#52525B" }}>Name</th>
                        <th className="text-left px-3 py-2 font-medium" style={{ color: "#52525B" }}>Type</th>
                        <th className="text-left px-3 py-2 font-medium" style={{ color: "#52525B" }}>Required</th>
                        <th className="text-left px-3 py-2 font-medium" style={{ color: "#52525B" }}>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ep.params.map((p) => (
                        <tr key={p.name} style={{ borderTop: "1px solid #F4F4F5" }}>
                          <td className="px-3 py-2"><code className="font-mono" style={{ color: "#2563EB" }}>{p.name}</code></td>
                          <td className="px-3 py-2" style={{ color: "#71717A" }}>{p.type}</td>
                          <td className="px-3 py-2">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: p.required ? "#FEE2E2" : "#F4F4F5", color: p.required ? "#991B1B" : "#71717A" }}>
                              {p.required ? "required" : "optional"}
                            </span>
                          </td>
                          <td className="px-3 py-2" style={{ color: "#52525B" }}>{p.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[12px] font-semibold" style={{ color: "#18181B" }}>Response (200 OK)</p>
                <button onClick={() => copy(ep.response)} className="flex items-center gap-1 text-[11px]" style={{ color: "#A1A1AA" }}>
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} Copy
                </button>
              </div>
              <pre className="rounded-lg p-3 text-[12px] font-mono overflow-x-auto" style={{ background: "#18181B", color: "#D4D4D8" }}>
                {ep.response}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ApiDocsClient() {
  const [tab, setTab] = useState<"endpoints" | "auth" | "scopes" | "webhooks">("endpoints");
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const curlExample = `curl -X GET "${BASE}/api/v1/customers?page=1&limit=50" \\
  -H "Authorization: Bearer gak_your_api_key_here" \\
  -H "Content-Type: application/json"`;

  const webhookVerifyExample = `const crypto = require("crypto");

function verifyWebhook(rawBody, signature, secret) {
  const expected = "sha256=" + crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}`;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#EFF6FF" }}>
          <BookOpen className="w-5 h-5" style={{ color: "#2563EB" }} />
        </div>
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight" style={{ color: "#18181B" }}>API Documentation</h1>
          <p className="text-[13px] mt-0.5" style={{ color: "#71717A" }}>REST API for third-party integrations — base URL: <code className="font-mono text-[12px]">{BASE}/api/v1</code></p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg w-fit" style={{ background: "#F4F4F5" }}>
        {(["endpoints", "auth", "scopes", "webhooks"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className="px-4 py-1.5 rounded-md text-[13px] font-medium transition-all capitalize"
            style={{ background: tab === t ? "#FFFFFF" : "transparent", color: tab === t ? "#18181B" : "#71717A", boxShadow: tab === t ? "0 1px 2px rgba(0,0,0,0.05)" : "none" }}>
            {t}
          </button>
        ))}
      </div>

      {/* Endpoints */}
      {tab === "endpoints" && (
        <div>
          {ENDPOINTS.map((ep) => <EndpointBlock key={ep.path} ep={ep} />)}
        </div>
      )}

      {/* Authentication */}
      {tab === "auth" && (
        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Key className="w-4 h-4" style={{ color: "#2563EB" }} />
              <p className="text-[14px] font-semibold" style={{ color: "#18181B" }}>Bearer Token Authentication</p>
            </div>
            <p className="text-[13px] mb-4" style={{ color: "#52525B" }}>
              All API requests must include your API key as a Bearer token in the <code className="font-mono text-[12px] px-1 rounded" style={{ background: "#F4F4F5" }}>Authorization</code> header.
              Generate API keys from <strong>Admin → API Gateway</strong>.
            </p>
            <div className="flex items-start justify-between gap-2 p-3 rounded-lg" style={{ background: "#18181B" }}>
              <pre className="text-[12px] font-mono text-zinc-300 flex-1 overflow-x-auto">{curlExample}</pre>
              <button onClick={() => copy(curlExample, "curl")} className="flex-shrink-0 mt-1">
                {copied === "curl" ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-zinc-500" />}
              </button>
            </div>
          </div>
          <div className="card p-5">
            <p className="text-[14px] font-semibold mb-2" style={{ color: "#18181B" }}>Error Responses</p>
            <div className="space-y-2">
              {[
                { code: "401 Unauthorized", msg: "Missing or invalid API key" },
                { code: "403 Forbidden",    msg: "API key lacks the required scope" },
                { code: "429 Too Many Requests", msg: "Rate limit exceeded" },
                { code: "500 Internal Server Error", msg: "Server-side error" },
              ].map(({ code, msg }) => (
                <div key={code} className="flex items-center gap-3 text-[13px]">
                  <code className="font-mono text-[11px] px-2 py-0.5 rounded flex-shrink-0" style={{ background: "#FEF2F2", color: "#B91C1C" }}>{code}</code>
                  <span style={{ color: "#52525B" }}>{msg}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Scopes */}
      {tab === "scopes" && (
        <div className="card overflow-hidden">
          <table className="table">
            <thead><tr><th>Scope</th><th>Description</th></tr></thead>
            <tbody>
              {SCOPES.map(({ scope, desc }) => (
                <tr key={scope}>
                  <td><code className="font-mono text-[12px] px-2 py-0.5 rounded" style={{ background: "#F5F3FF", color: "#6D28D9" }}>{scope}</code></td>
                  <td className="text-[13px]" style={{ color: "#52525B" }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Webhooks */}
      {tab === "webhooks" && (
        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-4 h-4" style={{ color: "#7C3AED" }} />
              <p className="text-[14px] font-semibold" style={{ color: "#18181B" }}>Webhook Events</p>
            </div>
            <p className="text-[13px] mb-4" style={{ color: "#52525B" }}>
              GasAgency sends a signed <code className="font-mono text-[12px]">POST</code> request to your endpoint when events occur.
              Verify the signature using the <code className="font-mono text-[12px]">X-GasAgency-Signature</code> header.
            </p>
            <div className="space-y-2">
              {WEBHOOK_EVENTS.map(({ event, desc }) => (
                <div key={event} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "#F4F4F5" }}>
                  <code className="font-mono text-[12px] flex-shrink-0" style={{ color: "#7C3AED" }}>{event}</code>
                  <span className="text-[13px]" style={{ color: "#52525B" }}>{desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <p className="text-[14px] font-semibold mb-3" style={{ color: "#18181B" }}>Signature Verification</p>
            <p className="text-[13px] mb-3" style={{ color: "#52525B" }}>Each webhook carries a <code className="font-mono text-[12px]">X-GasAgency-Signature: sha256=...</code> header. Verify it to prevent spoofing:</p>
            <div className="flex items-start justify-between gap-2 p-3 rounded-lg" style={{ background: "#18181B" }}>
              <pre className="text-[12px] font-mono text-zinc-300 flex-1 overflow-x-auto">{webhookVerifyExample}</pre>
              <button onClick={() => copy(webhookVerifyExample, "wh")} className="flex-shrink-0 mt-1">
                {copied === "wh" ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-zinc-500" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
