"use client";

import { useState, useTransition, useRef } from "react";
import {
  UserProfileData,
  updateUserProfile,
  uploadProfileAvatarAction,
  removeProfileAvatarAction,
} from "@/app/actions/profile";
import { cancelSecurityChangeRequest } from "@/app/actions/security-requests";
import { TwoFactorToggle } from "@/components/auth/TwoFactorToggle";
import { CredentialChangeModal } from "@/components/profile/CredentialChangeModal";
import {
  User,
  Mail,
  Phone,
  Shield,
  ShieldCheck,
  KeyRound,
  Hash,
  Camera,
  Trash2,
  Edit3,
  Save,
  X,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Lock,
  Loader2,
  CreditCard,
  History,
  ChevronRight,
  CalendarDays,
} from "lucide-react";

interface UserProfileViewProps {
  initialProfile: UserProfileData;
}

const ROLE_DISPLAY: Record<string, { label: string; badge: string }> = {
  ADMIN: {
    label: "Administrator",
    badge: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800/60",
  },
  MANAGER: {
    label: "Manager",
    badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/60",
  },
  GODOWN_KEEPER: {
    label: "Godown Keeper",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60",
  },
  CASHIER: {
    label: "Cashier",
    badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60",
  },
  STAFF: {
    label: "Staff Member",
    badge: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/50 dark:text-cyan-300 dark:border-cyan-800/60",
  },
  DELIVERY_BOY: {
    label: "Delivery Boy",
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800/60",
  },
};

