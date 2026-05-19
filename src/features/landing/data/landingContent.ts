import {
  BarChart3,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  Clock3,
  MessageSquare,
  Send,
  Users,
  Utensils,
} from "lucide-react";
import landingBecauseHospitality from "@/assets/landing/landing-because-hospitality.jpg";
import landingHeroHospitality from "@/assets/landing/landing-hero-hospitality.jpg";
import landingMomentsHospitality from "@/assets/landing/landing-moments-hospitality.jpg";
import type { LandingFeature, LandingNavLink } from "../types";

export const landingImages = {
  hero: landingHeroHospitality,
  because: landingBecauseHospitality,
  moments: landingMomentsHospitality,
};

export const navLinks: LandingNavLink[] = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
];

export const features: LandingFeature[] = [
  {
    title: "Rota Builder",
    body: "Flexible planning, easy editing, and complete control for the weekly rota.",
    icon: CalendarDays,
  },
  {
    title: "Availability",
    body: "See who is free, who is not, and where the week needs cover.",
    icon: CalendarCheck,
  },
  {
    title: "Leave",
    body: "Requests, approvals, and visibility where the rota is planned.",
    icon: Utensils,
  },
  {
    title: "Staff",
    body: "Roles, skills, and access details kept practical for venue teams.",
    icon: Users,
  },
  {
    title: "Time",
    body: "Clock-in, breaks, and timesheets that line up with the published rota.",
    icon: Clock3,
  },
  {
    title: "Team Comms",
    body: "Updates and announcements next to the shifts they affect.",
    icon: MessageSquare,
  },
  {
    title: "Ops Log",
    body: "Incidents, handovers, and follow-ups kept with the working day.",
    icon: ClipboardList,
  },
  {
    title: "Reports",
    body: "Clear labour, hours, and weekly insight without overcomplication.",
    icon: BarChart3,
  },
  {
    title: "Publish",
    body: "Send one clear version and keep late changes visible.",
    icon: Send,
  },
];
