import {
  User,
  LayoutGrid,
  Users,
  Shield,
  Calendar,
  Clock,
  Bell,
  Sparkles,
  Lock,
  Tag,
} from "lucide-react";
import type { SettingsTab } from "../types";

export const settingsTabs: SettingsTab[] = [
  { t: "General", s: "Personal preferences", icon: User, group: "Workspace", pilot: true },
  {
    t: "Workspace",
    s: "General workspace settings",
    icon: LayoutGrid,
    group: "Workspace",
    pilot: true,
  },
  { t: "Locations & teams", s: "Manage teams and departments", icon: Users, group: "Workspace" },
  {
    t: "Roles & permissions",
    s: "Preview roles and access levels",
    icon: Shield,
    group: "Workspace",
    preview: true,
  },
  {
    t: "Rota & scheduling",
    s: "Rota rules and targets",
    icon: Calendar,
    group: "Operations",
    pilot: true,
  },
  { t: "Time & attendance", s: "Rules for time tracking", icon: Clock, group: "Operations" },
  {
    t: "Notifications",
    s: "Live in-app updates; channels preview",
    icon: Bell,
    group: "Operations",
  },
  { t: "Manager support", s: "Deterministic review aids", icon: Sparkles, group: "Platform" },
  {
    t: "Data & privacy",
    s: "Preview security and data exports",
    icon: Lock,
    group: "Platform",
    preview: true,
  },
  {
    t: "Plan & limits",
    s: "Indicative plans; billing inactive",
    icon: Tag,
    group: "Platform",
    preview: true,
  },
];

/**
 * Tabs for the current surface. The live pilot shows only tabs whose controls
 * genuinely persist (`pilot: true`); every session-only or preview tab stays
 * demo-only so the pilot never offers a control that silently does nothing.
 */
export function visibleSettingsTabs(pilot: boolean): SettingsTab[] {
  return pilot ? settingsTabs.filter((tab) => tab.pilot) : settingsTabs;
}

export const SETTINGS_GROUPS: ReadonlyArray<{
  key: SettingsTab["group"];
  label: string;
}> = [
  { key: "Workspace", label: "Workspace" },
  { key: "Operations", label: "Operations" },
  { key: "Platform", label: "Platform" },
];
