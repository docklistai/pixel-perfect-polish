import type * as React from "react";
import type { LucideIcon } from "lucide-react";

export interface OpsStatCard {
  l: string;
  v: string;
  s: string;
  icon: LucideIcon;
  tone: string;
  danger?: boolean;
}

export interface TimelineEntry {
  t: string;
  title: string;
  area: string;
  by?: string;
  who?: { n: string; img: number };
  prio?: string;
  prioTone?: string;
  st: string;
  stTone: string;
  dot: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
}

/** Timeline entry held in route state so status/delete/add actions can mutate it. */
export interface OpsEntry extends TimelineEntry {
  id: string;
}

export interface OpsFollowUpItem {
  title: string;
  done: boolean;
}

export interface OpsEntryDetails {
  description: string;
  location: string;
  severity?: string;
  notes?: string;
  followups: OpsFollowUpItem[];
}

export interface HandoverNote {
  from: string;
  to: string;
  who: string;
  note: string;
  tag: string;
  tone: string;
}

export interface FollowUp {
  t: string;
  w: string;
  p: string;
  tone: string;
}

export interface QuickRefItem {
  t: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}

export type OpsLogTab = "timeline" | "briefings" | "tasks" | "incidents" | "checks";

export interface OpsRiskItem {
  title: string;
  body: string;
  tone: "danger" | "warning" | "info";
  entryTitle?: string;
  actionLabel: string;
}

export interface OpsBriefing {
  title: string;
  by: string;
  body: string;
  read: string;
  tone: "brand" | "warning";
}

export interface OpsChecklist {
  name: string;
  progress: number;
  status: "Complete" | "In progress" | "Pending";
  tone: "success" | "warning" | "muted";
}

export interface OpsDepartmentCoverage {
  department: string;
  count: number;
  color: string;
}
