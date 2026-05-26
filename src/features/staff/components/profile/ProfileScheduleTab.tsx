import * as React from "react";
import { ProfileScheduleSidebar } from "./ProfileScheduleSidebar";
import { ProfileScheduleWeekCard } from "./ProfileScheduleWeekCard";
import type { StaffProfile } from "../../types";

interface Props {
  profile: StaffProfile;
}

export function ProfileScheduleTab({ profile }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <ProfileScheduleWeekCard profile={profile} />
      <ProfileScheduleSidebar />
    </div>
  );
}
