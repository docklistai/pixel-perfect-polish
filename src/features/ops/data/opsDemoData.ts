import {
  ListChecks,
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  FileText,
  Phone,
  ShieldCheck,
  Wrench,
  FileQuestion,
} from "lucide-react";
import type { OpsStatCard, TimelineEntry, HandoverNote, FollowUp, QuickRefItem } from "../types";

export const toneBg: Record<string, string> = {
  info: "bg-info-soft text-info",
  warning: "bg-warning-soft text-warning",
  purple: "bg-accent-purple-soft text-accent-purple",
  success: "bg-success-soft text-success",
};

export const opsStats: OpsStatCard[] = [
  { l: "Active shifts", v: "6", s: "6 staff scheduled today", icon: Briefcase, tone: "info" },
  { l: "Tasks completed", v: "14", s: "Today", icon: CheckCircle2, tone: "brand" },
  {
    l: "Open incidents",
    v: "5",
    s: "2 high priority",
    icon: AlertTriangle,
    tone: "warning",
    danger: true,
  },
  { l: "Briefings posted", v: "2", s: "Today", icon: FileText, tone: "purple" },
  { l: "Checklists", v: "98%", s: "Completed today", icon: ShieldCheck, tone: "success" },
];

export const opsTimeline: TimelineEntry[] = [
  {
    t: "08:15",
    title: "Daily briefing completed",
    area: "Front of House  ·  General",
    by: "By Sophie Carter",
    st: "Done",
    stTone: "success",
    dot: "info",
    icon: ListChecks,
  },
  {
    t: "08:40",
    title: "Guest request – Late checkout",
    area: "Room 302  ·  Service",
    who: { n: "Daniel Mitchell", img: 12 },
    prio: "Low",
    prioTone: "info",
    st: "In progress",
    stTone: "info",
    dot: "info",
    icon: ListChecks,
  },
  {
    t: "09:05",
    title: "Maintenance – Leaking tap",
    area: "Room 205  ·  Maintenance",
    who: { n: "Liam O'Connor", img: 13 },
    prio: "Medium",
    prioTone: "warning",
    st: "Open",
    stTone: "warning",
    dot: "warning",
    icon: FileText,
  },
  {
    t: "09:20",
    title: "Incident report – Guest slip in lobby",
    area: "Lobby  ·  Incident",
    who: { n: "Priya Patel", img: 47 },
    prio: "High",
    prioTone: "danger",
    st: "Open",
    stTone: "warning",
    dot: "danger",
    icon: AlertTriangle,
    highlight: true,
  },
  {
    t: "10:15",
    title: "Minibar restock",
    area: "All floors  ·  Housekeeping",
    who: { n: "Olivia Bennett", img: 16 },
    prio: "Low",
    prioTone: "info",
    st: "In progress",
    stTone: "info",
    dot: "info",
    icon: ListChecks,
  },
  {
    t: "10:45",
    title: "AC not cooling properly",
    area: "Room 412  ·  Maintenance",
    who: { n: "Liam O'Connor", img: 13 },
    prio: "Medium",
    prioTone: "warning",
    st: "Open",
    stTone: "warning",
    dot: "warning",
    icon: FileText,
  },
  {
    t: "11:30",
    title: "VIP arrival – Notes added",
    area: "Mr. James Wilson  ·  Front of House",
    who: { n: "Sophie Carter", img: 5 },
    prio: "Low",
    prioTone: "info",
    st: "Done",
    stTone: "success",
    dot: "info",
    icon: ListChecks,
  },
  {
    t: "12:05",
    title: "Broken wine glass",
    area: "Harbour View Hotel  ·  Incident",
    who: { n: "Daniel Mitchell", img: 12 },
    prio: "Low",
    prioTone: "info",
    st: "Closed",
    stTone: "info",
    dot: "info",
    icon: AlertTriangle,
  },
];

export const opsHandoverNotes: HandoverNote[] = [
  {
    from: "Morning shift",
    to: "Afternoon shift",
    who: "Sophie Carter · 11 Jun 2026, 07:00",
    note: "Busy check-in period expected. VIP arrival at 14:00. Maintenance team aware of AC issues on 4th floor.",
    tag: "High priority",
    tone: "danger",
  },
  {
    from: "Afternoon shift",
    to: "Evening shift",
    who: "Daniel Mitchell · 11 Jun 2026, 14:45",
    note: "Lobby is busier than usual. One maintenance job pending. Please follow up on minibar restock.",
    tag: "Medium priority",
    tone: "warning",
  },
];

export const opsFollowUps: FollowUp[] = [
  {
    t: "Incident report – Guest slip in lobby",
    w: "Sophie Carter · Due in 15m",
    p: "High",
    tone: "danger",
  },
  {
    t: "AC not cooling properly (Room 412)",
    w: "Liam O'Connor · Due in 1h",
    p: "Medium",
    tone: "warning",
  },
  {
    t: "Leaking tap (Room 205)",
    w: "Liam O'Connor · Due in 2h",
    p: "Medium",
    tone: "warning",
  },
];

export const opsQuickRef: QuickRefItem[] = [
  { t: "Emergency contacts", icon: Phone, tone: "danger" },
  { t: "Maintenance log", icon: Wrench, tone: "info" },
  { t: "Property information", icon: FileText, tone: "info" },
  { t: "Lost & found", icon: FileQuestion, tone: "info" },
];
