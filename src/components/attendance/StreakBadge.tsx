"use client";

import { Flame, Star, Award } from "lucide-react";

interface Props {
  streak: number;
  perfectMonth?: boolean;
  absenteeCount?: number;
}

export function StreakBadge({ streak, perfectMonth = false, absenteeCount = 0 }: Props) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {streak >= 3 && (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 border border-orange-200 text-orange-700 animate-pulse"
          title={`🔥 Working Streak: ${streak} consecutive days present!`}
        >
          <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
          {streak} Days
        </span>
      )}
      
      {perfectMonth && (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-50 border border-yellow-200 text-yellow-700"
          title="⭐ Perfect Month: No absences this month!"
        >
          <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
          Perfect Month
        </span>
      )}

      {absenteeCount >= 3 && (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 border border-red-200 text-red-700"
          title="⚠️ High absenteeism this month (3+ absences)"
        >
          <Award className="w-3.5 h-3.5 text-red-500" />
          Frequent Absentee
        </span>
      )}
    </div>
  );
}
