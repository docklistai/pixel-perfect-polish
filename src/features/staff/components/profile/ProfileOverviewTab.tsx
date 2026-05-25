import * as React from "react";
import {
  ManagerActionsCard,
  ManagerSnapshotCard,
  NextShiftCard,
  SkillsTrainingCard,
} from "./ProfileOverviewSections";
import {
  FlagsCard,
  LeaveAbsenceCard,
  ProfileOverviewRailCard,
  WorkloadBalanceCard,
} from "./ProfileOverviewRail";
import type { StaffProfile } from "../../types";
import type { ProfileTab } from "./StaffProfileTabs";

interface Props {
  profile: StaffProfile;
  onTabChange: (tab: ProfileTab) => void;
}

export function ProfileOverviewTab({ profile, onTabChange }: Props) {
  const [toast, setToast] = React.useState<string | null>(null);

  function handleToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  return (
    <div className="space-y-5">
      {toast && (
        <div className="rounded-xl bg-info-soft text-info text-xs font-medium px-4 py-2.5">
          {toast}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <ManagerSnapshotCard profile={profile} onTabChange={onTabChange} onToast={handleToast} />
          <NextShiftCard profile={profile} onTabChange={onTabChange} onToast={handleToast} />
          <SkillsTrainingCard profile={profile} />
          <ManagerActionsCard profile={profile} onTabChange={onTabChange} onToast={handleToast} />
        </div>

        <aside className="min-w-0 space-y-5">
          <FlagsCard profile={profile} />
          <LeaveAbsenceCard profile={profile} />
          <WorkloadBalanceCard profile={profile} />
          <ProfileOverviewRailCard profile={profile} onTabChange={onTabChange} />
        </aside>
      </div>
    </div>
  );
}
