import type { LucideIcon } from "lucide-react";

export interface KpiItem {
  icon: LucideIcon;
  label: string;
  value: string;
  /** Short caption under the value, e.g. "Live roster" or a real trend. */
  delta: string;
  /** Trend direction. Omit when there is no real week-on-week comparison. */
  up?: boolean;
  tone: string;
  tip?: string;
}

export interface AttentionItem {
  t: string;
  s: string;
  icon?: LucideIcon;
  tone?: string;
  route?: AppRoute;
  cta?: string;
  tag?: string;
  detail?: string;
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
  impact?: string;
  impactTone?: string;
}

export interface TimesheetItem {
  id: string;
  n: string;
  d: string;
  late: string;
  img: number;
  lateTone?: "warning" | "danger";
}

export interface AnnouncementItem {
  t: string;
  s: string;
  a: string;
  tone: string;
}

export type AppRoute =
  | "/"
  | "/rota"
  | "/leave"
  | "/time"
  | "/team"
  | "/ops"
  | "/staff"
  | "/reports"
  | "/settings";

export interface QuickActionItem {
  t: string;
  s: string;
  icon: LucideIcon;
  route?: AppRoute;
  /** True when the target route is a preview-only surface (not yet live). */
  preview?: boolean;
}

export const toneBg: Record<string, string> = {
  info: "bg-info-soft text-info",
  brand: "bg-brand-soft text-brand",
  warning: "bg-warning-soft text-warning",
  purple: "bg-accent-purple-soft text-accent-purple",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
};
