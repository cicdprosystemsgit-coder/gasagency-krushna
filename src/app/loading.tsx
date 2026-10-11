import { CylinderLoader } from "@/components/ui/CylinderLoader";

export default function RootLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
      <CylinderLoader
        size="lg"
        color="red"
        message="Loading GasAgency"
        subtitle="Please wait a moment..."
      />
    </div>
  );
}
