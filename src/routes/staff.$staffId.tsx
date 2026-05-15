import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { AppShell } from "@/components/dl";
import { mockStaffProfiles } from "@/features/staff/data/mockStaffProfiles";
import { StaffProfileHeader } from "@/features/staff/components/profile/StaffProfileHeader";
import {
  StaffProfileTabs,
  type ProfileTab,
} from "@/features/staff/components/profile/StaffProfileTabs";
import { ProfileOverviewTab } from "@/features/staff/components/profile/ProfileOverviewTab";
import { ProfileScheduleTab } from "@/features/staff/components/profile/ProfileScheduleTab";
import { ProfileTimeTab } from "@/features/staff/components/profile/ProfileTimeTab";
import { ProfileLeaveAbsenceTab } from "@/features/staff/components/profile/ProfileLeaveAbsenceTab";
import { ProfileDocumentsTab } from "@/features/staff/components/profile/ProfileDocumentsTab";
import { ProfileNotesTab } from "@/features/staff/components/profile/ProfileNotesTab";
import { ProfileInsightsTab } from "@/features/staff/components/profile/ProfileInsightsTab";
import type { StaffProfileNote } from "@/features/staff/types";

export const Route = createFileRoute("/staff/$staffId")({
  head: () => ({ meta: [{ title: "Staff Profile — Docklist" }] }),
  component: StaffProfilePage,
});

function StaffProfilePage() {
  const { staffId } = Route.useParams();
  const [activeTab, setActiveTab] = React.useState<ProfileTab>("overview");
  const profile = mockStaffProfiles[staffId] ?? null;
  const [notes, setNotes] = React.useState<StaffProfileNote[]>(profile?.notes ?? []);

  React.useEffect(() => {
    setNotes(profile?.notes ?? []);
  }, [staffId, profile?.notes]);

  function handleSaveNote(note: StaffProfileNote) {
    setNotes((prev) => [note, ...prev]);
  }

  if (!profile) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <h1 className="text-xl font-semibold">Staff member not found</h1>
          <p className="text-sm text-muted-foreground">This staff profile could not be found.</p>
          <Link
            to="/staff"
            className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-muted/50 transition-colors"
          >
            Back to Staff
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell searchPlaceholder="Search staff...">
      <StaffProfileHeader profile={profile} onTabChange={setActiveTab} />
      <StaffProfileTabs activeTab={activeTab} onChange={setActiveTab} />
      {activeTab === "overview" && (
        <div
          role="tabpanel"
          id="staff-profile-panel-overview"
          aria-labelledby="staff-profile-tab-overview"
        >
          <ProfileOverviewTab profile={profile} onTabChange={setActiveTab} />
        </div>
      )}
      {activeTab === "schedule" && (
        <div
          role="tabpanel"
          id="staff-profile-panel-schedule"
          aria-labelledby="staff-profile-tab-schedule"
        >
          <ProfileScheduleTab profile={profile} />
        </div>
      )}
      {activeTab === "time" && (
        <div role="tabpanel" id="staff-profile-panel-time" aria-labelledby="staff-profile-tab-time">
          <ProfileTimeTab profile={profile} />
        </div>
      )}
      {activeTab === "leave" && (
        <div
          role="tabpanel"
          id="staff-profile-panel-leave"
          aria-labelledby="staff-profile-tab-leave"
        >
          <ProfileLeaveAbsenceTab profile={profile} />
        </div>
      )}
      {activeTab === "documents" && (
        <div
          role="tabpanel"
          id="staff-profile-panel-documents"
          aria-labelledby="staff-profile-tab-documents"
        >
          <ProfileDocumentsTab profile={profile} />
        </div>
      )}
      {activeTab === "notes" && (
        <div
          role="tabpanel"
          id="staff-profile-panel-notes"
          aria-labelledby="staff-profile-tab-notes"
        >
          <ProfileNotesTab notes={notes} onSaveNote={handleSaveNote} />
        </div>
      )}
      {activeTab === "insights" && (
        <div
          role="tabpanel"
          id="staff-profile-panel-insights"
          aria-labelledby="staff-profile-tab-insights"
        >
          <ProfileInsightsTab profile={profile} />
        </div>
      )}
    </AppShell>
  );
}
