"use client";

import { useState, useEffect } from "react";
import { Clock, MapPin, AlertCircle, CheckCircle2, Navigation } from "lucide-react";
import { punchIn, punchOut } from "@/app/actions/attendance";

type AttendanceRecord = {
  id: string;
  punchIn: Date | string | null;
  punchOut: Date | string | null;
  status: string;
} | null;

interface Props {
  initialAttendance: AttendanceRecord;
}

export function PunchWidget({ initialAttendance }: Props) {
  const [attendance, setAttendance] = useState<AttendanceRecord>(initialAttendance);
  const [time, setTime] = useState<string>("");
  const [dateStr, setDateStr] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState<"idle" | "getting" | "success" | "denied">("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
    setLoading(true);
    setErrorMsg(null);
    const location = await getCoordinates();
    
    const res = await punchIn(location?.lat, location?.lng);
    if (res.error) {
      setErrorMsg(res.error);
    } else if (res.attendance) {
      setAttendance(res.attendance as any);
    }
    setLoading(false);
  };

  const handlePunchOut = async () => {
    setLoading(true);
    setErrorMsg(null);
    const location = await getCoordinates();
    
    const res = await punchOut(location?.lat, location?.lng);
    if (res.error) {
      setErrorMsg(res.error);
    } else if (res.attendance) {
      setAttendance(res.attendance as any);
    }
    setLoading(false);
  };

  const hasPunchedIn = !!attendance?.punchIn;
  const hasPunchedOut = !!attendance?.punchOut;

  return (
    <div className="card p-6 border border-zinc-100/80 shadow-md relative overflow-hidden bg-white max-w-md w-full mx-auto">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
      
      <div className="flex flex-col items-center text-center">
        <div className="p-3 bg-blue-50 rounded-full text-blue-600 mb-4 animate-pulse">
          <Clock className="w-8 h-8" />
        </div>
        
        <h2 className="text-3xl font-extrabold text-zinc-800 tracking-tight">{time || "--:--:--"}</h2>
        <p className="text-xs text-zinc-500 mt-1 font-medium">{dateStr || "Loading..."}</p>

        <div className="w-full border-t border-zinc-100 my-5" />

        {/* Location Status Message */}
        <div className="flex items-center gap-1.5 justify-center mb-4 text-[12px] font-medium">
          {locationStatus === "getting" && (
            <span className="text-zinc-500 flex items-center gap-1">
              <Navigation className="w-3.5 h-3.5 animate-spin" /> Accessing GPS...
            </span>
          )}
          {locationStatus === "success" && (
            <span className="text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> GPS Location acquired ({coords?.lat.toFixed(4)}, {coords?.lng.toFixed(4)})
            </span>
          )}
          {locationStatus === "denied" && (
            <span className="text-amber-500 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> GPS Blocked. Punching with default location.
            </span>
          )}
        </div>

        {errorMsg && (
          <div className="mb-4 w-full p-2.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 border border-red-100">
            {errorMsg}
          </div>
        )}

        {/* Buttons Panel */}
        <div className="flex gap-3 w-full">
          {!hasPunchedIn ? (
            <button
              onClick={handlePunchIn}
              disabled={loading}
              className="flex-1 py-3 px-4 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 transition duration-200 shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <MapPin className="w-4 h-4" />
              {loading ? "Punching In..." : "Punch In"}
            </button>
          ) : !hasPunchedOut ? (
            <button
              onClick={handlePunchOut}
              disabled={loading}
              className="flex-1 py-3 px-4 rounded-xl font-semibold text-white bg-zinc-800 hover:bg-zinc-900 active:scale-98 transition duration-200 shadow-lg shadow-zinc-800/10 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Navigation className="w-4 h-4 animate-bounce" />
              {loading ? "Punching Out..." : "Punch Out"}
            </button>
          ) : (
            <div className="w-full py-3.5 px-4 rounded-xl font-bold bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Attendance Done for Today!
            </div>
          )}
        </div>

        {/* Attendance Meta Info */}
        {hasPunchedIn && (
          <div className="w-full mt-4 text-left text-xs bg-zinc-50 border border-zinc-100 rounded-lg p-3 space-y-1 text-zinc-600">
            <div className="flex justify-between">
              <span>Punch In:</span>
              <span className="font-bold text-zinc-800">
                {new Date(attendance!.punchIn!).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            {hasPunchedOut && (
              <div className="flex justify-between">
                <span>Punch Out:</span>
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
