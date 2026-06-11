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
    delta: "6% vs last week",
    up: true,
    tone: "info",
    tip: "Total scheduled hours across all departments this week.",
  },
  {
    icon: DollarSign,
    label: "Labour cost",
    value: "£5,291",
    delta: "3% vs last week",
    up: true,
    tone: "brand",
    tip: "Wage cost based on scheduled hours × pay rates.",
  },
  {
    icon: Star,
    label: "Labour %",
    value: "28.6%",
    delta: "1.4pp vs last week",
    up: false,
    tone: "success",
    tip: "Labour cost as % of projected revenue. Target: 30%.",
  },
  {
    icon: TrendingUp,
    label: "Sales : labour",
    value: "3.50",
    delta: "0.18 vs last week",
    up: true,
    tone: "warning",
    tip: "Projected sales for every £1 of labour spent.",
  },
  {
    icon: Calendar,
    label: "Coverage",
    value: "96%",
    delta: "Next-week draft",
    up: true,
    tone: "warning",
    tip: "Scheduled vs role requirement. 100% = fully staffed.",
  },
];

export const todayKpiItems: KpiItem[] = [
  {
    icon: Users,
    label: "On shift today",
    value: String(DEMO_WORLD.headcount.scheduledToday),
    delta: "96% coverage",
    up: true,
    tone: "info",
    tip: "Staff currently on shift across all departments.",
  },
  {
    icon: Clock,
    label: "Hours today",
    value: "48h",
    delta: "6 scheduled shifts",
    up: true,
    tone: "brand",
    tip: "Total scheduled hours across today's shifts.",
  },
  {
    icon: Percent,
    label: "Labour % today",
    value: "28.1%",
    delta: "0.5pp better",
    up: false,
    tone: "success",
    tip: "Labour cost / projected today's sales.",
  },
  {
    icon: AlertTriangle,
    label: "Open incidents",
    value: "2",
    delta: "1 high priority",
    up: false,
    tone: "warning",
    tip: "Active incidents logged today.",
  },
  {
    icon: Star,
    label: "Coverage",
    value: "96%",
    delta: "2pp vs target",
    up: true,
    tone: "warning",
    tip: "Scheduled vs role requirement today.",
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
  { t: "Announcement", s: "To a department or everyone", icon: Megaphone, route: "/team" },
  { t: "Log incident", s: "Incident or maintenance ticket", icon: AlertTriangle, route: "/ops" },
];
