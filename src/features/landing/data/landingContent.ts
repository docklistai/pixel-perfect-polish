import {
  BarChart3,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  Clock3,
  MessageSquare,
  Send,
  ShieldCheck,
  Users,
  Utensils,
} from "lucide-react";
import heroHospitalityService from "@/assets/landing/hero-hospitality-service.jpg";
import rotaBuilderPreview from "@/assets/landing/rota-builder-real-preview.png";
import momentCoverShift from "@/assets/landing/moment-cover-shift.jpg";
import momentHandover from "@/assets/landing/moment-handover.jpg";
import momentLeaveClash from "@/assets/landing/moment-leave-clash.jpg";
import momentRotaChange from "@/assets/landing/moment-rota-change.jpg";
import type {
  LandingFeature,
  LandingFooterColumn,
  LandingMoment,
  LandingNavLink,
  LandingStep,
} from "../types";

export const landingImages = {
  hero: heroHospitalityService,
  rotaBuilder: rotaBuilderPreview,
};

// Image attribution/licensing should be reviewed before public launch.
export const navLinks: LandingNavLink[] = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
];

export const trustLogos = [
  "The Lockside",
  "Hideout Coffee",
  "Seaview Hotel",
  "Oak & Co",
  "The Glasshouse",
  "Porter & Rye",
];

export const howItWorks: LandingStep[] = [
  {
    title: "Build the week",
    body: "Create shifts, copy patterns, and shape the rota around availability and demand.",
    icon: CalendarDays,
  },
  {
    title: "Check the pressure",
    body: "Spot gaps, clashes, and busy days before the rota reaches the team.",
    icon: ShieldCheck,
  },
  {
    title: "Publish clearly",
    body: "Send one rota the team can trust, with changes kept visible and tidy.",
    icon: Send,
  },
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
];

export const checksBeforePublish = [
  {
    title: "Open shifts",
    body: "Spot unfilled shifts across the week before the rota goes out.",
  },
  {
    title: "Clashes",
    body: "Catch availability and leave conflicts while they are still easy to fix.",
  },
  {
    title: "Labour pressure",
    body: "See busy days, planned hours, and pressure points in one review.",
  },
  {
    title: "Recent changes",
    body: "Review what changed before publishing a version staff can trust.",
  },
];

export const moments: LandingMoment[] = [
  {
    title: "Someone calls in sick",
    tag: "Saturday night",
    body: "See the gap, adjust cover, and keep service moving.",
    quote: "We used to lose half an hour finding cover. Now the gap is obvious.",
    who: "Floor lead, The Lockside",
    image: momentCoverShift,
  },
  {
    title: "The rota changes",
    tag: "Mid-service",
    body: "Keep everyone working from the same published version.",
    quote: "Nobody argues over which screenshot is the real one anymore.",
    who: "Ops manager, Hideout Coffee",
    image: momentRotaChange,
  },
  {
    title: "Leave clashes",
    tag: "Two weeks ahead",
    body: "Catch pressure before it lands on your busiest day.",
    quote: "I can see the squeeze early enough to plan around it.",
    who: "GM, The Glasshouse",
    image: momentLeaveClash,
  },
  {
    title: "Clean handover",
    tag: "Sunday close",
    body: "Keep notes, updates, and actions in one place.",
    quote: "The opener walks in already knowing what closed late.",
    who: "Head of bar, Porter & Rye",
    image: momentHandover,
  },
];

export const pricingFeatures = [
  "Rota builder",
  "Availability & Leave",
  "Role-based access",
  "Published rota visibility",
  "Staff access codes",
  "Change history",
];

export const footerColumns: LandingFooterColumn[] = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "#how-it-works" },
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
    ],
  },
  {
    title: "Resources",
    comingSoon: true,
    links: [
      { label: "Guides", href: "#" },
      { label: "Help centre", href: "#" },
      { label: "Product updates", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Contact", href: "mailto:hello@docklist.ai" },
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
    ],
  },
];

export const reviewChecks = [
  { title: "Open shifts", status: "0 gaps", tone: "clear" },
  { title: "Clashes", status: "1 to review", tone: "review" },
  { title: "Labour pressure", status: "On track", tone: "clear" },
  { title: "Recent changes", status: "3 edits", tone: "note" },
];

export const finalCtaBullets = [
  "Built for hospitality teams",
  "Scheduling first",
  "No credit card required",
];
