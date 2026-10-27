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
  ShieldAlert,
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
  Building,
  Calendar,
  Lock,
  Loader2,
  Sparkles,
  ExternalLink,
  CreditCard,
  History,
} from "lucide-react";
import Image from "next/image";

interface UserProfileViewProps {
  initialProfile: UserProfileData;
}

const ROLE_DISPLAY: Record<string, { label: string; color: string }> = {
  ADMIN: { label: "Administrator", color: "bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200" },
  MANAGER: { label: "Manager", color: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200" },
  GODOWN_KEEPER: { label: "Godown Keeper", color: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200" },
  CASHIER: { label: "Cashier", color: "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200" },
  STAFF: { label: "Staff Member", color: "bg-cyan-100 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200" },
  DELIVERY_BOY: { label: "Delivery Boy", color: "bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200" },
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

  const roleMeta = ROLE_DISPLAY[profile.role] || { label: profile.role, color: "bg-zinc-100 text-zinc-700" };

  // Calculate Security Health Score
  const securityChecks = [
    { label: "Two-Factor Authentication", passed: profile.twoFactorEnabled, weight: 40 },
    { label: "Security Login PIN", passed: profile.hasPin, weight: 30 },
    { label: "Encrypted Password", passed: true, weight: 30 },
  ];
  const securityScore = securityChecks.reduce((acc, c) => acc + (c.passed ? c.weight : 0), 0);

  // ── Handle Profile Avatar Upload to Cloudinary ──────────────────────────────
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
      setSuccessMsg("Profile photo uploaded to Cloudinary successfully!");
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

  // ── Handle Save Profile Info ────────────────────────────────────────────────
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
        setSuccessMsg("Personal details updated successfully!");
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    });
  };

  // ── Cancel Pending Request ──────────────────────────────────────────────────
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
        setSuccessMsg("Request cancelled successfully.");
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    });
  };

  const avatarDisplayUrl = profile.avatarUrl || profile.photoBase64;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* ── Toast Messages ── */}
      {errorMsg && (
        <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Top Hero Profile Card ── */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
        {/* Banner Pattern */}
        <div className="h-28 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative opacity-95">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent" />
        </div>

        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-14 mb-4">
            {/* Interactive Cloudinary Avatar */}
            <div className="relative group">
              <div className="w-24 h-24 rounded-2xl ring-4 ring-white dark:ring-zinc-900 overflow-hidden bg-zinc-100 dark:bg-zinc-800 shadow-md relative flex items-center justify-center">
                {isUploadingAvatar ? (
                  <div className="flex flex-col items-center justify-center gap-1 text-blue-600">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="text-[10px] font-semibold">Uploading...</span>
                  </div>
                ) : avatarDisplayUrl ? (
                  <img
                    src={avatarDisplayUrl}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-2xl">
                    {profile.name.charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Cloudinary Upload Hover Overlay */}
                <button
                  type="button"
                  title="Upload profile photo to Cloudinary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-xs"
                >
                  <Camera className="w-5 h-5 mb-0.5" />
                  <span className="text-[10px] font-medium">Change Photo</span>
                </button>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                className="hidden"
                onChange={handleAvatarFileSelect}
              />

              {avatarDisplayUrl && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  title="Remove photo"
                  className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center shadow-sm hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Profile Actions */}
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Details
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-2 text-xs font-medium rounded-lg text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={isPending}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all"
                  >
                    {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Name & Role Information */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-zinc-900 dark:text-white">{profile.name}</h1>
                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${roleMeta.color}`}>
                  {roleMeta.label}
                </span>
                {profile.customRole && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                    {profile.customRole}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-zinc-400" />
                  {profile.email}
                </span>
                {profile.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-zinc-400" />
                    {profile.phone}
                  </span>
                )}
                {profile.agency && (
                  <span className="flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-zinc-400" />
                    {profile.agency.name}
                  </span>
                )}
              </p>
            </div>

            {/* Security Health Score Widget */}
            <div className="flex items-center gap-3 p-2.5 px-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
              <div className="text-right">
                <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Security Score</p>
                <p className="text-sm font-bold text-zinc-900 dark:text-white">{securityScore}%</p>
              </div>
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                  securityScore >= 90
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                    : securityScore >= 60
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                    : "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400"
                }`}
              >
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-t border-zinc-200 dark:border-zinc-800 px-6 bg-zinc-50/50 dark:bg-zinc-950/20">
          {[
            { id: "overview", label: "Overview & Personal Info", icon: User },
            { id: "security", label: "Credentials & 2FA Security", icon: Shield },
            { id: "history", label: "Request History", icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 py-3 px-3.5 text-xs font-semibold border-b-2 transition-all ${
                  isActive
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── ACTIVE SECURITY REQUEST BANNER ── */}
      {profile.activeRequest && (
        <div className="space-y-3">
          {profile.activeRequest.status === "PENDING" && (
            <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    Administrator Approval Pending: {profile.activeRequest.type === "CHANGE_PASSWORD" ? "Password" : "PIN"} Change
                  </h4>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                    Your request submitted on {new Date(profile.activeRequest.createdAt).toLocaleDateString()} is awaiting administrator review.
                    {profile.activeRequest.userNote && ` Reason: "${profile.activeRequest.userNote}"`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCancelPendingRequest(profile.activeRequest!.id)}
                disabled={isPending}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-zinc-900 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 hover:bg-amber-100 transition-colors flex-shrink-0"
              >
                Cancel Request
              </button>
            </div>
          )}

          {profile.activeRequest.status === "APPROVED" && (
            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    Request Approved by Administrator!
                  </h4>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                    You have been granted permission to set your new {profile.activeRequest.type === "CHANGE_PASSWORD" ? "password" : "PIN"}.
                    {profile.activeRequest.adminResponseNote && ` Admin note: "${profile.activeRequest.adminResponseNote}"`}
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
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all flex-shrink-0"
              >
                Set New {profile.activeRequest.type === "CHANGE_PASSWORD" ? "Password" : "PIN"} Now
              </button>
            </div>
          )}

          {profile.activeRequest.status === "REJECTED" && (
            <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-red-900 dark:text-red-200">
                    Request Rejected by Administrator
                  </h4>
                  <p className="text-[11px] text-red-700 dark:text-red-300 mt-0.5">
                    Your request was reviewed and rejected.
                    {profile.activeRequest.adminResponseNote && (
                      <span className="font-semibold"> Reason: &ldquo;{profile.activeRequest.adminResponseNote}&rdquo;</span>
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setProfile((prev) => ({ ...prev, activeRequest: null }));
                }}
                className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1: OVERVIEW & PERSONAL INFORMATION
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="md:col-span-2 space-y-6">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                Personal Profile Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1">Full Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full h-9 px-3 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  ) : (
                    <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{profile.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1">Email Address (Read-only)</label>
                  <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    {profile.email}
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1">Phone Number</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="e.g. 9876543210"
                      className="w-full h-9 px-3 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  ) : (
                    <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      {profile.phone || <span className="text-zinc-400 font-normal">Not configured</span>}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1">Account Role</label>
                  <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{roleMeta.label}</p>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1">Member Since</label>
                  <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    {new Date(profile.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1">Agency Affiliation</label>
                  <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    {profile.agency?.name || "Independent"}
                  </p>
                </div>
              </div>
            </div>

            {/* Bank Details */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                Bank &amp; Payment Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1">Bank Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      placeholder="e.g. State Bank of India"
                      className="w-full h-9 px-3 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  ) : (
                    <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      {profile.bankName || <span className="text-zinc-400 font-normal">—</span>}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1">Account Number</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.bankAccountNo}
                      onChange={(e) => setFormData({ ...formData, bankAccountNo: e.target.value })}
                      placeholder="e.g. 123456789012"
                      className="w-full h-9 px-3 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  ) : (
                    <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      {profile.bankAccountNo ? `••••••••${profile.bankAccountNo.slice(-4)}` : <span className="text-zinc-400 font-normal">—</span>}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1">IFSC Code</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.ifscCode}
                      onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                      placeholder="e.g. SBIN0001234"
                      className="w-full h-9 px-3 text-xs font-mono uppercase rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  ) : (
                    <p className="text-xs font-semibold font-mono text-zinc-800 dark:text-zinc-200">
                      {profile.ifscCode || <span className="text-zinc-400 font-normal">—</span>}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Security Summary Sidebar */}
          <div className="space-y-6">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs space-y-4">
              <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                Security Checklist
              </h4>

              <div className="space-y-3">
                {securityChecks.map((check, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-zinc-600 dark:text-zinc-400">{check.label}</span>
                    <span
                      className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                        check.passed
                          ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                          : "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
                      }`}
                    >
                      {check.passed ? "Active" : "Disabled"}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setActiveTab("security")}
                  className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Manage Security &amp; Credentials
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2: CREDENTIALS & 2FA SECURITY (ENCRYPTED MODE DISPLAY)
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "security" && (
        <div className="space-y-6">
          {/* Section Description */}
          <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-3">
            <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Security Credential Safeguard</p>
              <p className="text-[11px] leading-relaxed mt-0.5 text-blue-800/90 dark:text-blue-300">
                Passwords and numeric PINs are one-way hashed with bcrypt and displayed in encrypted mode. Updating credentials requires either <strong>active Google Authenticator (TOTP) verification</strong> or <strong>Administrator authorization</strong>.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ── CARD A: PASSWORD IN ENCRYPTED MODE ── */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Account Password</h3>
                    <p className="text-[11px] text-zinc-400">Standard system login credential</p>
                  </div>
                </div>

                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                  Protected
                </span>
              </div>

              {/* Encrypted Representation Display */}
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200/80 dark:border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-zinc-500">Stored Password</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    Bcrypt (Salt 12)
                  </span>
                </div>
                <div className="font-mono text-base tracking-[0.3em] font-bold text-zinc-800 dark:text-zinc-200">
                  ••••••••••••••••
                </div>
                <p className="text-[10px] text-zinc-400">
                  {profile.passwordChangedAt
                    ? `Last updated on ${new Date(profile.passwordChangedAt).toLocaleDateString()}`
                    : "Active password"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCredentialType("CHANGE_PASSWORD");
                  setUseApprovalToken(profile.activeRequest?.status === "APPROVED" ? profile.activeRequest.approvalToken : null);
                  setCredentialModalOpen(true);
                }}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Change Password
              </button>
            </div>

            {/* ── CARD B: SECURITY LOGIN PIN IN ENCRYPTED MODE ── */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                    <Hash className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Security Login PIN</h3>
                    <p className="text-[11px] text-zinc-400">4–6 digit numeric quick login</p>
                  </div>
                </div>

                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    profile.hasPin
                      ? "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                      : "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
                  }`}
                >
                  {profile.hasPin ? "Configured" : "Not Set"}
                </span>
              </div>

              {/* Encrypted PIN Display */}
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200/80 dark:border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-zinc-500">Stored PIN</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    Bcrypt (Salt 10)
                  </span>
                </div>
                <div className="font-mono text-base tracking-[0.35em] font-bold text-zinc-800 dark:text-zinc-200">
                  {profile.hasPin ? "••••" : <span className="text-zinc-400 text-xs font-normal">No PIN Set</span>}
                </div>
                <p className="text-[10px] text-zinc-400">
                  {profile.hasPin ? "Strictly numbers only (4 to 6 digits)" : "Configure a PIN for fast mobile sign in"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCredentialType("CHANGE_PIN");
                  setUseApprovalToken(profile.activeRequest?.status === "APPROVED" ? profile.activeRequest.approvalToken : null);
                  setCredentialModalOpen(true);
                }}
                className="w-full py-2.5 px-4 text-xs font-semibold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <Hash className="w-3.5 h-3.5" />
                {profile.hasPin ? "Change Security PIN" : "Configure PIN"}
              </button>
            </div>
          </div>

          {/* ── CARD C: 2-STEP VERIFICATION (GOOGLE AUTHENTICATOR TOTP) ── */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4.5 h-4.5 text-blue-600" />
              Two-Factor Authentication Setup
            </h3>
            <TwoFactorToggle
              variant="card"
              onStatusChange={(enabled) => setProfile((prev) => ({ ...prev, twoFactorEnabled: enabled }))}
            />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 3: REQUEST HISTORY AUDIT TRAIL
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "history" && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
              Security Request History
            </h3>
            <span className="text-[11px] text-zinc-400">{profile.requestHistory.length} total records</span>
          </div>

          {profile.requestHistory.length === 0 ? (
            <div className="p-12 text-center text-zinc-400 text-xs">
              No previous security change requests on record.
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {profile.requestHistory.map((req) => (
                <div key={req.id} className="p-4 flex items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-900 dark:text-white">
                        {req.type === "CHANGE_PASSWORD" ? "Password Change" : "PIN Change"}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          req.status === "COMPLETED"
                            ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                            : req.status === "APPROVED"
                            ? "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                            : req.status === "PENDING"
                            ? "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
                            : "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300"
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>
                    {req.userNote && (
                      <p className="text-[11px] text-zinc-500">Your note: &ldquo;{req.userNote}&rdquo;</p>
                    )}
                    {req.adminResponseNote && (
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium">
                        Admin response: &ldquo;{req.adminResponseNote}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="text-right text-[11px] text-zinc-400">
                    <p>{new Date(req.createdAt).toLocaleDateString()}</p>
                    <p className="text-[10px]">{new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: CREDENTIAL CHANGE (MFA OR ADMIN TOKEN) ── */}
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
          // Refresh profile data
          setSuccessMsg("Credential change executed successfully!");
          window.location.reload();
        }}
        onOpenMfaSetup={() => {
          setActiveTab("security");
        }}
      />
    </div>
  );
}
