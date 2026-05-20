import { LayoutGrid, Users, Shield, Clock, Calendar, Bell, Smile, Cloud } from "lucide-react";
import type { SettingsTab } from "../types";

export const settingsTabs: SettingsTab[] = [
  { t: "Workspace", s: "General workspace settings", icon: LayoutGrid },
  { t: "Teams", s: "Manage teams and departments", icon: Users },
  { t: "Access", s: "Set roles and access levels", icon: Shield },
  { t: "Time Rules", s: "Rules for time tracking", icon: Clock },
  { t: "Leave Policies", s: "Configure leave policies", icon: Calendar },
  { t: "Notifications", s: "Email and app notifications", icon: Bell },
  { t: "Branding", s: "Customise your brand", icon: Smile },
  { t: "Exports", s: "Export timesheets and rota data", icon: Cloud },
];
