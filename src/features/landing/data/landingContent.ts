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
import momentRotaChange from "@/assets/landing/moment-rota-change.jpg";
import type {
  LandingFeature,
  LandingFooterColumn,
  LandingMoment,
  LandingNavLink,
  LandingPricingTier,
  LandingStep,
} from "../types";

export const landingImages = {
  hero: heroHospitalityService,
  rotaBuilder: rotaBuilderPreview,
  momentAtmosphere: momentRotaChange,
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
    title: "Sick call",
    tag: "Open shift",
    body: "See the gap, adjust cover, and keep service moving.",
    signal: "Cover needed",
    detail: "2 open shifts",
  },
  {
    title: "Rota changed after publish",
    tag: "Published rota",
    body: "Keep everyone working from the same published version.",
    signal: "Version check",
    detail: "3 edits logged",
  },
  {
    title: "Leave clash",
    tag: "Leave pressure",
    body: "Catch pressure before it lands on your busiest day.",
    signal: "Review before publish",
    detail: "1 clash",
  },
  {
    title: "Handover note",
    tag: "Sunday close",
    body: "Keep notes, updates, and actions in one place.",
    signal: "Ops note",
    detail: "Ready for opening",
  },
];

export const pricingTiers: LandingPricingTier[] = [
  {
    id: "free",
    name: "Free",
    price: "£0",
    staffCap: "Up to 5 staff",
    description: "For small teams getting started with rota planning.",
    features: ["Basic rota builder", "Basic staff list", "Basic print/export", "Trial fallback"],
    cta: "Get started free",
    ctaHref: "/auth",
  },
  {
    id: "core",
    name: "Core",
    price: "£39",
    period: "/month",
    staffCap: "Up to 25 staff",
    description: "Full rota operations for growing hospitality teams.",
    features: [
      "Full rota operations",
      "Build, edit, and publish rotas",
      "Staff portal",
      "Staff records",
      "Leave and availability",
      "Print/export",
      "Basic labour view",
      "Basic rota checks",
    ],
    cta: "Start 14-day trial",
    ctaHref: "/auth",
  },
  {
    id: "pro",
    name: "Pro",
    price: "£79",
    period: "/month",
    staffCap: "Up to 50 staff",
    description: "Smarter scheduling and advanced tools for busy managers.",
    badge: "Best for busy teams",
    recommended: true,
    features: [
      "Everything in Core",
      "Generate rota",
      "Advanced labour warnings",
      "Coverage and conflict warnings",
      "Rota quality score",
      "Stronger scheduling rules",
      "Priority support",
      "Docklist Operator (coming soon)",
    ],
    cta: "Start 14-day trial",
    ctaHref: "/auth",
  },
  {
    id: "custom",
    name: "Custom",
    price: "Contact us",
    staffCap: "50+ staff / multi-site",
    description: "For larger operations, multiple venues, or specialist setup.",
    features: [
      "Multi-site support",
      "White-glove setup",
      "Higher-volume support",
      "Custom integrations (coming soon)",
    ],
    cta: "Contact us",
    ctaHref: "mailto:hello@docklist.ai",
  },
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
