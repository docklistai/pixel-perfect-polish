import {
  AlertTriangle,
  Plane,
  PoundSterling,
  Users,
  Megaphone,
  CheckCircle2,
  Info,
  TrendingUp,
  Trophy,
  Calendar,
  BarChart3,
  FileText,
  Edit,
  type LucideIcon,
} from "lucide-react";

export type ProtoTone = "teal" | "amber" | "purple" | "blue" | "red" | "green";

export interface AnswerBullet {
  title: string;
  body: string;
  tone?: ProtoTone;
  icon?: LucideIcon;
}

export interface AnswerAction {
  label: string;
  primary?: boolean;
  icon?: LucideIcon;
}

export interface SimulatedAnswer {
  title: string;
  summary: string;
  bullets?: AnswerBullet[];
  actions?: AnswerAction[];
}

export type Phase = "idle" | "running" | "answered";

export const QUICK_PROMPTS: { icon: LucideIcon; label: string }[] = [
  { icon: AlertTriangle, label: "Anything I should review before publishing this week's rota?" },
  { icon: Plane, label: "Summarise leave impact for week of 15 Jun" },
  { icon: PoundSterling, label: "Why is labour up 6% vs last week?" },
  { icon: Users, label: "Who's been picking up the most extra shifts this month?" },
  { icon: Megaphone, label: "Draft an announcement about Monday's deep clean" },
];

export const HISTORY = [
  { when: "Today, 13:40", q: "Rota review for week 8–14 Jun" },
  { when: "Today, 09:12", q: "Draft a polite reminder about uniform standards" },
  { when: "Yesterday", q: "Leave impact summary — 21 Jun" },
  { when: "30 May", q: "Coverage gaps in Housekeeping" },
];

/** Resolves a prompt to a simulated answer — exact key first, then intent patterns. */
export function matchAnswer(q: string): SimulatedAnswer {
  const exact = ANSWERS[q];
  if (exact) return exact;
  const lower = q.toLowerCase();
  if (lower.startsWith("suggest a fix")) return ANSWERS["conflict-fix"]!;
  if (lower.startsWith("find cover")) return ANSWERS["find-cover"]!;
  if (lower.startsWith("summarise the open issues")) {
    return ANSWERS["Anything I should review before publishing this week's rota?"]!;
  }
  return ANSWERS.default!;
}

