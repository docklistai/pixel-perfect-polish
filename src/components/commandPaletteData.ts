import {
  BarChart3,
  CalendarDays,
  CalendarOff,
  CheckCircle2,
  Clock,
  Home,
  KeyRound,
  MessageSquare,
  Plus,
  Send,
  Settings as SettingsIcon,
  Smartphone,
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
  | "/settings"
  | "/portal";

export interface CommandNavItem {
  label: string;
  to: NavTarget;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  preview?: boolean;
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
  { label: "Team", to: "/team", icon: MessageSquare, preview: true },
  { label: "Ops", to: "/ops", icon: Wrench, preview: true },
  { label: "Reports", to: "/reports", icon: BarChart3, preview: true },
  { label: "Settings", to: "/settings", icon: SettingsIcon, preview: true },
];

export const COMMAND_QUICK_ACTIONS: CommandQuickAction[] = [
  {
    label: "Publish rota",
    hint: "Review and publish this week's rota",
    icon: Send,
    to: "/rota",
    intent: "rota.publish",
  },
  {
    label: "Generate rota draft",
    hint: "Generate next week's rota draft and fill open shifts",
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
    hint: "Create an open or assigned shift",
    icon: Plus,
    to: "/rota",
    intent: "rota.addShift",
  },
  {
    label: "Add team member",
    hint: "Add someone to your team",
    icon: UserPlus,
    to: "/staff",
    intent: "staff.add",
  },
  {
    label: "Share access codes",
    hint: "Give staff their portal sign-in codes",
    icon: KeyRound,
    to: "/staff",
    intent: "staff.accessCodes",
  },
  {
    label: "Review leave requests",
    hint: "Approve or decline pending requests",
    icon: CalendarOff,
    to: "/leave",
  },
  {
    label: "New leave request",
    hint: "Log leave on someone's behalf",
    icon: CalendarOff,
    to: "/leave",
    intent: "leave.new",
  },
  { label: "Open timesheets", hint: "Review clocked hours", icon: Clock, to: "/time" },
  { label: "Open settings", hint: "Workspace settings", icon: SettingsIcon, to: "/settings" },
  {
    label: "Open staff portal",
    hint: "See exactly what staff see — published snapshots only",
    icon: Smartphone,
    to: "/portal",
  },
];
