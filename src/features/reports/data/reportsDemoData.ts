import { PoundSterling, Percent, Clock3, Users, TrendingUp } from "lucide-react";
import type { Kpi, Insight } from "../types";

export const kpis: Kpi[] = [
  {
    l: "Labour cost",
    v: "£42,180",
    d: "3.2%",
    up: false,
    vs: "vs last period",
    icon: PoundSterling,
    tone: "brand",
  },
  {
    l: "Labour vs sales",
    v: "28.4%",
    d: "0.8pp",
    up: false,
    vs: "vs last period",
    icon: Percent,
    tone: "warning",
  },
  {
    l: "Hours worked",
    v: "3,124h",
    d: "1.5%",
    up: true,
    vs: "vs last period",
    icon: Clock3,
    tone: "info",
  },
  {
    l: "Avg headcount",
    v: "46",
    d: "2",
    up: true,
    vs: "vs last period",
    icon: Users,
    tone: "warning",
  },
];

export const insights: Insight[] = [
  {
    t: "Labour % is improving",
    s: "Down 0.8pp vs the last 4 weeks and tracking ahead of target.",
    icon: TrendingUp,
    tone: "success",
  },
  {
    t: "Saturday is spending more than needed",
    s: "Bar shifts overlap 18:00–22:00. One lighter change would save cover.",
    icon: Clock3,
    tone: "warning",
  },
  {
    t: "Headcount is creeping up",
    s: "Staffing growth is still leaning toward front-of-house cover.",
    icon: Users,
    tone: "info",
  },
];
