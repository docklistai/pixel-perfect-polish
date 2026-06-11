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
  AttentionItem,
  OpenShiftItem,
  LeaveItem,
  TimesheetItem,
  StaffDeptItem,
  AnnouncementItem,
  QuickActionItem,
} from "../types";

export const kpiItems: KpiItem[] = [
  {
    icon: Users,
    label: "Scheduled hours",
    value: "1,248h",
    delta: "6% vs last week",
    up: true,
    tone: "info",
    tip: "Total scheduled hours across all departments this week.",
  },
  {
    icon: DollarSign,
    label: "Labour cost",
    value: "£18,420",
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
    value: "3.48",
    delta: "0.18 vs last week",
    up: true,
    tone: "warning",
    tip: "Projected sales for every £1 of labour spent.",
  },
  {
    icon: Calendar,
    label: "Coverage",
    value: "98%",
    delta: "2pp vs last week",
    up: true,
    tone: "warning",
    tip: "Scheduled vs role requirement. 100% = fully staffed.",
  },
];

export const todayKpiItems: KpiItem[] = [
  {
    icon: Users,
    label: "On shift today",
    value: "28",
    delta: "96% coverage",
    up: true,
    tone: "info",
    tip: "Staff currently on shift across all departments.",
  },
  {
    icon: Clock,
    label: "Hours today",
    value: "168h",
    delta: "vs 160h target",
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

export const attentionItems: AttentionItem[] = [
  {
    t: "3 shifts still unassigned this week",
    s: "Resolve before Fri 16:00 to publish on time",
    icon: AlertTriangle,
    tone: "warning",
  },
  {
    t: "2 timesheets need approval",
    s: "Last week · payroll closes Friday",
    icon: Clock3,
    tone: "danger",
  },
  {
    t: "1 leave request — high coverage impact",
    s: "Priya · 21 – 23 Jun",
    icon: Plane,
    tone: "purple",
  },
];

// Open shifts this week (8–14 Jun 2026) — days of week confirmed
export const openShiftItems: OpenShiftItem[] = [
  { label: "Bar — Evening", date: "Thu 11 Jun · 17:00–23:00", filled: "1 of 2 filled" },
  { label: "Kitchen — Lunch", date: "Fri 12 Jun · 12:00–20:00", filled: "2 of 3 filled" },
  { label: "Front of House", date: "Sat 13 Jun · 09:00–17:00", filled: "3 of 4 filled" },
];

// Pending leave — future dates, consistent with leave feature demo data
export const leaveItems: LeaveItem[] = [
  {
    n: "Sophie Carter",
    d: "8 – 10 Jun 2026  (3 days)",
    img: 5,
    impact: "Low",
    impactTone: "success",
  },
  {
    n: "Daniel Mitchell",
    d: "16 – 17 Jun 2026  (2 days)",
    img: 12,
    impact: "Moderate",
    impactTone: "warning",
  },
  {
    n: "Priya Patel",
    d: "21 – 23 Jun 2026  (3 days)",
    img: 47,
    impact: "High",
    impactTone: "danger",
  },
];

// Timesheets — previous week Mon 1 – Sun 7 Jun 2026
export const timesheetItems: TimesheetItem[] = [
  { n: "Emma Johnson", d: "1 – 7 Jun 2026", late: "2 days late", img: 9, lateTone: "danger" },
  { n: "Liam O'Connor", d: "1 – 7 Jun 2026", late: "1 day late", img: 13, lateTone: "warning" },
  { n: "Olivia Bennett", d: "1 – 7 Jun 2026", late: "1 day late", img: 16, lateTone: "warning" },
];

export const staffDeptItems: StaffDeptItem[] = [
  { dept: "Front of House", count: 12, tone: "info" },
  { dept: "Kitchen", count: 9, tone: "warning" },
  { dept: "Housekeeping", count: 4, tone: "success" },
  { dept: "Bar", count: 3, tone: "danger" },
];

// Announcements — relative dates anchored to Thu 11 Jun 2026
export const announcementItems: AnnouncementItem[] = [
  {
    t: "Summer Menu Launch",
    s: "Read 18 / 24",
    a: "2d ago",
    tone: "info",
  },
  {
    t: "Food Safety Refresher",
    s: "Read 14 / 18",
    a: "3d ago",
    tone: "warning",
  },
  {
    t: "Bank Holiday: Opening Hours",
    s: "Read 24 / 24",
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