export const ANSWERS: Record<string, SimulatedAnswer> = {
  default: {
    title: "Here's what I'm seeing",
    summary:
      "I don't have a tailored answer for that one yet. I ground every answer in your rota, time, leave, and labour data — only this workspace, never shared.",
    bullets: [
      {
        title: "Try a built-in prompt",
        body: "The suggestions above pull from live signals across your rota, timesheets, and leave queue.",
        tone: "blue",
        icon: Info,
      },
    ],
  },
  "Anything I should review before publishing this week's rota?": {
    title: "Three things to check before publishing",
    summary: "Coverage is at 96%, but I'd resolve these before you send it to staff.",
    bullets: [
      {
        title: "Conflict — Daniel, Fri 19 Jun",
        body: "Daniel's Kitchen Supervisor shifts overlap from 18:00 – 21:00. One needs to change.",
        tone: "red",
        icon: AlertTriangle,
      },
      {
        title: "Priya's leave reduces Sunday kitchen cover",
        body: "Approving 21–23 Jun leaves the kitchen without its Head Chef on Sunday.",
        tone: "purple",
        icon: Plane,
      },
      {
        title: "Saturday Bar is above forecast demand",
        body: "Late Bar cover runs beyond forecast demand. Trimming the close could save ~£86.",
        tone: "amber",
        icon: Users,
      },
    ],
    actions: [
      { label: "Open rota", icon: Calendar, primary: true },
      { label: "Show leave", icon: Plane },
    ],
  },
  "Summarise leave impact for week of 15 Jun": {
    title: "Week of 15 Jun — leave impact",
    summary:
      "Four pending requests affect the week. Coverage stays above 90% except Sunday in Kitchen.",
    bullets: [
      {
        title: "Mon – Fri all comfortable",
        body: "Highest gap is FOH on Thursday at 92% — no action needed.",
        tone: "green",
        icon: CheckCircle2,
      },
      {
        title: "Sunday HK dips to 50%",
        body: "Two HK staff off — Priya and Amelia. You could ask Ava if she can swap.",
        tone: "amber",
        icon: AlertTriangle,
      },
      {
        title: "All requests are within notice",
        body: "Average notice is 16 days — well over your 7-day workspace policy.",
        tone: "blue",
        icon: Info,
      },
    ],
    actions: [{ label: "Open rota for that week", icon: Calendar, primary: true }],
  },
  "Why is labour up 6% vs last week?": {
    title: "Labour is up 6% — mostly from Bar overtime",
    summary:
      "You scheduled £5,291 of labour this week vs £4,991 last week. The increase concentrates on Bar shifts after 22:00.",
    bullets: [
      {
        title: "Bar overtime contributed £640",
        body: "Three Bar shifts ran past 23:30 — closing took 25–40 min longer than scheduled.",
        tone: "amber",
        icon: TrendingUp,
      },
      {
        title: "Cover shift on Saturday",
        body: "You added Liam's open Saturday shift — that's £92 of the increase.",
        tone: "blue",
        icon: Users,
      },
      {
        title: "Labour % still on target",
        body: "At 28.6% you're below the 30% target — the absolute increase is OK.",
        tone: "green",
        icon: CheckCircle2,
      },
    ],
    actions: [{ label: "Open reports", icon: BarChart3, primary: true }],
  },
  "Who's been picking up the most extra shifts this month?": {
    title: "Top extra-shift pickups — June so far",
    summary:
      "Three people have stepped up the most. Worth a thank-you and a check that they're not heading for burnout.",
    bullets: [
      {
        title: "Sophie Carter — 2 extra shifts",
        body: "All covered short-notice. Currently at 92% of contracted hours — watch for fatigue.",
        tone: "amber",
        icon: Trophy,
      },
      {
        title: "Daniel Mitchell — 2 extra shifts",
        body: "Both in Kitchen — covered Priya's planning time.",
        tone: "teal",
        icon: Trophy,
      },
      {
        title: "Liam O'Connor — 3 extra shifts",
        body: "Picked up Saturday Bar each week. You may want to formalise this as a regular.",
        tone: "purple",
        icon: Trophy,
      },
    ],
    actions: [{ label: "Draft a thank-you announcement", icon: Megaphone, primary: true }],
  },
  "conflict-fix": {
    title: "Suggested fix for this conflict",
    summary:
      "Two shifts overlap on the same day. The cleanest fix keeps coverage steady without adding hours.",
    bullets: [
      {
        title: "Reassign the later shift",
        body: "Move the overlapping shift to a colleague in the same department who is under contracted hours this week.",
        tone: "teal",
        icon: CheckCircle2,
      },
      {
        title: "Or adjust the times",
        body: "If both shifts are needed, shorten one so they no longer overlap — keep an 11h rest gap.",
        tone: "blue",
        icon: Info,
      },
      {
        title: "Publishing stays blocked until resolved",
        body: "Conflicts must be cleared (or explicitly acknowledged) before staff see the rota.",
        tone: "amber",
        icon: AlertTriangle,
      },
    ],
    actions: [{ label: "Open rota", icon: Calendar, primary: true }],
  },
  "find-cover": {
    title: "Cover options",
    summary:
      "Based on availability and contracted hours, two colleagues could take the extra day without new alerts.",
    bullets: [
      {
        title: "Best option — same department",
        body: "Pick a colleague in the same department who is under contracted hours and has the day free.",
        tone: "teal",
        icon: Users,
      },
      {
        title: "Keep the working pattern intact",
        body: "Avoid giving anyone a 7th day — that just moves the alert to someone else.",
        tone: "amber",
        icon: AlertTriangle,
      },
    ],
    actions: [{ label: "Open rota", icon: Calendar, primary: true }],
  },
  "Draft an announcement about Monday's deep clean": {
    title: "Draft — Monday's deep clean briefing",
    summary: "Here's a starting draft. Tone is direct and friendly — adjust before sending.",
    bullets: [
      {
        title: "Subject",
        body: "Deep clean on Monday 15 Jun — what to expect",
        tone: "blue",
        icon: FileText,
      },
      {
        title: "Body",
        body: "Hi everyone — we're running our quarterly deep clean on Monday 15 Jun, 06:00 – 10:00. Bar and Kitchen will be closed during this window; please use the staff entrance only. Daniel will hand over to housekeeping at 10:00. Thanks for your flexibility — bring trainers, no chef whites until 11:00.",
        tone: "blue",
        icon: FileText,
      },
    ],
    actions: [{ label: "Open in composer", icon: Edit, primary: true }],
  },
};
