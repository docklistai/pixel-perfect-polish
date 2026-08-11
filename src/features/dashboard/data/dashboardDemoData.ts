// Demo period: week of Mon 8 – Sun 14 Jun 2026 (current), next rota: Mon 15 Jun 2026
import {
  Users,
  Star,
  Calendar,
  Clock3,
  Clock,
  Percent,
  Megaphone,
  AlertTriangle,
  Plane,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import type {
  KpiItem,
  OpenShiftItem,
  StaffDeptItem,
  AnnouncementItem,
  QuickActionItem,
} from "../types";
import { DEMO_WORLD } from "@/features/demo/data/demoWorld";

export const kpiItems: KpiItem[] = [
  {
    icon: Users,
    label: "Scheduled hours",
    value: `${DEMO_WORLD.labour.scheduledHours}h`,
    delta: "Demo data",
    tone: "info",
    tip: "Total scheduled hours across all departments this week.",
  },
  {
    icon: Calendar,
    label: "Coverage",
    value: "96%",
    delta: "Demo data",
    tone: "warning",
    tip: "Scheduled vs role requirement. 100% = fully staffed.",
  },
];

export const todayKpiItems: KpiItem[] = [
  {
    icon: Users,
    label: "On shift today",
    value: String(DEMO_WORLD.headcount.scheduledToday),
    delta: "Demo data",
    tone: "info",
    tip: "Staff currently on shift across all departments.",
  },
];

// Open shifts in next week's draft (15–21 Jun 2026)
export const openShiftItems: OpenShiftItem[] = [
  { label: "Bar — Evening", date: "Fri 19 Jun · 16:00–00:00", filled: "Open" },
  { label: "Porter — Day", date: "Fri 19 Jun · 07:00–15:00", filled: "Open" },
];

export const staffDeptItems: StaffDeptItem[] = [
  { dept: "Front of House", count: 3, tone: "info" },
  { dept: "Kitchen", count: 1, tone: "warning" },
  { dept: "Housekeeping", count: 1, tone: "success" },
  { dept: "Maintenance", count: 1, tone: "purple" },
];

// Announcements — relative dates anchored to Thu 11 Jun 2026
export const announcementItems: AnnouncementItem[] = [
  {
    t: "Summer Menu Launch",
    s: "Read 6 / 8",
    a: "2d ago",
    tone: "info",
  },
  {
    t: "Food Safety Refresher",
    s: "Read 5 / 8",
    a: "3d ago",
    tone: "warning",
  },
  {
    t: "Bank Holiday: Opening Hours",
    s: "Read 8 / 8",
    a: "5d ago",
    tone: "purple",
  },
];

export const quickActionItems: QuickActionItem[] = [
  { t: "Add shift", s: "Open or assigned shift", icon: Calendar, route: "/rota" },
  { t: "New leave request", s: "Annual, sick, compassionate", icon: Plane, route: "/leave" },
  {
    t: "Announcement",
    s: "To a department or everyone",
    icon: Megaphone,
    route: "/team",
  },
  {
    t: "Log incident",
    s: "Incident or maintenance ticket",
    icon: AlertTriangle,
    route: "/ops",
    preview: true,
  },
];
