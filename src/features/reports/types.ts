import type { LucideIcon } from "lucide-react";

export type KpiTone = "info" | "warning" | "purple" | "danger" | "success";

export interface Kpi {
  l: string;
  v: string;
  d: string;
  up: boolean;
  vs: string;
  icon: LucideIcon;
  tone: KpiTone;
}

export interface Insight {
  t: string;
  s: string;
  icon: LucideIcon;
  tone: KpiTone;
}

export const toneBg: Record<KpiTone, string> = {
  info: "bg-info-soft text-info",
  warning: "bg-warning-soft text-warning",
  purple: "bg-accent-purple-soft text-accent-purple",
  danger: "bg-danger-soft text-danger",
  success: "bg-success-soft text-success",
};
