"use client";

import { useState, useEffect, useTransition } from "react";
import { Clock, MapPin, AlertCircle, CheckCircle2, Navigation, LogIn, LogOut } from "lucide-react";
import { punchIn, punchOut, getMyTodayAttendance } from "@/app/actions/attendance";

type AttendanceRecord = {
  id: string;
  punchIn: Date | string | null;
  punchOut: Date | string | null;
  status: string;
} | null;

export function PunchWidget() {
  const [attendance, setAttendance] = useState<AttendanceRecord>(null);
  const [time, setTime] = useState<string>("");
  const [dateStr, setDateStr] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [locationStatus, setLocationStatus] = useState<"idle" | "getting" | "success" | "denied">("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch initial today's attendance
  useEffect(() => {
    startTransition(async () => {
      const result = await getMyTodayAttendance();
      if (result.attendance) {
        setAttendance(result.attendance as any);
      }
    });
  }, []);

  // Live ticking clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      setDateStr(now.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const OFFICE_LAT = 19.0760; // Default office coordinates
  const OFFICE_LNG = 72.8777;
  const GEOFENCE_RADIUS_M = 150; // 150 meters

  const [distance, setDistance] = useState<number | null>(null);

  // Haversine distance calculator
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // Earth radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  // Fetch coordinates
  const getCoordinates = (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (typeof window === "undefined") {
        resolve(null);
        return;
      }

      if (!navigator.geolocation) {
        setLocationStatus("denied");
        setErrorMsg("Your browser does not support Location services.");
        resolve(null);
        return;
      }

      // Check for secure context (HTTPS / localhost)
      if (window.location.protocol !== "https:" && window.location.hostname !== "localhost" && !window.location.hostname.endsWith(".localhost")) {
        setLocationStatus("denied");
        setErrorMsg("Browser blocks GPS location access on non-secure connections (HTTP). Please access using localhost or HTTPS.");
        resolve(null);
        return;
      }

      setLocationStatus("getting");
      setErrorMsg(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newCoords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCoords(newCoords);
          const dist = getDistance(newCoords.lat, newCoords.lng, OFFICE_LAT, OFFICE_LNG);
          setDistance(dist);
          setLocationStatus("success");
          resolve(newCoords);
        },
        (error) => {
          console.warn("Location permission denied/error", error);
          setLocationStatus("denied");

          let friendlyMsg = "Could not get location. ";
          if (error.code === error.PERMISSION_DENIED) {
            friendlyMsg += "Permission denied. Please click the padlock icon next to your URL bar and reset 'Location' to ALLOW.";
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            friendlyMsg += "Position unavailable. Please make sure your device GPS/Location Services is enabled.";
          } else if (error.code === error.TIMEOUT) {
            friendlyMsg += "Request timed out. Please try moving closer to a window or refresh and try again.";
          } else {
            friendlyMsg += error.message;
          }
          setErrorMsg(friendlyMsg);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 15000 }
      );
    });
  };

  const handlePunchIn = async () => {
    setErrorMsg(null);
    const location = await getCoordinates();

    startTransition(async () => {
      const res = await punchIn(location?.lat, location?.lng);
      if (res.error) {
        setErrorMsg(res.error);
      } else if (res.attendance) {
        setAttendance(res.attendance as any);
      }
    });
  };

  const handlePunchOut = async () => {
    setErrorMsg(null);
    const location = await getCoordinates();

    startTransition(async () => {
      const res = await punchOut(location?.lat, location?.lng);
      if (res.error) {
        setErrorMsg(res.error);
      } else if (res.attendance) {
        setAttendance(res.attendance as any);
      }
    });
  };

  const hasPunchedIn = !!attendance?.punchIn;
  const hasPunchedOut = !!attendance?.punchOut;

  return (
    <div className="card p-5 border border-zinc-200 shadow-sm relative overflow-hidden bg-white max-w-md w-full mb-6">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col items-center text-center">
        <div className="flex items-center justify-between w-full mb-3 pb-2 border-b border-zinc-100">
          <div className="flex items-center gap-1.5 text-zinc-700">
            <Clock className="w-4 h-4 text-blue-600 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider">Attendance Desk</span>
          </div>
          <span className="text-xs font-mono font-extrabold text-zinc-500">{time || "--:--:--"}</span>
        </div>

        <p className="text-[11px] text-zinc-400 font-medium mb-4">{dateStr || "Loading..."}</p>

        {/* Location Status Message */}
        <div className="flex items-center gap-1.5 justify-center mb-4 text-[10px] font-bold">
          {locationStatus === "getting" && (
            <span className="text-zinc-500 flex items-center gap-1">
              <Navigation className="w-3 h-3 animate-spin" /> Fetching GPS coordinates...
            </span>
          )}
          {locationStatus === "success" && (
            <span className="text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> GPS Acquired ({coords?.lat.toFixed(4)}, {coords?.lng.toFixed(4)})
            </span>
          )}
          {locationStatus === "denied" && (
            <span className="text-amber-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> GPS Denied. Punching with default location.
            </span>
          )}
        </div>

        {errorMsg && (
          <div className="mb-4 w-full p-2 rounded-lg text-[11px] font-semibold bg-red-50 text-red-600 border border-red-100">
            {errorMsg}
          </div>
        )}

        {distance !== null && distance > GEOFENCE_RADIUS_M && (
          <div className="mb-4 w-full p-2.5 rounded-xl text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-start gap-1.5 text-left">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <span className="text-amber-800">Geofence Alert:</span> You are {distance}m away from the office.
            </div>
          </div>
        )}

        {/* Buttons Panel */}
        <div className="flex gap-3 w-full">
          {!hasPunchedIn ? (
            <button
              onClick={handlePunchIn}
              disabled={isPending}
              className="flex-1 py-2.5 px-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 transition duration-200 shadow-md shadow-blue-500/10 disabled:opacity-50 flex items-center justify-center gap-1.5 text-xs"
            >
              <LogIn className="w-4 h-4" />
              {isPending ? "Punching In..." : "Punch In"}
            </button>
          ) : !hasPunchedOut ? (
            <button
              onClick={handlePunchOut}
              disabled={isPending}
              className="flex-1 py-2.5 px-4 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 active:scale-98 transition duration-200 shadow-md shadow-red-500/10 disabled:opacity-50 flex items-center justify-center gap-1.5 text-xs"
            >
              <LogOut className="w-4 h-4" />
              {isPending ? "Punching Out..." : "Punch Out"}
            </button>
          ) : (
            <div className="w-full py-2.5 px-4 rounded-xl font-bold bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center gap-1.5 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Attendance Done for Today!
            </div>
          )}
        </div>

        {/* Attendance Meta Info */}
        {hasPunchedIn && (
          <div className="w-full mt-4 text-left text-[11px] bg-zinc-50 border border-zinc-100 rounded-lg p-2.5 space-y-1 text-zinc-500">
            <div className="flex justify-between">
              <span>Punch In Time:</span>
              <span className="font-bold text-zinc-800">
                {new Date(attendance!.punchIn!).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            {hasPunchedOut && (
              <div className="flex justify-between">
                <span>Punch Out Time:</span>
                <span className="font-bold text-zinc-800">
                  {new Date(attendance!.punchOut!).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
