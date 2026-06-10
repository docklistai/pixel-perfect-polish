import type { LucideIcon } from "lucide-react";

export type Tone = "purple" | "warning" | "info" | "success" | "danger";

export const toneBg: Record<Tone, string> = {
  purple: "bg-accent-purple-soft text-accent-purple",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
};

export interface TeamKpi {
  v: string;
  l: string;
  s: string;
  icon: LucideIcon;
  tone: Tone;
}

export interface TeamAnnouncement {
  id: string;
  pinned?: boolean;
  t: string;
  emoji: string;
  body: string;
  tags: string[];
  audiences: string[];
  ackDone: number;
  ackTotal: number;
  date: string;
  icon: LucideIcon;
  tone: Tone;
  myAck: boolean;
}

export interface TeamTrainingItem {
  t: string;
  d: string;
  w: string;
  icon: LucideIcon;
  tone: Tone;
  source?: string;
  assigned?: string;
  mandatory?: boolean;
  complete?: string;
}

export interface TeamBirthdayItem {
  n: string;
  d: string;
  img: number;
}

export interface TeamEventItem {
  t: string;
  d: string;
  w: string;
  icon: LucideIcon;
  tone: Tone;
}

export interface TeamGroup {
  label: string;
  members: string;
}

export type TabKey = "all" | "pinned" | "myAck";
