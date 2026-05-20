import type * as React from "react";

export type DrawerMode = "incident" | "task" | "handover" | null;

export interface OpsStatCard {
  l: string;
  v: string;
  s: string;
  icon: React.ComponentType<{ className?: string }>;
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
