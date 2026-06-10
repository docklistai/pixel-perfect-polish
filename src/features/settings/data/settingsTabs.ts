import { LayoutGrid, Users, Shield, Clock, Calendar, Bell, Smile, Cloud } from "lucide-react";
import type { SettingsTab } from "../types";

export const settingsTabs: SettingsTab[] = [
  { t: "Workspace", s: "General workspace settings", icon: LayoutGrid, group: "Workspace" },
  { t: "Locations & teams", s: "Manage teams and departments", icon: Users, group: "Workspace" },
  { t: "Roles & permissions", s: "Set roles and access levels", icon: Shield, group: "Workspace" },
  { t: "Leave Policies", s: "Configure leave policies", icon: Calendar, group: "Operations" },
  { t: "Time & attendance", s: "Rules for time tracking", icon: Clock, group: "Operations" },
  { t: "Notifications", s: "Email and app notifications", icon: Bell, group: "Operations" },
  { t: "Branding", s: "Customise your brand", icon: Smile, group: "Platform" },
  { t: "Data & privacy", s: "Export timesheets and rota data", icon: Cloud, group: "Platform" },
];

export const SETTINGS_GROUPS: ReadonlyArray<{
  key: SettingsTab["group"];
  label: string;
}> = [
  { key: "Workspace", label: "Workspace" },
  { key: "Operations", label: "Operations" },
  { key: "Platform", label: "Platform" },
];
