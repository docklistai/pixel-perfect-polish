import { PoundSterling, Percent, Clock3, Users, TrendingUp } from "lucide-react";
import type { Kpi, Insight } from "../types";

export const kpis: Kpi[] = [
  {
    l: "Labour cost",
    v: "£20,840",
    d: "3.2%",
    up: false,
    vs: "vs last period",
    icon: PoundSterling,
    tone: "brand",
  },
  {
    l: "Labour vs sales",
    v: "28.6%",
    d: "0.8pp",
    up: false,
    vs: "vs last period",
    icon: Percent,
    tone: "warning",
  },
  {
    l: "Hours worked",
    v: "1,368h",
    d: "1.5%",
    up: true,
    vs: "vs last period",
    icon: Clock3,
    tone: "info",
  },
  {
    l: "Avg headcount",
    v: "8",
    d: "0",
    up: false,
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
    s: "Late Bar cover runs beyond forecast demand. One lighter close would save cover.",
    icon: Clock3,
    tone: "warning",
  },
  {
    t: "Headcount is stable",
    s: "The eight-person team is unchanged across the current reporting period.",
    icon: Users,
    tone: "info",
  },
];
