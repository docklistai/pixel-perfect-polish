// Demo period: week of Mon 18 – Sun 24 May 2026. Today: Wed 20 May 2026.
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
    v: "5",
    l: "Unread announcements",
    s: "2 require your acknowledgement",
    icon: Megaphone,
    tone: "purple",
  },
  {
    v: "2",
    l: "Acknowledgements required",
    s: "Across 2 announcements",
    icon: Shield,
    tone: "warning",
  },
  {
    v: "7",
    l: "Recent updates",
    s: "Since your last visit",
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
    body: "We're excited to launch our new summer menu from Monday 19 May. Please take time to familiarise yourself with the new dishes, ingredients...",
    tags: ["All Staff", "Restaurant, Bar, Kitchen"],
    audiences: ["All Staff"],
    ackDone: 18,
    ackTotal: 24,
    date: "16 May 2026",
    icon: Cake,
    tone: "purple",
    myAck: false,
  },
  {
    id: "food-safety",
    pinned: true,
    t: "Food Safety Refresher",
    emoji: "🛡",
    body: "A friendly reminder to complete your Food Safety Refresher module by 31 May. This short training helps us keep...",
    tags: ["Kitchen, FOH", "All Locations"],
    audiences: ["Kitchen", "Front of House"],
    ackDone: 14,
    ackTotal: 18,
    date: "14 May 2026",
    icon: Shield,
    tone: "warning",
    myAck: false,
  },
  {
    id: "bank-holiday",
    t: "Bank Holiday: Opening Hours",
    emoji: "📅",
    body: "Please note our opening hours for the upcoming bank holiday on Monday 26 May.",
    tags: ["All Staff"],
    audiences: ["All Staff"],
    ackDone: 24,
    ackTotal: 24,
    date: "12 May 2026",
    icon: Clock,
    tone: "info",
    myAck: true,
  },
  {
    id: "shout-outs",
    t: "Team Shout-Outs",
    emoji: "👏",
    body: "Big thanks to everyone for a fantastic week! Your hard work and positive energy are what make Harbour View special.",
    tags: ["All Staff", "All Locations"],
    audiences: ["All Staff"],
    ackDone: 22,
    ackTotal: 24,
    date: "9 May 2026",
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
    ackDone: 11,
    ackTotal: 24,
    date: "7 May 2026",
    icon: Shirt,
    tone: "danger",
    myAck: true,
  },
];

export const trainingItems: TeamTrainingItem[] = [
  {
    t: "Upselling Workshop",
    d: "Wed, 20 May · 14:00 – 15:30",
    w: "Today",
    icon: GraduationCap,
    tone: "info",
    source: "Manager-scheduled",
    assigned: "FOH",
    mandatory: false,
    complete: "8 / 12",
  },
  {
    t: "Food Safety Refresher",
    d: "Sat, 23 May · 09:00 – 10:00",
    w: "3 days",
    icon: Shield,
    tone: "warning",
    source: "Staff training requirements",
    assigned: "FOH + Kitchen",
    mandatory: true,
    complete: "14 / 18",
  },
  {
    t: "Cocktail Masterclass",
    d: "Wed, 27 May · 15:00 – 16:30",
    w: "7 days",
    icon: Wine,
    tone: "purple",
    source: "Manager-scheduled",
    assigned: "Bar",
    mandatory: false,
    complete: "4 / 6",
  },
];

export const birthdayItems: TeamBirthdayItem[] = [
  { n: "Liam O'Connor", d: "19 May", img: 13 },
  { n: "Olivia Bennett", d: "21 May", img: 16 },
  { n: "Daniel Mitchell", d: "22 May", img: 12 },
];

export const staffEvents: TeamEventItem[] = [
  {
    t: "Team social after evening service",
    d: "Sat, 23 May · 18:30",
    w: "3 days",
    icon: Cake,
    tone: "info",
  },
  {
    t: "Wellbeing check-in before shift",
    d: "Sun, 24 May · 09:00",
    w: "4 days",
    icon: Trophy,
    tone: "warning",
  },
  {
    t: "Community event cover note",
    d: "Mon, 1 Jun · 08:00",
    w: "12 days",
    icon: ArrowRight,
    tone: "success",
  },
];

export const quickGroups: TeamGroup[] = [
  { label: "All Staff", members: "24 members" },
  { label: "Front of House", members: "12 members" },
  { label: "Kitchen", members: "9 members" },
  { label: "Housekeeping", members: "4 members" },
];

export const audienceOptions = [
  "All audiences",
  "All Staff",
  "Front of House",
  "Kitchen",
  "Housekeeping",
] as const;

export const TOTAL_STAFF = 24;
