import * as React from "react";
import { ProfileCard } from "./ProfileCard";
import { cn } from "@/lib/utils";
import type { StaffProfile } from "../../types";

const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildNext7(upcomingShifts: StaffProfile["upcomingShifts"]) {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const abbr = DAY_ABBR[d.getDay()];
    const dayLabel = i === 0 ? "Today" : i === 1 ? "Tmrw" : abbr;
    const match = upcomingShifts.find((s) => s.date.startsWith(abbr));
    const shift = match ? match.time.replace(/:00/g, "").replace(" – ", "–") : "OFF";
    return { day: dayLabel, shift };
  });
}

interface Props {
  upcomingShifts: StaffProfile["upcomingShifts"];
}

export function ProfileNext7Days({ upcomingShifts }: Props) {
  const next7 = buildNext7(upcomingShifts);
  return (
    <ProfileCard title="Next 7 days" className="col-span-12 lg:col-span-4 p-5">
      <div className="grid grid-cols-7 gap-1 text-center">
        {next7.map((d) => (
          <div key={d.day} className="flex flex-col items-center gap-1">
            <span className="text-[9px] font-semibold text-muted-foreground uppercase">
              {d.day}
            </span>
            <div
              className={cn(
                "w-full rounded-md flex items-center justify-center py-2.5",
                d.shift === "OFF" ? "bg-muted/40" : "bg-brand-soft",
              )}
            >
              <span
                className={cn(
                  "text-[9px] font-medium leading-none",
                  d.shift === "OFF" ? "text-muted-foreground" : "text-brand",
                )}
              >
                {d.shift}
              </span>
            </div>
          </div>
        ))}
      </div>
    </ProfileCard>
  );
}
