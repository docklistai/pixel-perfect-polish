import landingBecauseHospitality from "@/assets/landing/landing-because-hospitality.jpg";
import landingHeroHospitality from "@/assets/landing/landing-hero-hospitality.jpg";
import landingMomentsHospitality from "@/assets/landing/landing-moments-hospitality.jpg";
import { BETA_ACCESS_MAILTO } from "@/config/commercial";
import type { LandingNavLink } from "../types";

export const landingImages = {
  hero: landingHeroHospitality,
  because: landingBecauseHospitality,
  moments: landingMomentsHospitality,
};

/**
 * Private beta: managers are onboarded manually. "Request beta access" CTAs
 * open an email to the DocklistAI team rather than a self-serve sign-up.
 */
export const betaAccessMailto = BETA_ACCESS_MAILTO;

export const navLinks: LandingNavLink[] = [
  { label: "Weekly rhythm", href: "#rhythm" },
  { label: "Workspace", href: "#product" },
  { label: "Manager support", href: "#ai" },
  { label: "Pricing", href: "#pricing" },
];

export const pricingNotes = [
  "Private beta · invitation only",
  "Billing inactive · no payment is taken",
  "Indicative post-beta workspace prices",
] as const;
