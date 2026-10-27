import { getUserProfileData } from "@/app/actions/profile";
import { UserProfileView } from "@/components/profile/UserProfileView";
import { redirect } from "next/navigation";

export const metadata = {
  title: "My Profile | GasAgency",
};

export default async function ManagerProfilePage() {
  const { profile, error } = await getUserProfileData();
  if (error || !profile) {
    redirect("/login");
  }

  return (
    <div className="p-6">
      <UserProfileView initialProfile={profile} />
    </div>
  );
}
