// Demo period: week of Mon 18 – Sun 24 May 2026 (current), next rota: Mon 25 May 2026
import {
  Users,
  Star,
  Calendar,
  Clock3,
  Megaphone,
  AlertTriangle,
  Plane,
  DollarSign,
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
    label: "Scheduled Hours",
    value: "1,248h",
    delta: "6% vs last week",
    up: true,
    tone: "info",
    tip: "Total scheduled hours across all departments this week.",
  },
  {
    icon: DollarSign,
    label: "Labour Cost",
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
    delta: "1.4pp below target",
    up: true,
    tone: "success",
    tip: "Labour cost as % of projected revenue. Target: 30%.",
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
  {
    icon: Clock3,
    label: "On Shift Today",
    value: "28",
    delta: "vs 26 last week",
    up: true,
    tone: "purple",
    tip: "Staff clocked in or scheduled for today's shifts.",
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
    s: "Priya · 31 May – 2 Jun",
    icon: Plane,
    tone: "purple",
  },
];

// Open shifts this week (18–24 May 2026) — days of week confirmed
export const openShiftItems: OpenShiftItem[] = [
  { label: "Bar — Evening", date: "Thu 21 May · 17:00–23:00", filled: "1 of 2 filled" },
  { label: "Kitchen — Lunch", date: "Fri 22 May · 12:00–20:00", filled: "2 of 3 filled" },
  { label: "Front of House", date: "Sat 23 May · 09:00–17:00", filled: "3 of 4 filled" },
];

// Pending leave — future dates, consistent with leave feature demo data
export const leaveItems: LeaveItem[] = [
  {
    n: "Sophie Carter",
    d: "27 – 29 May 2026  (3 days)",
    img: 5,
    impact: "Low",
    impactTone: "success",
  },
  {
    n: "Daniel Mitchell",
    d: "26 – 27 May 2026  (2 days)",
    img: 12,
    impact: "Moderate",
    impactTone: "warning",
  },
  {
    n: "Priya Patel",
    d: "31 May – 2 Jun 2026  (3 days)",
    img: 47,
    impact: "High",
    impactTone: "danger",
  },
];

// Timesheets — previous week Mon 11 – Sun 17 May 2026
export const timesheetItems: TimesheetItem[] = [
  { n: "Emma Johnson", d: "11 – 17 May 2026", late: "2 days late", img: 9, lateTone: "danger" },
  { n: "Liam O'Connor", d: "11 – 17 May 2026", late: "1 day late", img: 13, lateTone: "warning" },
  { n: "Olivia Bennett", d: "11 – 17 May 2026", late: "1 day late", img: 16, lateTone: "warning" },
];

export const staffDeptItems: StaffDeptItem[] = [
  { dept: "Front of House", count: 12, tone: "info" },
  { dept: "Kitchen", count: 9, tone: "warning" },
  { dept: "Housekeeping", count: 4, tone: "success" },
  { dept: "Bar", count: 3, tone: "danger" },
];

// Announcements — relative dates anchored to Wed 20 May 2026
export const announcementItems: AnnouncementItem[] = [
  {
    t: "New Summer Menu Launch",
    s: "Check out the new menu additions",
    a: "2d ago",
    tone: "info",
  },
  {
    t: "Training: Upselling Workshop",
    s: "Mon, 25 May · 14:00 – 15:30",
    a: "3d ago",
    tone: "warning",
  },
  {
    t: "Staff Party",
    s: "Sat, 30 May · 19:00 at Harbour Lounge",
    a: "5d ago",
    tone: "purple",
  },
];

export const quickActionItems: QuickActionItem[] = [
  { t: "Add Shift", s: "Open or assigned shift", icon: Calendar, route: "/rota" },
  { t: "New Leave Request", s: "Annual, sick, compassionate", icon: Plane, route: "/leave" },
  { t: "Post Announcement", s: "To a department or everyone", icon: Megaphone, route: "/team" },
  { t: "Clock In / Out", s: "Record time for a team member", icon: Clock3, route: "/time" },
];
