import type { LucideIcon } from "lucide-react";

export interface SettingsTab {
  t: string;
  s: string;
  icon: LucideIcon;
  group: "Workspace" | "Operations" | "Platform";
  preview?: boolean;
}