export function UserProfileView({ initialProfile }: UserProfileViewProps) {
  const [profile, setProfile] = useState<UserProfileData>(initialProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: initialProfile.name,
    phone: initialProfile.phone || "",
    bankAccountNo: initialProfile.bankAccountNo || "",
    bankName: initialProfile.bankName || "",
    ifscCode: initialProfile.ifscCode || "",
  });

  const [activeTab, setActiveTab] = useState<"overview" | "security" | "history">("overview");

  // Credential Modal State
  const [credentialModalOpen, setCredentialModalOpen] = useState(false);
  const [credentialType, setCredentialType] = useState<"CHANGE_PASSWORD" | "CHANGE_PIN">("CHANGE_PASSWORD");
  const [useApprovalToken, setUseApprovalToken] = useState<string | null>(null);

  // Avatar Upload State
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const roleMeta = ROLE_DISPLAY[profile.role] || {
    label: profile.role,
    badge: "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
  };

  // Calculate Security Health Score
  const securityChecks = [
    { label: "Two-Factor Auth (2FA)", passed: profile.twoFactorEnabled, weight: 40 },
    { label: "Quick Login PIN", passed: profile.hasPin, weight: 30 },
    { label: "Encrypted Password", passed: true, weight: 30 },
  ];
  const securityScore = securityChecks.reduce((acc, c) => acc + (c.passed ? c.weight : 0), 0);

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsUploadingAvatar(true);

    const fd = new FormData();
    fd.append("avatar", file);

    const res = await uploadProfileAvatarAction(fd);
    setIsUploadingAvatar(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else if (res.url) {
      setProfile((prev) => ({ ...prev, avatarUrl: res.url! }));
      setSuccessMsg("Profile photo updated!");
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handleRemoveAvatar = () => {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await removeProfileAvatarAction();
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setProfile((prev) => ({ ...prev, avatarUrl: null, photoBase64: null }));
        setSuccessMsg("Profile photo removed.");
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    });
  };

  const handleCancelEdit = () => {
    setFormData({
      name: profile.name,
      phone: profile.phone || "",
      bankAccountNo: profile.bankAccountNo || "",
      bankName: profile.bankName || "",
      ifscCode: profile.ifscCode || "",
    });
    setIsEditing(false);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const fd = new FormData();
    fd.append("name", formData.name);
    fd.append("phone", formData.phone);
    fd.append("bankAccountNo", formData.bankAccountNo);
    fd.append("bankName", formData.bankName);
    fd.append("ifscCode", formData.ifscCode);

    startTransition(async () => {
      const res = await updateUserProfile(fd);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setProfile((prev) => ({
          ...prev,
          name: formData.name,
          phone: formData.phone || null,
          bankAccountNo: formData.bankAccountNo || null,
          bankName: formData.bankName || null,
          ifscCode: formData.ifscCode || null,
        }));
        setIsEditing(false);
        setSuccessMsg("Profile details saved!");
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    });
  };

  const handleCancelPendingRequest = (reqId: string) => {
    startTransition(async () => {
      const res = await cancelSecurityChangeRequest(reqId);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setProfile((prev) => ({
          ...prev,
          activeRequest: null,
          requestHistory: prev.requestHistory.filter((r) => r.id !== reqId),
        }));
        setSuccessMsg("Request cancelled.");
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    });
  };

  const avatarDisplayUrl = profile.avatarUrl || profile.photoBase64;

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-12">
      {/* ── Status Alerts ── */}
      {errorMsg && (
        <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-2xl text-xs text-red-700 dark:text-red-300 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="p-1 text-red-400 hover:text-red-700 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="p-1 text-emerald-400 hover:text-emerald-700 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Clean Hero Header Card ── */}
      <div className="rounded-3xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs overflow-hidden">
        <div className="h-24 sm:h-28 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_60%)]" />
        </div>

        <div className="px-4 sm:px-6 pb-5">
          {/* Avatar + Primary Action */}
          <div className="flex items-end justify-between gap-3 -mt-12 sm:-mt-14 mb-4">
            <div className="relative">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl ring-4 ring-white dark:ring-zinc-900 overflow-hidden bg-zinc-100 dark:bg-zinc-800 shadow-md flex items-center justify-center">
                {isUploadingAvatar ? (
                  <div className="flex flex-col items-center justify-center gap-1 text-blue-600">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="text-[10px] font-semibold">Uploading</span>
                  </div>
                ) : avatarDisplayUrl ? (
                  <img
                    src={avatarDisplayUrl}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-3xl">
                    {profile.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Always-visible Camera Button (works great on mobile & desktop) */}
              <button
                type="button"
                title="Change profile photo"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-md ring-2 ring-white dark:ring-zinc-900 transition-colors cursor-pointer touch-manipulation"
              >
                <Camera className="w-4 h-4" />
              </button>

              {avatarDisplayUrl && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  title="Remove photo"
                  className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-sm ring-2 ring-white dark:ring-zinc-900 transition-colors cursor-pointer touch-manipulation"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                className="hidden"
                onChange={handleAvatarFileSelect}
              />
            </div>

            {/* Edit / Save Action */}
            <div className="flex items-center gap-2 pt-2">
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("overview");
                    setIsEditing(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs transition-colors touch-manipulation"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Profile
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors touch-manipulation"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors disabled:opacity-60 touch-manipulation"
                  >
                    {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Name, Role & Contact Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
                  {profile.name}
                </h1>
                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${roleMeta.badge}`}>
                  {roleMeta.label}
                </span>
                {profile.customRole && (
                  <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                    {profile.customRole}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-zinc-400" />
                  {profile.email}
                </span>
                {profile.phone && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-zinc-400" />
                    {profile.phone}
                  </span>
                )}
                {profile.agency && (
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                    {profile.agency.name}
                  </span>
                )}
              </div>
            </div>

            {/* Compact Security Score Pill */}
            <button
              type="button"
              onClick={() => setActiveTab("security")}
              className="flex items-center justify-between sm:justify-start gap-3 px-4 py-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors text-left touch-manipulation"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    securityScore >= 90
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                      : securityScore >= 60
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                      : "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400"
                  }`}
                >
                  <ShieldCheck className="w-4.5 h-4.5" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Account Security</p>
                  <p className="text-sm font-bold text-zinc-900 dark:text-white">{securityScore}% Protected</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400 sm:hidden" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Simple Pill Tabs ── */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-zinc-100/90 dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 overflow-x-auto">
        {[
          { id: "overview", label: "Personal Info", icon: User },
          { id: "security", label: "Security & Login", icon: Shield },
          { id: "history", label: "Activity History", icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 min-w-[110px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all whitespace-nowrap touch-manipulation ${
                isActive
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-blue-600 dark:text-blue-400" : ""}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Active Security Request Banner ── */}
      {profile.activeRequest && (
        <div>
          {profile.activeRequest.status === "PENDING" && (
            <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    Approval Pending: {profile.activeRequest.type === "CHANGE_PASSWORD" ? "Password" : "PIN"} Change
                  </h4>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                    Submitted on {new Date(profile.activeRequest.createdAt).toLocaleDateString()}.
                    {profile.activeRequest.userNote && ` Note: "${profile.activeRequest.userNote}"`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCancelPendingRequest(profile.activeRequest!.id)}
                disabled={isPending}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-zinc-900 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 hover:bg-amber-100 transition-colors flex-shrink-0"
              >
                Cancel Request
              </button>
            </div>
          )}

          {profile.activeRequest.status === "APPROVED" && (
            <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    Approved! Ready to update {profile.activeRequest.type === "CHANGE_PASSWORD" ? "Password" : "PIN"}
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                    Administrator approved your request.
                    {profile.activeRequest.adminResponseNote && ` Note: "${profile.activeRequest.adminResponseNote}"`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCredentialType(profile.activeRequest!.type);
                  setUseApprovalToken(profile.activeRequest!.approvalToken);
                  setCredentialModalOpen(true);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex-shrink-0"
              >
                Set New {profile.activeRequest.type === "CHANGE_PASSWORD" ? "Password" : "PIN"}
              </button>
            </div>
          )}

          {profile.activeRequest.status === "REJECTED" && (
            <div className="p-4 rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-red-900 dark:text-red-200">Request Rejected</h4>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                    {profile.activeRequest.adminResponseNote
                      ? `Reason: "${profile.activeRequest.adminResponseNote}"`
                      : "Your security change request was rejected."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProfile((prev) => ({ ...prev, activeRequest: null }))}
                className="px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1: PERSONAL INFO
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "overview" && (
        <form onSubmit={handleSaveProfile} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            {/* Personal Details Card */}
            <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 sm:p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Personal Information</h3>
                    <p className="text-[11px] text-zinc-400">Your basic account &amp; contact details</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-zinc-50/70 dark:bg-zinc-950/40 border border-zinc-100 dark:border-zinc-800/80">
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1">Full Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full h-9 px-3 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">{profile.name}</p>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-zinc-50/70 dark:bg-zinc-950/40 border border-zinc-100 dark:border-zinc-800/80">
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1">Phone Number</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="e.g. 9876543210"
                      className="w-full h-9 px-3 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                      {profile.phone || <span className="text-zinc-400 font-normal">Not added</span>}
                    </p>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-zinc-50/70 dark:bg-zinc-950/40 border border-zinc-100 dark:border-zinc-800/80">
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1">Email Address</label>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5 break-all">
                    {profile.email}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-50/70 dark:bg-zinc-950/40 border border-zinc-100 dark:border-zinc-800/80">
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1">Member Since</label>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-zinc-400" />
                    {new Date(profile.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Bank Details Card */}
            <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 sm:p-6 shadow-xs space-y-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Bank &amp; Salary Details</h3>
                  <p className="text-[11px] text-zinc-400">Used for salary &amp; reimbursement payouts</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3 rounded-xl bg-zinc-50/70 dark:bg-zinc-950/40 border border-zinc-100 dark:border-zinc-800/80">
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1">Bank Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      placeholder="e.g. SBI"
                      className="w-full h-9 px-3 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                      {profile.bankName || <span className="text-zinc-400 font-normal">—</span>}
                    </p>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-zinc-50/70 dark:bg-zinc-950/40 border border-zinc-100 dark:border-zinc-800/80">
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1">Account Number</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.bankAccountNo}
                      onChange={(e) => setFormData({ ...formData, bankAccountNo: e.target.value })}
                      placeholder="Account number"
                      className="w-full h-9 px-3 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                      {profile.bankAccountNo ? (
                        `•••• ${profile.bankAccountNo.slice(-4)}`
                      ) : (
                        <span className="text-zinc-400 font-normal">—</span>
                      )}
                    </p>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-zinc-50/70 dark:bg-zinc-950/40 border border-zinc-100 dark:border-zinc-800/80">
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1">IFSC Code</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.ifscCode}
                      onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                      placeholder="SBIN0001234"
                      className="w-full h-9 px-3 text-sm font-mono uppercase rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  ) : (
                    <p className="text-sm font-semibold font-mono text-zinc-900 dark:text-white">
                      {profile.ifscCode || <span className="text-zinc-400 font-normal">—</span>}
                    </p>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-4 py-2 text-xs font-semibold rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors disabled:opacity-60"
                  >
                    {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Security Quick Status */}
          <div className="space-y-5">
            <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                  Security Status
                </h4>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{securityScore}%</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    securityScore >= 90
                      ? "bg-emerald-500"
                      : securityScore >= 60
                      ? "bg-amber-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${securityScore}%` }}
                />
              </div>

              <div className="space-y-2.5 pt-1">
                {securityChecks.map((check, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs py-1.5 border-b border-zinc-100 dark:border-zinc-800/70 last:border-0"
                  >
                    <span className="text-zinc-600 dark:text-zinc-400">{check.label}</span>
                    <span
                      className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                        check.passed
                          ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300"
                          : "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300"
                      }`}
                    >
                      {check.passed ? "Active" : "Off"}
                    </span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setActiveTab("security")}
                className="w-full py-2.5 px-3 text-xs font-semibold rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white transition-colors flex items-center justify-center gap-1.5"
              >
                <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Manage Security
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2: SECURITY & LOGIN
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "security" && (
        <div className="space-y-5">
          <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-3">
            <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Protected Credentials</p>
              <p className="text-[11px] leading-relaxed mt-0.5 text-blue-800/80 dark:text-blue-300">
                Changing your password or login PIN requires <strong>Two-Factor Authentication (2FA)</strong> or{" "}
                <strong>Administrator approval</strong>.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Password Card */}
            <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Password</h3>
                      <p className="text-[11px] text-zinc-400">Main account login</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                    Active
                  </span>
                </div>

                <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-zinc-100 dark:border-zinc-800 space-y-1">
                  <div className="font-mono text-base tracking-[0.3em] font-bold text-zinc-800 dark:text-zinc-200">
                    ••••••••••••
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    {profile.passwordChangedAt
                      ? `Updated ${new Date(profile.passwordChangedAt).toLocaleDateString()}`
                      : "Encrypted with bcrypt"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCredentialType("CHANGE_PASSWORD");
                  setUseApprovalToken(
                    profile.activeRequest?.status === "APPROVED" ? profile.activeRequest.approvalToken : null
                  );
                  setCredentialModalOpen(true);
                }}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Change Password
              </button>
            </div>

            {/* Quick PIN Card */}
            <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <Hash className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Quick Login PIN</h3>
                      <p className="text-[11px] text-zinc-400">4–6 digit mobile sign-in</p>
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                      profile.hasPin
                        ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                        : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
                    }`}
                  >
                    {profile.hasPin ? "Set" : "Not Set"}
                  </span>
                </div>

                <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-zinc-100 dark:border-zinc-800 space-y-1">
                  <div className="font-mono text-base tracking-[0.35em] font-bold text-zinc-800 dark:text-zinc-200">
                    {profile.hasPin ? "••••" : <span className="text-zinc-400 text-xs font-normal tracking-normal">No PIN configured</span>}
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    {profile.hasPin ? "Numeric 4–6 digit PIN enabled" : "Set a PIN for faster mobile login"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCredentialType("CHANGE_PIN");
                  setUseApprovalToken(
                    profile.activeRequest?.status === "APPROVED" ? profile.activeRequest.approvalToken : null
                  );
                  setCredentialModalOpen(true);
                }}
                className="w-full py-2.5 px-4 text-xs font-semibold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <Hash className="w-3.5 h-3.5" />
                {profile.hasPin ? "Change PIN" : "Set Login PIN"}
              </button>
            </div>
          </div>

          {/* 2FA Card */}
          <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 sm:p-6 shadow-xs">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4.5 h-4.5 text-blue-600" />
              Two-Factor Authentication (2FA)
            </h3>
            <TwoFactorToggle
              variant="card"
              onStatusChange={(enabled) => setProfile((prev) => ({ ...prev, twoFactorEnabled: enabled }))}
            />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 3: ACTIVITY HISTORY
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "history" && (
        <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
          <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
              Security Request History
            </h3>
            <span className="text-[11px] font-medium text-zinc-400">
              {profile.requestHistory.length} record{profile.requestHistory.length === 1 ? "" : "s"}
            </span>
          </div>

          {profile.requestHistory.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <History className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto" />
              <p className="text-xs font-medium text-zinc-500">No security change requests yet</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {profile.requestHistory.map((req) => (
                <div key={req.id} className="p-4 sm:px-5 flex items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-900 dark:text-white">
                        {req.type === "CHANGE_PASSWORD" ? "Password Change" : "PIN Change"}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          req.status === "COMPLETED"
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                            : req.status === "APPROVED"
                            ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                            : req.status === "PENDING"
                            ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
                            : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300"
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>
                    {req.userNote && (
                      <p className="text-[11px] text-zinc-500">Note: &ldquo;{req.userNote}&rdquo;</p>
                    )}
                    {req.adminResponseNote && (
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium">
                        Admin: &ldquo;{req.adminResponseNote}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="text-right text-[11px] text-zinc-400 flex-shrink-0">
                    <p>{new Date(req.createdAt).toLocaleDateString()}</p>
                    <p className="text-[10px]">
                      {new Date(req.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Credential Change Modal ── */}
      <CredentialChangeModal
        isOpen={credentialModalOpen}
        onClose={() => {
          setCredentialModalOpen(false);
          setUseApprovalToken(null);
        }}
        type={credentialType}
        hasMFA={profile.twoFactorEnabled}
        approvalToken={useApprovalToken}
        onSuccess={() => {
          setSuccessMsg("Credential updated successfully!");
          window.location.reload();
        }}
        onOpenMfaSetup={() => {
          setActiveTab("security");
        }}
      />
    </div>
  );
}
