"use client";

import { useActionState, useState } from "react";
import { updateAgencyBranding } from "@/app/actions/agency-settings";
import { Flame, Upload, X, Check, Eye } from "lucide-react";

interface BrandingConfigFormProps {
  initialName: string;
  initialSlug: string | null;
  initialThemeColor: string;
  initialLogoBase64: string | null;
}

const PRESET_COLORS = [
  { name: "Royal Blue (Default)", hex: "#2563eb" },
  { name: "Emerald Green", hex: "#10b981" },
  { name: "Warm Amber", hex: "#f59e0b" },
  { name: "Crimson Red", hex: "#ef4444" },
  { name: "Indigo Purple", hex: "#6366f1" },
  { name: "Slate Dark", hex: "#334155" },
];

export function BrandingConfigForm({
  initialName,
  initialSlug,
  initialThemeColor,
  initialLogoBase64,
}: BrandingConfigFormProps) {
  const [formState, actionFn, isPending] = useActionState(updateAgencyBranding, {});
  const [name, setName] = useState(initialName);
  const [themeColor, setThemeColor] = useState(initialThemeColor);
  const [logoPreview, setLogoPreview] = useState<string | null>(initialLogoBase64);
  const [clearLogo, setClearLogo] = useState(false);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024) {
        alert("File size must be under 1MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
        setClearLogo(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearLogo = () => {
    setLogoPreview(null);
    setClearLogo(true);
    // Reset file input value
    const fileInput = document.getElementById("logo-upload") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
      {/* ── Settings Form Panel ─────────────────────────────────── */}
      <div className="xl:col-span-7 bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
        <h2 className="text-base font-bold text-zinc-900 mb-1">Custom Branding Settings</h2>
        <p className="text-xs text-zinc-500 mb-6">
          Tailor the interface to match your corporate identity. Changes will apply to all employees.
        </p>

        {formState.error && (
          <div className="p-3 mb-4 text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {formState.error}
          </div>
        )}

        {formState.success && (
          <div className="p-3 mb-4 text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg">
            Branding settings updated successfully! Please refresh or navigate to see all changes.
          </div>
        )}

        <form action={actionFn} className="space-y-6">
          <input type="hidden" name="clearLogo" value={clearLogo ? "true" : "false"} />

          {/* Agency Name */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-2">Agency Name</label>
            <input
              type="text"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="e.g. Sharma Gas Agency"
              required
            />
          </div>

          {/* Subdomain (Read Only) */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-2">Workspace Subdomain</label>
            <div className="flex rounded-md shadow-xs">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-zinc-300 bg-zinc-50 text-zinc-500 text-xs font-mono select-none">
                {initialSlug || "default"}.localhost:3000
              </span>
              <input
                type="text"
                disabled
                className="input rounded-l-none bg-zinc-50 text-zinc-400 cursor-not-allowed font-medium text-xs"
                value="Active Subdomain"
              />
            </div>
            <p className="text-[11px] text-zinc-400 mt-1.5">
              Workspace subdomains are established during tenant registration and cannot be modified.
            </p>
          </div>

          {/* Brand Theme Color */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-2">Brand Theme Color</label>
            <div className="flex items-center gap-3 mb-4">
              <input
                type="color"
                name="themeColor"
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
                className="w-10 h-10 border border-zinc-300 rounded-lg cursor-pointer p-0 bg-transparent flex-shrink-0"
              />
              <input
                type="text"
                value={themeColor.toUpperCase()}
                onChange={(e) => setThemeColor(e.target.value)}
                maxLength={7}
                className="input w-28 text-center font-mono text-xs"
                placeholder="#000000"
              />
            </div>

            {/* Presets */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRESET_COLORS.map((preset) => {
                const isActive = themeColor.toLowerCase() === preset.hex.toLowerCase();
                return (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => setThemeColor(preset.hex)}
                    className={`flex items-center gap-2 p-2 border rounded-lg text-left text-xs transition-all ${
                      isActive
                        ? "border-zinc-900 bg-zinc-50 font-medium"
                        : "border-zinc-200 hover:bg-zinc-50"
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0 border border-black/10"
                      style={{ backgroundColor: preset.hex }}
                    />
                    <span className="truncate text-[11px]">{preset.name}</span>
                    {isActive && <Check className="w-3.5 h-3.5 ml-auto text-zinc-900 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Logo Upload */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-2">Custom Portal Logo</label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="relative w-32 h-14 bg-zinc-50 border border-dashed border-zinc-300 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                {logoPreview ? (
                  <>
                    <img src={logoPreview} alt="Logo preview" className="max-w-full max-h-full object-contain p-2" />
                    <button
                      type="button"
                      onClick={handleClearLogo}
                      className="absolute top-1 right-1 p-0.5 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors"
                      title="Remove logo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center text-zinc-400 p-2 text-center">
                    <Flame className="w-5 h-5 text-zinc-300 mb-0.5" />
                    <span className="text-[9px] font-mono leading-none">Default Icon</span>
                  </div>
                )}
              </div>

              <div className="flex-1">
                <input
                  type="file"
                  id="logo-upload"
                  name="logo"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={handleLogoChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => document.getElementById("logo-upload")?.click()}
                  className="btn btn-secondary w-full sm:w-auto justify-center text-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload Image
                </button>
                <p className="text-[11px] text-zinc-400 mt-2">
                  Format: PNG or JPG. Max file size: 1MB. Recommend aspect ratio 3:1 or horizontal logo.
                </p>
              </div>
            </div>
          </div>

          <div className="divider" />

          {/* Submit */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="btn text-white hover:brightness-95 transition-all font-semibold rounded-lg px-6 flex items-center justify-center gap-2"
              style={{ backgroundColor: themeColor }}
            >
              {isPending ? "Saving Changes..." : "Save Branding Configuration"}
            </button>
          </div>
        </form>
      </div>

      {/* ── Live Preview Mock-up Panel ───────────────────────────── */}
      <div className="xl:col-span-5 flex flex-col gap-4">
        <div className="bg-zinc-900 rounded-xl p-4 text-white flex items-center gap-2 shadow-sm">
          <Eye className="w-4 h-4 text-zinc-400" />
          <span className="text-xs font-semibold">Real-Time Interface Mock-up</span>
        </div>

        {/* Mockup Container */}
        <div className="border border-zinc-200 rounded-xl overflow-hidden shadow-sm bg-zinc-50 aspect-video flex flex-col flex-1 min-h-[360px]">
          {/* Header Bar */}
          <div className="bg-white border-b border-zinc-200 px-4 py-2.5 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
            </div>
            <span className="text-[10px] font-mono text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded">
              distributor-preview
            </span>
          </div>

          {/* Layout Body */}
          <div className="flex flex-1 min-h-0">
            {/* Mock Sidebar */}
            <div className="w-36 border-r border-zinc-200 bg-white flex flex-col justify-between p-2.5 flex-shrink-0">
              <div className="space-y-4">
                {/* Logo wrapper */}
                <div className="flex items-center gap-1.5 pb-2 border-b border-zinc-100">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="w-5 h-5 object-contain" />
                  ) : (
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center text-[10px] text-white flex-shrink-0"
                      style={{ backgroundColor: themeColor }}
                    >
                      <Flame className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <span className="text-[10px] font-bold text-zinc-800 truncate max-w-[90px]">
                    {name || "GasAgency"}
                  </span>
                </div>

                {/* Mock nav items */}
                <div className="space-y-1.5">
                  <div
                    className="flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-medium"
                    style={{ backgroundColor: `${themeColor}12`, color: themeColor }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: themeColor }} />
                    Dashboard
                  </div>
                  {["Inventory", "Godown", "Customers", "Staff"].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-1.5 px-2 py-1 rounded text-[9px] text-zinc-500 hover:bg-zinc-50 cursor-pointer"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {/* Mock footer user */}
              <div className="border-t border-zinc-100 pt-2 flex items-center gap-1.5">
                <div
                  className="w-4.5 h-4.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: themeColor }}
                >
                  JD
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[8px] font-semibold text-zinc-800 leading-none truncate">John Doe</p>
                  <p className="text-[7px] text-zinc-400 leading-none">Distributor Admin</p>
                </div>
              </div>
            </div>

            {/* Mock Main Content Area */}
            <div className="flex-1 p-3.5 overflow-y-auto">
              <div className="flex items-center justify-between mb-3.5">
                <h3 className="text-[11px] font-bold text-zinc-800">Inventory Status</h3>
                <span className="text-[8px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">
                  Active
                </span>
              </div>

              {/* Sample Card */}
              <div className="bg-white border border-zinc-200 rounded-lg p-3 shadow-xs space-y-3">
                <div className="space-y-1">
                  <span className="text-[7px] font-bold text-zinc-400 uppercase tracking-wider">
                    Total Cylinder Count
                  </span>
                  <p className="text-sm font-extrabold text-zinc-950">1,240 Cylinders</p>
                </div>

                <div className="divider" />

                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[8px] font-medium text-zinc-500 mb-1">
                      Quick Filter
                    </label>
                    <input
                      type="text"
                      className="input py-1 px-2 text-[9px]"
                      placeholder="Search cylinders..."
                      readOnly
                      style={{
                        borderColor: themeColor,
                        boxShadow: `0 0 0 1px ${themeColor}22`,
                      }}
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn text-white justify-center text-[9px] py-1 px-3 flex-1 font-semibold rounded-md cursor-default"
                      style={{ backgroundColor: themeColor }}
                    >
                      Export Report
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary justify-center text-[9px] py-1 px-3 flex-1 font-semibold rounded-md border-zinc-200 cursor-default"
                    >
                      Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
