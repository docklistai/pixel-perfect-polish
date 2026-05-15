import * as React from "react";
import { ProfileCard, Pair } from "./ProfileCard";
import type { StaffProfile } from "../../types";

interface Props {
  la: StaffProfile["leaveAbsence"];
}

export function ProfileLeaveCard({ la }: Props) {
  return (
    <ProfileCard
      title="Leave & absence"
      className="col-span-12 lg:col-span-3 p-5"
      action={
        <button type="button" className="text-[11px] text-brand font-semibold hover:underline">
          View full
        </button>
      }
    >
      <div className="rounded-lg bg-muted/30 flex items-center justify-between px-3 py-2.5 mb-3">
        <span className="text-xs text-muted-foreground">Annual leave remaining</span>
        <span className="text-2xl font-bold tabular-nums">
          {la.annualLeaveRemaining}
          <span className="text-xs font-normal text-muted-foreground ml-1">days</span>
        </span>
      </div>
      <Pair label="Sick days this year" value={la.sickDaysThisYear} />
      <Pair label="Sickness episodes" value={la.sicknessEpisodes} />
      <Pair
        label="Short-notice absences"
        value={
          <span className={la.shortNoticeAbsences > 0 ? "text-warning font-semibold" : ""}>
            {la.shortNoticeAbsences}
          </span>
        }
      />
      <Pair label="Return to work req." value={la.returnToWorkRequired ? "Yes" : "No"} />
    </ProfileCard>
  );
}
