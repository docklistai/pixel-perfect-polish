import { Calendar, Percent, Users, Clock, Shield, TrendingUp, CheckCircle2 } from "lucide-react";
import type { Kpi, Insight } from "../types";

export const kpis: Kpi[] = [
  {
    l: "Scheduled Hours",
    v: "312 hrs",
    d: "4 hrs",
    up: false,
    vs: "vs last period",
    icon: Calendar,
    tone: "info",
  },
  {
    l: "Labour %",
    v: "28.4%",
    d: "0.8pp",
    up: false,
    vs: "vs last period",
    icon: Percent,
    tone: "warning",
  },
  {
    l: "Absence Rate",
    v: "4.2%",
    d: "0.6pp",
    up: false,
    vs: "vs last period",
    icon: Users,
    tone: "purple",
  },
  {
    l: "Overtime",
    v: "18.7 hrs",
    d: "2.1 hrs",
    up: true,
    vs: "vs last period",
    icon: Clock,
    tone: "danger",
  },
  {
    l: "Rota Compliance",
    v: "92%",
    d: "3pp",
    up: true,
    vs: "vs last period",
    icon: Shield,
    tone: "success",
  },
];

export const insights: Insight[] = [
  {
    t: "Labour ran 1.8pp above target on weekends",
    s: "Weekend labour % was 31.2% vs a planning target of 29.4%.",
    icon: TrendingUp,
    tone: "warning",
  },
  {
    t: "2 teams have repeated late clock-ins",
    s: "Kitchen and Bar teams had the most late starts this week.",
    icon: Users,
    tone: "danger",
  },
  {
    t: "Overtime increased by 2.1 hrs vs last week",
    s: "Mostly driven by Friday and Saturday shifts.",
    icon: Calendar,
    tone: "info",
  },
  {
    t: "Rota compliance improved to 92%",
    s: "Keep an eye on next week's gaps before publishing.",
    icon: CheckCircle2,
    tone: "success",
  },
];
