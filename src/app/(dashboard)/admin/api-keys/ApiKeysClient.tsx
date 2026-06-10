"use client";

import { useState, useTransition } from "react";
import { Key, Plus, X, Copy, CheckCircle2, Trash2, Globe, Zap, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { generateApiKey, revokeApiKey, createWebhook, deleteWebhook } from "@/app/actions/api-gateway";

const ALL_SCOPES = [
  "customers:read", "customers:write",
  "deliveries:read", "deliveries:write",
  "inventory:read", "inventory:write",
  "payments:read", "reports:read",
];

const WEBHOOK_EVENTS = [
  "delivery.completed", "delivery.pending",
  "payment.received", "customer.created",
  "inventory.low-stock", "document.expiring",
];

type ApiKey = { id: string; name: string; prefix: string; scopes: string[]; isActive: boolean; lastUsedAt: string | null; expiresAt: string | null; createdAt: string };
type Webhook = { id: string; url: string; events: string[]; isActive: boolean; createdAt: string };

export function ApiKeysClient({ apiKeys: initial, webhooks: initWh }: { apiKeys: ApiKey[]; webhooks: Webhook[] }) {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(initial);
  const [webhooks, setWebhooks] = useState<Webhook[]>(initWh);
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [showWHForm, setShowWHForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"keys" | "webhooks">("keys");

  const [keyForm, setKeyForm] = useState({ name: "", scopes: [] as string[], expiresInDays: "" });
  const [whForm, setWhForm] = useState({ url: "", events: [] as string[], secret: "" });
  const [showWHSecret, setShowWHSecret] = useState<string | null>(null);

  const toggleScope = (s: string) => setKeyForm((p) => ({ ...p, scopes: p.scopes.includes(s) ? p.scopes.filter((x) => x !== s) : [...p.scopes, s] }));
  const toggleEvent = (e: string) => setWhForm((p) => ({ ...p, events: p.events.includes(e) ? p.events.filter((x) => x !== e) : [...p.events, e] }));

  const handleGenerateKey = () => {
    if (!keyForm.name.trim()) { setError("Key name is required"); return; }
    if (keyForm.scopes.length === 0) { setError("Select at least one scope"); return; }
    startTransition(async () => {
      const result = await generateApiKey(keyForm.name, keyForm.scopes, keyForm.expiresInDays ? Number(keyForm.expiresInDays) : undefined);
      if ("error" in result) { setError(result.error ?? null); return; }
      const { rawKey, ...apiKey } = result.apiKey as unknown as ApiKey & { rawKey: string };
      setApiKeys((prev) => [apiKey, ...prev]);
      setNewRawKey(rawKey);
      setShowKeyForm(false);
      setKeyForm({ name: "", scopes: [], expiresInDays: "" });
      setError(null);
    });
  };

  const handleRevoke = (id: string) => {
    startTransition(async () => {
      await revokeApiKey(id);
      setApiKeys((prev) => prev.map((k) => k.id === id ? { ...k, isActive: false } : k));
    });
  };

  const handleCreateWebhook = () => {
    if (!whForm.url) { setError("Webhook URL is required"); return; }
    if (whForm.events.length === 0) { setError("Select at least one event"); return; }
    startTransition(async () => {
      const result = await createWebhook(whForm.url, whForm.events);
      if ("error" in result) { setError(result.error ?? null); return; }
      const { secret, ...wh } = result.webhook as unknown as Webhook & { secret: string };
      setWebhooks((prev) => [wh, ...prev]);
      setShowWHSecret(secret);
      setShowWHForm(false);
      setWhForm({ url: "", events: [], secret: "" });
      setError(null);
    });
  };

  const handleDeleteWebhook = (id: string) => {
    startTransition(async () => {
      await deleteWebhook(id);
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
    });
  };

  const copy = (text: string) => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight" style={{ color: "#18181B" }}>API Gateway</h1>
          <p className="text-[13px] mt-0.5" style={{ color: "#71717A" }}>Manage API keys and webhook integrations for third-party access</p>
        </div>
      </div>

      {/* New raw key banner */}
      {newRawKey && (
        <div className="mb-5 p-4 rounded-xl" style={{ background: "#F0FDF4", border: "1px solid #86EFAC" }}>
          <div className="flex items-start gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#16A34A" }} />
            <p className="text-[13px] font-semibold" style={{ color: "#15803D" }}>API key generated — copy it now! It will not be shown again.</p>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: "#DCFCE7", fontFamily: "monospace" }}>
            <span className="text-[13px] flex-1 break-all" style={{ color: "#166534" }}>{newRawKey}</span>
            <button onClick={() => copy(newRawKey)}>
              {copied ? <CheckCircle2 className="w-4 h-4" style={{ color: "#16A34A" }} /> : <Copy className="w-4 h-4" style={{ color: "#16A34A" }} />}
            </button>
          </div>
          <button onClick={() => setNewRawKey(null)} className="mt-2 text-[12px]" style={{ color: "#A1A1AA" }}>Dismiss</button>
        </div>
      )}

      {/* Webhook secret banner */}
      {showWHSecret && (
        <div className="mb-5 p-4 rounded-xl" style={{ background: "#EFF6FF", border: "1px solid #93C5FD" }}>
          <p className="text-[13px] font-semibold mb-2" style={{ color: "#1D4ED8" }}>Webhook signing secret — save it now!</p>
          <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: "#DBEAFE", fontFamily: "monospace" }}>
            <span className="text-[12px] flex-1 break-all" style={{ color: "#1E40AF" }}>{showWHSecret}</span>
            <button onClick={() => copy(showWHSecret)}>
              {copied ? <CheckCircle2 className="w-4 h-4" style={{ color: "#2563EB" }} /> : <Copy className="w-4 h-4" style={{ color: "#2563EB" }} />}
            </button>
          </div>
          <button onClick={() => setShowWHSecret(null)} className="mt-2 text-[12px]" style={{ color: "#A1A1AA" }}>Dismiss</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded-lg w-fit" style={{ background: "#F4F4F5" }}>
        {(["keys", "webhooks"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className="px-4 py-1.5 rounded-md text-[13px] font-medium transition-all"
            style={{ background: tab === t ? "#FFFFFF" : "transparent", color: tab === t ? "#18181B" : "#71717A", boxShadow: tab === t ? "0 1px 2px rgba(0,0,0,0.05)" : "none" }}>
            {t === "keys" ? `🔑 API Keys (${apiKeys.length})` : `🪝 Webhooks (${webhooks.length})`}
          </button>
        ))}
      </div>

      {/* API Keys tab */}
      {tab === "keys" && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowKeyForm(true)} className="btn btn-primary flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Generate Key
            </button>
          </div>

          {showKeyForm && (
            <div className="card mb-5">
              <div className="card-section flex items-center justify-between">
                <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>New API Key</p>
                <button onClick={() => setShowKeyForm(false)}><X className="w-4 h-4" style={{ color: "#A1A1AA" }} /></button>
              </div>
              <div className="p-5">
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Key Name *</label>
                    <input className="input" value={keyForm.name} onChange={(e) => setKeyForm({ ...keyForm, name: e.target.value })} placeholder="e.g. My Integration" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Expires in (days, blank = never)</label>
                    <input className="input" type="number" min="1" value={keyForm.expiresInDays} onChange={(e) => setKeyForm({ ...keyForm, expiresInDays: e.target.value })} placeholder="e.g. 365" />
                  </div>
                </div>
                <label className="block text-[12px] font-medium mb-2" style={{ color: "#52525B" }}>Scopes *</label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {ALL_SCOPES.map((s) => (
                    <button key={s} onClick={() => toggleScope(s)} className="px-2.5 py-1 rounded-md text-[12px] font-medium transition-all"
                      style={{ background: keyForm.scopes.includes(s) ? "#2563EB" : "#F4F4F5", color: keyForm.scopes.includes(s) ? "#fff" : "#52525B" }}>
                      {s}
                    </button>
                  ))}
                </div>
                {error && <p className="text-[12px] mb-3" style={{ color: "#DC2626" }}>{error}</p>}
                <div className="flex gap-2">
                  <button onClick={handleGenerateKey} disabled={isPending} className="btn btn-primary">{isPending ? "Generating…" : "Generate"}</button>
                  <button onClick={() => setShowKeyForm(false)} className="btn btn-secondary">Cancel</button>
                </div>
              </div>
            </div>
          )}

          <div className="card overflow-hidden">
            <table className="table">
              <thead><tr><th>Name</th><th>Prefix</th><th>Scopes</th><th>Last Used</th><th>Expires</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {apiKeys.length === 0 ? (
                  <tr><td colSpan={7} className="py-10 text-center text-[13px]" style={{ color: "#A1A1AA" }}>
                    <Key className="w-6 h-6 mx-auto mb-2 text-zinc-200" />No API keys yet
                  </td></tr>
                ) : apiKeys.map((k) => (
                  <tr key={k.id}>
                    <td><p className="font-medium text-[13px]">{k.name}</p></td>
                    <td><code className="text-[12px] px-1.5 py-0.5 rounded" style={{ background: "#F4F4F5", color: "#18181B" }}>{k.prefix}…</code></td>
                    <td><div className="flex flex-wrap gap-1">{k.scopes.map((s) => <span key={s} className="badge badge-blue text-[10px]">{s}</span>)}</div></td>
                    <td className="text-[12px] muted">{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString("en-IN") : "Never"}</td>
                    <td className="text-[12px] muted">{k.expiresAt ? new Date(k.expiresAt).toLocaleDateString("en-IN") : "Never"}</td>
                    <td><span className="badge" style={{ background: k.isActive ? "#DCFCE7" : "#F4F4F5", color: k.isActive ? "#15803D" : "#71717A" }}>{k.isActive ? "Active" : "Revoked"}</span></td>
                    <td>{k.isActive && <button onClick={() => handleRevoke(k.id)} className="text-[11px] px-2 py-1 rounded hover:bg-red-50 transition-colors" style={{ color: "#DC2626", border: "1px solid #FCA5A5" }}>Revoke</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Webhooks tab */}
      {tab === "webhooks" && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowWHForm(true)} className="btn btn-primary flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Webhook
            </button>
          </div>

          {showWHForm && (
            <div className="card mb-5">
              <div className="card-section flex items-center justify-between">
                <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>New Webhook</p>
                <button onClick={() => setShowWHForm(false)}><X className="w-4 h-4" style={{ color: "#A1A1AA" }} /></button>
              </div>
              <div className="p-5">
                <div className="mb-4">
                  <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#52525B" }}>Endpoint URL *</label>
                  <input className="input" type="url" value={whForm.url} onChange={(e) => setWhForm({ ...whForm, url: e.target.value })} placeholder="https://your-app.com/webhook" />
                </div>
                <label className="block text-[12px] font-medium mb-2" style={{ color: "#52525B" }}>Events to subscribe *</label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {WEBHOOK_EVENTS.map((ev) => (
                    <button key={ev} onClick={() => toggleEvent(ev)} className="px-2.5 py-1 rounded-md text-[12px] font-medium transition-all"
                      style={{ background: whForm.events.includes(ev) ? "#7C3AED" : "#F4F4F5", color: whForm.events.includes(ev) ? "#fff" : "#52525B" }}>
                      {ev}
                    </button>
                  ))}
                </div>
                {error && <p className="text-[12px] mb-3" style={{ color: "#DC2626" }}>{error}</p>}
                <div className="flex gap-2">
                  <button onClick={handleCreateWebhook} disabled={isPending} className="btn btn-primary">{isPending ? "Creating…" : "Create Webhook"}</button>
                  <button onClick={() => setShowWHForm(false)} className="btn btn-secondary">Cancel</button>
                </div>
              </div>
            </div>
          )}

          <div className="card overflow-hidden">
            <table className="table">
              <thead><tr><th>URL</th><th>Events</th><th>Status</th><th>Created</th><th></th></tr></thead>
              <tbody>
                {webhooks.length === 0 ? (
                  <tr><td colSpan={5} className="py-10 text-center text-[13px]" style={{ color: "#A1A1AA" }}>
                    <Globe className="w-6 h-6 mx-auto mb-2 text-zinc-200" />No webhooks configured
                  </td></tr>
                ) : webhooks.map((w) => (
                  <tr key={w.id}>
                    <td><code className="text-[12px]" style={{ color: "#2563EB" }}>{w.url}</code></td>
                    <td><div className="flex flex-wrap gap-1">{w.events.map((e) => <span key={e} className="badge text-[10px]" style={{ background: "#F5F3FF", color: "#6D28D9" }}>{e}</span>)}</div></td>
                    <td><span className="badge" style={{ background: w.isActive ? "#DCFCE7" : "#F4F4F5", color: w.isActive ? "#15803D" : "#71717A" }}>{w.isActive ? "Active" : "Inactive"}</span></td>
                    <td className="text-[12px] muted">{new Date(w.createdAt).toLocaleDateString("en-IN")}</td>
                    <td><button onClick={() => handleDeleteWebhook(w.id)} className="w-7 h-7 rounded flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
