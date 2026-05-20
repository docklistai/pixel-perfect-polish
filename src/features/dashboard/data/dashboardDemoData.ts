// Demo period: week of Mon 18 – Sun 24 May 2026 (current), next rota: Mon 25 May 2026
import { Users, Star, Calendar, Clock3, Plus, Megaphone } from "lucide-react";
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
  },
  {
    icon: Star,
    label: "Coverage",
    value: "98%",
    delta: "2pp vs last week",
    up: true,
    tone: "success",
  },
  {
    icon: Calendar,
    label: "Open Shifts",
    value: "3",
    delta: "2 fewer than last week",
    up: true,
    tone: "brand",
  },
  {
    icon: Clock3,
    label: "Pending Approvals",
    value: "8",
    delta: "awaiting action",
    up: false,
    tone: "warning",
  },
  {
    icon: Users,
    label: "On Shift Today",
    value: "28",
    delta: "vs 26 last week",
    up: true,
    tone: "purple",
  },
];

export const attentionItems: AttentionItem[] = [
  { t: "3 Shifts are understaffed", s: "Today · View shifts" },
  { t: "2 Timesheets need approval", s: "Overdue · Review now" },
];

// Open shifts this week (18–24 May 2026) — days of week confirmed
export const openShiftItems: OpenShiftItem[] = [
  { label: "Bar — Evening", date: "Thu 21 May · 17:00–23:00", filled: "1 of 2 filled" },
  { label: "Kitchen — Lunch", date: "Fri 22 May · 12:00–20:00", filled: "2 of 3 filled" },
  { label: "Front of House", date: "Sat 23 May · 09:00–17:00", filled: "3 of 4 filled" },
];

// Pending leave — future dates, consistent with leave feature demo data
export const leaveItems: LeaveItem[] = [
  { n: "Sophie Carter", d: "27 – 29 May 2026  (3 days)", img: 5 },
  { n: "Daniel Mitchell", d: "26 – 27 May 2026  (2 days)", img: 12 },
  { n: "Priya Patel", d: "31 May – 2 Jun 2026  (3 days)", img: 47 },
];

// Timesheets — previous week Mon 11 – Sun 17 May 2026
export const timesheetItems: TimesheetItem[] = [
  { n: "Emma Johnson", d: "11 – 17 May 2026", late: "2 days late", img: 9 },
  { n: "Liam O'Connor", d: "11 – 17 May 2026", late: "1 day late", img: 13 },
  { n: "Olivia Bennett", d: "11 – 17 May 2026", late: "1 day late", img: 16 },
];

export const staffDeptItems: StaffDeptItem[] = [
  { dept: "Front of House", count: 12 },
  { dept: "Kitchen", count: 9 },
  { dept: "Housekeeping", count: 4 },
  { dept: "Bar", count: 3 },
];

// Announcements — relative dates anchored to Wed 20 May 2026
export const announcementItems: AnnouncementItem[] = [
  {
    t: "New Summer Menu Launch",
    s: "Check out the new menu additions",
    a: "3 days ago",
    tone: "info",
  },
  {
    t: "Training: Upselling Workshop",
    s: "Mon, 25 May · 14:00 – 15:30",
    a: "3 days ago",
    tone: "warning",
  },
  {
    t: "Staff Party",
    s: "Sat, 30 May · 19:00 at Harbour Lounge",
    a: "5 days ago",
    tone: "purple",
  },
];

export const quickActionItems: QuickActionItem[] = [
  { t: "Add Shift", s: "Create an open shift", icon: Calendar },
  { t: "Add Leave Request", s: "Add a new leave request", icon: Plus },
  { t: "Clock In / Out", s: "Record time for a team member", icon: Clock3 },
  { t: "Add Announcement", s: "Share news with your team", icon: Megaphone },
];
