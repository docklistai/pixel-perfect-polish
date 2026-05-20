import type { LucideIcon } from "lucide-react";

export interface KpiItem {
  icon: LucideIcon;
  label: string;
  value: string;
  delta: string;
  up: boolean;
  tone: string;
}

export interface AttentionItem {
  t: string;
  s: string;
}

export interface OpenShiftItem {
  label: string;
  date: string;
  filled: string;
}

export interface LeaveItem {
  n: string;
  d: string;
  img: number;
}

export interface TimesheetItem {
  n: string;
  d: string;
  late: string;
  img: number;
}

export interface StaffDeptItem {
  dept: string;
  count: number;
}

export interface AnnouncementItem {
  t: string;
  s: string;
  a: string;
  tone: string;
}

export interface QuickActionItem {
  t: string;
  s: string;
  icon: LucideIcon;
}

export const toneBg: Record<string, string> = {
  info: "bg-info-soft text-info",
  brand: "bg-brand-soft text-brand",
  warning: "bg-warning-soft text-warning",
  purple: "bg-accent-purple-soft text-accent-purple",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
};
