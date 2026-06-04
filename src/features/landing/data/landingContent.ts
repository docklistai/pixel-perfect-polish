import landingBecauseHospitality from "@/assets/landing/landing-because-hospitality.jpg";
import landingHeroHospitality from "@/assets/landing/landing-hero-hospitality.jpg";
import landingMomentsHospitality from "@/assets/landing/landing-moments-hospitality.jpg";
import type { LandingNavLink, LandingPricingTier } from "../types";

export const landingImages = {
  hero: landingHeroHospitality,
  because: landingBecauseHospitality,
  moments: landingMomentsHospitality,
};

export const managerPreviewUrl =
  "https://claude.ai/design/p/019e039e-3365-74db-a43a-b362a5ef4e8e?file=Prototype.html";

export const navLinks: LandingNavLink[] = [
  { label: "Weekly rhythm", href: "#rhythm" },
  { label: "Workspace", href: "#product" },
  { label: "AI support", href: "#ai" },
  { label: "Pricing", href: "#pricing" },
];

export const pricingTiers: LandingPricingTier[] = [
  {
    id: "free",
    name: "Free",
    price: "£0",
    period: "/mo",
    staffCap: "Up to 5 staff",
    description: "",
    features: [
      "Basic rota-focused workspace",
      "Week planning & publishing",
      "Open shifts & basic checks",
    ],
    cta: "Start free",
    ctaHref: "/auth",
  },
  {
    id: "core",
    name: "Core",
    price: "£39",
    period: "/mo",
    staffCap: "Up to 25 staff",
    description: "",
    features: [
      "Everything in Free",
      "Pre-publish checks & coverage",
      "Leave, approved hours & staff records",
      "Handover notes & team updates",
    ],
    cta: "Choose Core",
    ctaHref: "/auth",
  },
  {
    id: "pro",
    name: "Pro",
    price: "£79",
    period: "/mo",
    staffCap: "Up to 50 staff",
    description: "",
    features: [
      "Everything in Core",
      "Advanced rota review & warnings",
      "Labour & coverage pressure insights",
      "AI manager support & drafting",
    ],
    cta: "Get Pro early access",
    ctaHref: "/auth",
    recommended: true,
    badge: "★ Recommended",
  },
];

export const pricingNotes = [
  "14-day full Pro trial",
  "Upgrade or fall back to Free",
  "No per-seat pricing",
] as const;
