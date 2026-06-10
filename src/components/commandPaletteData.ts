import {
  BarChart3,
  CalendarDays,
  CalendarOff,
  CheckCircle2,
  Clock,
  Home,
  MessageSquare,
  Plus,
  Send,
  Settings as SettingsIcon,
  Sparkles,
  UserPlus,
  Users,
  Wrench,
} from "lucide-react";
import type { IntentName } from "@/lib/interactionIntents";

export type NavTarget =
  | "/"
  | "/rota"
  | "/staff"
  | "/time"
  | "/leave"
  | "/team"
  | "/ops"
  | "/reports"
  | "/settings";

export interface CommandNavItem {
  label: string;
  to: NavTarget;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
}

export interface CommandQuickAction {
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  to: NavTarget;
  intent?: IntentName;
}

export const COMMAND_NAV_ITEMS: CommandNavItem[] = [
  { label: "Home", to: "/", icon: Home, shortcut: "G H" },
  { label: "Rota", to: "/rota", icon: CalendarDays, shortcut: "G R" },
  { label: "Staff", to: "/staff", icon: Users, shortcut: "G S" },
  { label: "Time", to: "/time", icon: Clock, shortcut: "G T" },
  { label: "Leave", to: "/leave", icon: CalendarOff, shortcut: "G L" },
  { label: "Team", to: "/team", icon: MessageSquare },
  { label: "Ops", to: "/ops", icon: Wrench },
  { label: "Reports", to: "/reports", icon: BarChart3 },
  { label: "Settings", to: "/settings", icon: SettingsIcon },
];

export const COMMAND_QUICK_ACTIONS: CommandQuickAction[] = [
  {
    label: "Publish rota",
    hint: "Open the publish dialog",
    icon: Send,
    to: "/rota",
    intent: "rota.publish",
  },
  {
    label: "Generate rota draft",
    hint: "Open the rota generator",
    icon: Sparkles,
    to: "/rota",
    intent: "rota.generate",
  },
  {
    label: "Review publish readiness",
    hint: "Check the rota before publishing",
    icon: CheckCircle2,
    to: "/rota",
    intent: "rota.publish",
  },
  {
    label: "Add a shift",
    hint: "Open the add shift surface",
    icon: Plus,
    to: "/rota",
    intent: "rota.addShift",
  },
  {
    label: "Add team member",
    hint: "Open the invite dialog",
    icon: UserPlus,
    to: "/staff",
    intent: "staff.add",
  },
  {
    label: "Review leave requests",
    hint: "Open the leave inbox",
    icon: CalendarOff,
    to: "/leave",
  },
  {
    label: "New leave request",
    hint: "Open the new leave form",
    icon: CalendarOff,
    to: "/leave",
    intent: "leave.new",
  },
  { label: "Open timesheets", hint: "Review clocked hours", icon: Clock, to: "/time" },
  { label: "Open settings", hint: "Workspace settings", icon: SettingsIcon, to: "/settings" },
];
