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
  | "Teams"
  | "Access"
  | "Time Rules"
  | "Leave Policies"
  | "Notifications"
  | "Branding"
  | "Exports";

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
      {activeTab === "Teams" && <TeamsTab onDirty={onDirty} />}
      {activeTab === "Access" && <AccessTab onDirty={onDirty} />}
      {activeTab === "Time Rules" && <TimeRulesTab onDirty={onDirty} />}
      {activeTab === "Leave Policies" && <LeavePoliciesTab onDirty={onDirty} />}
      {activeTab === "Notifications" && <NotificationsTab onDirty={onDirty} />}
      {activeTab === "Branding" && <BrandingTab onDirty={onDirty} />}
      {activeTab === "Exports" && <ExportsTab onDirty={onDirty} />}
    </div>
  );
}
