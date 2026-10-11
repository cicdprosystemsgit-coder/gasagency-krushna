import { CylinderLoader } from "@/components/ui/CylinderLoader";

export default function DashboardLoading() {
  return (
    <div className="flex-1 min-h-[60vh] flex flex-col items-center justify-center p-6">
      <CylinderLoader
        size="lg"
        color="red"
        message="Loading Gas Agency Data"
        subtitle="Retrieving real-time records and updates..."
      />
    </div>
  );
}
