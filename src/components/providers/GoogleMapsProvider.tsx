"use client";

import { APIProvider } from "@vis.gl/react-google-maps";
import { ReactNode } from "react";
import { AlertCircle } from "lucide-react";

interface Props {
  children: ReactNode;
}

export function GoogleMapsProvider({ children }: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className="w-full h-[600px] bg-slate-100 flex items-center justify-center rounded-xl border border-slate-200 p-6 text-center">
        <div className="max-w-md">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h3 className="text-[14px] font-bold text-slate-800">Google Maps API Key Missing</h3>
          <p className="text-[12px] text-slate-500 mt-1">
            Please configure <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in your <code>.env</code> file to enable live map tracking.
          </p>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      {children}
    </APIProvider>
  );
}
