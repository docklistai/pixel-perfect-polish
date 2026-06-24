// Demo period: week of Mon 8 – Sun 14 Jun 2026. Today: Thu 11 Jun 2026.
import {
  Megaphone,
  Bell,
  Shield,
  Clock,
  Trophy,
  Shirt,
  GraduationCap,
  Wine,
  Cake,
  ArrowRight,
  Users,
} from "lucide-react";
import type {
  TeamKpi,
  TeamAnnouncement,
  TeamTrainingItem,
  TeamBirthdayItem,
  TeamEventItem,
  TeamGroup,
} from "../types";

export const kpiItems: TeamKpi[] = [
  {
    v: "2",
    l: "Unread announcements",
    s: "2 sample ack prompts",
    icon: Megaphone,
    tone: "purple",
  },
  {
    v: "2",
    l: "Sample ack prompts",
    s: "Across 2 sample announcements",
    icon: Shield,
    tone: "warning",
  },
  {
    v: "3",
    l: "Sample updates",
    s: "Preview content only",
    icon: Bell,
    tone: "success",
  },
];

export const announcements: TeamAnnouncement[] = [
  {
    id: "summer-menu",
    pinned: true,
    t: "Summer Menu Launch",
    emoji: "☀️",
    body: "We're excited to launch our new summer menu from Monday 15 Jun. Please take time to familiarise yourself with the new dishes, ingredients...",
    tags: ["All Staff", "Restaurant, Bar, Kitchen"],
    audiences: ["All Staff"],
    ackDone: 6,
    ackTotal: 8,
    date: "6 Jun 2026",
    icon: Cake,
    tone: "purple",
    myAck: false,
  },
  {
    id: "food-safety",
    pinned: true,
    t: "Food Safety Refresher",
    emoji: "🛡",
    body: "A sample reminder to review food-safety notes by 21 Jun. This is not a training module or LMS record...",
    tags: ["Kitchen, FOH", "Harbour View Hotel"],
    audiences: ["Kitchen", "Front of House"],
    ackDone: 5,
    ackTotal: 8,
    date: "4 Jun 2026",
    icon: Shield,
    tone: "warning",
    myAck: false,
  },
  {
    id: "bank-holiday",
    t: "Bank Holiday: Opening Hours",
    emoji: "📅",
    body: "Please note our opening hours for the upcoming summer bank holiday on Monday 31 Aug.",
    tags: ["All Staff"],
    audiences: ["All Staff"],
    ackDone: 8,
    ackTotal: 8,
    date: "2 Jun 2026",
    icon: Clock,
    tone: "info",
    myAck: true,
  },
  {
    id: "shout-outs",
    t: "Sample service thank-you",
    emoji: "👏",
    body: "Sample appreciation note for a busy service period. This preview is not posted to a staff feed.",
    tags: ["All Staff", "Harbour View Hotel"],
    audiences: ["All Staff"],
    ackDone: 7,
    ackTotal: 8,
    date: "30 May 2026",
    icon: Trophy,
    tone: "purple",
    myAck: true,
  },
  {
    id: "uniform",
    t: "Uniform Update",
    emoji: "👕",
    body: "New uniform items are now available in all sizes. See Reception to collect yours.",
    tags: ["All Staff"],
    audiences: ["All Staff"],
    ackDone: 6,
    ackTotal: 8,
    date: "28 May 2026",
    icon: Shirt,
    tone: "danger",
    myAck: true,
  },
];

export const trainingItems: TeamTrainingItem[] = [
  {
    t: "Sample upselling briefing",
    d: "Thu, 11 Jun · 14:00 – 15:30",
    w: "Today",
    icon: GraduationCap,
    tone: "info",
    source: "Sample manager reminder",
    assigned: "FOH",
    mandatory: false,
    complete: "3 / 3",
  },
  {
    t: "Food Safety Refresher",
    d: "Sat, 13 Jun · 09:00 – 10:00",
    w: "2 days",
    icon: Shield,
    tone: "warning",
    source: "Sample staff records",
    assigned: "FOH + Kitchen",
    mandatory: true,
    complete: "5 / 8",
  },
  {
    t: "Sample bar briefing",
    d: "Wed, 17 Jun · 15:00 – 16:30",
    w: "6 days",
    icon: Wine,
    tone: "purple",
    source: "Sample manager reminder",
    assigned: "Bar",
    mandatory: false,
    complete: "1 / 1",
  },
];

export const birthdayItems: TeamBirthdayItem[] = [
  { n: "Liam O'Connor", d: "9 Jun", img: 13 },
  { n: "Olivia Bennett", d: "11 Jun", img: 16 },
  { n: "Daniel Mitchell", d: "12 Jun", img: 12 },
];

export const staffEvents: TeamEventItem[] = [
  {
    t: "Sample cover note after evening service",
    d: "Sat, 13 Jun · 18:30",
    w: "2 days",
    icon: Cake,
    tone: "info",
  },
  {
    t: "Wellbeing check-in before shift",
    d: "Sun, 14 Jun · 09:00",
    w: "3 days",
    icon: Trophy,
    tone: "warning",
  },
  {
    t: "Community event cover note",
    d: "Mon, 22 Jun · 08:00",
    w: "11 days",
    icon: ArrowRight,
    tone: "success",
  },
];

export const quickGroups: TeamGroup[] = [
  { label: "All Staff", members: "8 members" },
  { label: "Front of House", members: "3 members" },
  { label: "Kitchen", members: "2 members" },
  { label: "Housekeeping", members: "1 member" },
];

export const audienceOptions = [
  "All audiences",
  "All Staff",
  "Front of House",
  "Kitchen",
  "Housekeeping",
] as const;

export const TOTAL_STAFF = 8;
