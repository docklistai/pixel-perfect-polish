import {
  AlertCircle,
  AlertTriangle,
  CalendarOff,
  CheckCircle,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";

export type NotificationTone = "amber" | "red" | "green" | "purple" | "blue";
export type NotificationFilter = "all" | "unread" | "alerts";

export interface ManagerNotification {
  id: string;
  icon: LucideIcon;
  tone: NotificationTone;
  title: string;
  body: string;
  action: string;
  time: string;
  read: boolean;
  to: "/" | "/rota" | "/leave" | "/time" | "/team" | "/staff" | "/ops";
  staffId?: string;
  staffSearch?: { tab: "leave" };
  rotaSearch?: { week: number; location: string };
}

export type MockNotification = ManagerNotification;

export const NOTIFICATION_SEED: MockNotification[] = [
  {
    id: "n1",
    icon: AlertTriangle,
    tone: "amber",
    title: "Next week's draft has 2 open shifts",
    body: "Resolve before Friday 16:00 to publish on time.",
    action: "Open rota",
    time: "14:02",
    read: false,
    to: "/rota",
  },
  {
    id: "n2",
    icon: CalendarOff,
    tone: "purple",
    title: "Priya Patel requested leave",
    body: "21 – 23 Jun. High coverage impact.",
    action: "Review",
    time: "13:35",
    read: false,
    to: "/leave",
  },
  {
    id: "n3",
    icon: AlertCircle,
    tone: "red",
    title: "Daniel Mitchell — schedule conflict",
    body: "Fri 19 Jun, Kitchen Supervisor shifts overlap.",
    action: "Resolve",
    time: "11:20",
    read: false,
    to: "/rota",
  },
  {
    id: "n4",
    icon: CheckCircle,
    tone: "green",
    title: "Last week’s timesheets approved",
    body: "All 8 entries · Ready to export approved hours.",
    action: "Export",
    time: "09:50",
    read: true,
    to: "/time",
  },
  {
    id: "n5",
    icon: MessageSquare,
    tone: "blue",
    title: "Daniel posted a kitchen briefing",
    body: "Today 08:15 — Read 6 of 8",
    action: "Open",
    time: "08:15",
    read: true,
    to: "/team",
  },
];

export const NOTIFICATION_TONE_CLASSES: Record<NotificationTone, string> = {
  amber: "bg-warning-soft text-warning",
  red: "bg-danger-soft text-danger",
  green: "bg-success-soft text-success",
  purple: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  blue: "bg-info-soft text-info",
};
