import { AccessTab } from "./AccessTab";
import { BrandingTab } from "./BrandingTab";
import { ExportsTab } from "./ExportsTab";
import { LeavePoliciesTab } from "./LeavePoliciesTab";
import { NotificationsTab } from "./NotificationsTab";
import { TeamsTab } from "./TeamsTab";
import { TimeRulesTab } from "./TimeRulesTab";
import { WorkspaceTab } from "./WorkspaceTab";

export type SettingsContentTab =
  | "Workspace"
  | "Locations & teams"
  | "Roles & permissions"
  | "Leave Policies"
  | "Time & attendance"
  | "Notifications"
  | "Branding"
  | "Data & privacy";

export function SettingsContent({
  activeTab,
  onDirty,
}: {
  activeTab: SettingsContentTab;
  onDirty: () => void;
}) {
  return (
    <div className="min-w-0 space-y-4">
      {activeTab === "Workspace" && <WorkspaceTab onDirty={onDirty} />}
      {activeTab === "Locations & teams" && <TeamsTab onDirty={onDirty} />}
      {activeTab === "Roles & permissions" && <AccessTab onDirty={onDirty} />}
      {activeTab === "Time & attendance" && <TimeRulesTab onDirty={onDirty} />}
      {activeTab === "Leave Policies" && <LeavePoliciesTab onDirty={onDirty} />}
      {activeTab === "Notifications" && <NotificationsTab onDirty={onDirty} />}
      {activeTab === "Branding" && <BrandingTab onDirty={onDirty} />}
      {activeTab === "Data & privacy" && <ExportsTab onDirty={onDirty} />}
    </div>
  );
}
