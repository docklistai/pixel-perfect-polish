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
  { t: "General", s: "Personal preferences", icon: User, group: "Workspace" },
  { t: "Workspace", s: "General workspace settings", icon: LayoutGrid, group: "Workspace" },
  { t: "Locations & teams", s: "Manage teams and departments", icon: Users, group: "Workspace" },
  { t: "Roles & permissions", s: "Set roles and access levels", icon: Shield, group: "Workspace" },
  { t: "Rota & scheduling", s: "Rota rules and targets", icon: Calendar, group: "Operations" },
  { t: "Time & attendance", s: "Rules for time tracking", icon: Clock, group: "Operations" },
  { t: "Notifications", s: "Email and app notifications", icon: Bell, group: "Operations" },
  { t: "Manager support", s: "Deterministic review aids", icon: Sparkles, group: "Platform" },
  { t: "Data & privacy", s: "Security and data exports", icon: Lock, group: "Platform" },
  { t: "Plan & limits", s: "Plan usage and limits", icon: Tag, group: "Platform", preview: true },
];

export const SETTINGS_GROUPS: ReadonlyArray<{
  key: SettingsTab["group"];
  label: string;
}> = [
  { key: "Workspace", label: "Workspace" },
  { key: "Operations", label: "Operations" },
  { key: "Platform", label: "Platform" },
];
