import * as React from "react";
import { ProfileCard } from "./ProfileCard";
import { cn } from "@/lib/utils";
import type { StaffProfile } from "../../types";

const ACTIVITY_CHIP: Record<string, string> = {
  Absence: "bg-warning-soft text-warning",
  Document: "bg-brand-soft text-brand",
  Leave: "bg-success-soft text-success",
  Availability: "bg-muted text-muted-foreground",
};

interface Props {
  recentActivity: StaffProfile["recentActivity"];
}

export function ProfileActivityFeed({ recentActivity }: Props) {
  return (
    <ProfileCard title="Recent activity" className="col-span-12 lg:col-span-8 p-5">
      {recentActivity.length === 0 ? (
        <span className="text-xs text-muted-foreground">No recent activity</span>
      ) : (
        <ul className="space-y-3">
          {recentActivity.map((a, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand shrink-0" aria-hidden />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm">{a.note}</span>
                  {a.type && ACTIVITY_CHIP[a.type] && (
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[10px] font-medium shrink-0",
                        ACTIVITY_CHIP[a.type],
                      )}
                    >
                      {a.type}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{a.date}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </ProfileCard>
  );
}
