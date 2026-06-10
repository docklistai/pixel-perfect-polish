import { GeneralTab } from "./GeneralTab";
import { WorkspaceTab } from "./WorkspaceTab";
import { TeamsTab } from "./TeamsTab";
import { AccessTab } from "./AccessTab";
import { RotaSchedulingTab } from "./RotaSchedulingTab";
import { TimeRulesTab } from "./TimeRulesTab";
import { NotificationsTab } from "./NotificationsTab";
import { AIManagerSupportTab } from "./AIManagerSupportTab";
import { ExportsTab } from "./ExportsTab";
import { PlanLimitsTab } from "./PlanLimitsTab";

export type SettingsContentTab =
  | "General"
  | "Workspace"
  | "Locations & teams"
  | "Roles & permissions"
  | "Rota & scheduling"
  | "Time & attendance"
  | "Notifications"
  | "AI manager support"
  | "Data & privacy"
  | "Plan & limits";

export function SettingsContent({
  activeTab,
  onDirty,
}: {
  activeTab: SettingsContentTab;
  onDirty: () => void;
}) {
  return (
    <div className="min-w-0 space-y-4">
      {activeTab === "General" && <GeneralTab onDirty={onDirty} />}
      {activeTab === "Workspace" && <WorkspaceTab onDirty={onDirty} />}
      {activeTab === "Locations & teams" && <TeamsTab onDirty={onDirty} />}
      {activeTab === "Roles & permissions" && <AccessTab onDirty={onDirty} />}
      {activeTab === "Rota & scheduling" && <RotaSchedulingTab onDirty={onDirty} />}
      {activeTab === "Time & attendance" && <TimeRulesTab onDirty={onDirty} />}
      {activeTab === "Notifications" && <NotificationsTab onDirty={onDirty} />}
      {activeTab === "AI manager support" && <AIManagerSupportTab onDirty={onDirty} />}
      {activeTab === "Data & privacy" && <ExportsTab onDirty={onDirty} />}
      {activeTab === "Plan & limits" && <PlanLimitsTab />}
    </div>
  );
}
