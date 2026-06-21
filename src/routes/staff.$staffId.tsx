import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { AppShell } from "@/components/dl";
import { mockStaffProfiles } from "@/features/staff/data/mockStaffProfiles";
import { useWorkspaceStaff } from "@/features/staff/hooks/useWorkspaceStaff";
import { StaffProfileHeader } from "@/features/staff/components/profile/StaffProfileHeader";
import { LiveStaffProfile } from "@/features/staff/components/profile/LiveStaffProfile";
import { type ProfileTab } from "@/features/staff/components/profile/StaffProfileTabs";
import { ProfileOverviewTab } from "@/features/staff/components/profile/ProfileOverviewTab";
import { ProfileScheduleTab } from "@/features/staff/components/profile/ProfileScheduleTab";
import { ProfileTimeTab } from "@/features/staff/components/profile/ProfileTimeTab";
import { ProfileLeaveAbsenceTab } from "@/features/staff/components/profile/ProfileLeaveAbsenceTab";
import { ProfileDocumentsTab } from "@/features/staff/components/profile/ProfileDocumentsTab";
import { ProfileNotesTab } from "@/features/staff/components/profile/ProfileNotesTab";
import { ProfileInsightsTab } from "@/features/staff/components/profile/ProfileInsightsTab";
import type { StaffProfile, StaffProfileNote } from "@/features/staff/types";

export const Route = createFileRoute("/staff/$staffId")({
  head: () => ({ meta: [{ title: "Staff Profile — Docklist" }] }),
  component: StaffProfilePage,
});

const DEMO_PROFILE_ALIASES: Record<string, keyof typeof mockStaffProfiles> = {
  "staff-1": "sophie-carter",
};

function StaffProfilePage() {
  const { staffId } = Route.useParams();
  const demoProfile = mockStaffProfiles[DEMO_PROFILE_ALIASES[staffId] ?? staffId] ?? null;

  // The live roster resolves real workspace members so they reach a full (if
  // sparse) profile instead of a dead-end. Demo ids never need it.
  const { rows, source, state } = useWorkspaceStaff();

  if (source === "demo" && demoProfile) {
    return <DemoStaffProfilePage profile={demoProfile} />;
  }

  if (state !== "ready") return <StaffProfileMissing state={state} />;

  const liveMember = source === "live" ? (rows.find((row) => row.id === staffId) ?? null) : null;
  if (liveMember) {
    return <LiveStaffProfile member={liveMember} />;
  }

  return <StaffProfileMissing state={state} />;
}

function StaffProfileMissing({ state }: { state: "loading" | "error" | "ready" }) {
  const loading = state === "loading";
  const errored = state === "error";
  return (
    <AppShell>
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <h1 className="text-xl font-semibold">
          {loading
            ? "Loading profile…"
            : errored
              ? "Profile could not be loaded"
              : "Staff member not found"}
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          {loading
            ? "Fetching this team member from your workspace."
            : errored
              ? "Refresh the page to try loading this workspace profile again."
              : "This staff profile could not be found. They may have been removed from the workspace."}
        </p>
        <Link
          to="/staff"
          className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors hover:bg-muted/50"
        >
          Back to Staff
        </Link>
      </div>
    </AppShell>
  );
}

function DemoStaffProfilePage({ profile }: { profile: StaffProfile }) {
  const [activeTab, setActiveTab] = React.useState<ProfileTab>("overview");
  const [notes, setNotes] = React.useState<StaffProfileNote[]>(profile.notes ?? []);

  React.useEffect(() => {
    setNotes(profile.notes ?? []);
  }, [profile.notes]);

  function handleSaveNote(note: StaffProfileNote) {
    setNotes((prev) => [note, ...prev]);
  }

  return (
    <AppShell searchPlaceholder="Search staff...">
      <StaffProfileHeader profile={profile} activeTab={activeTab} onTabChange={setActiveTab} />
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
