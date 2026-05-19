import type { LucideIcon } from "lucide-react";

export interface LandingNavLink {
  label: string;
  href: string;
}

export interface LandingStep {
  title: string;
  body: string;
  icon: LucideIcon;
}

export interface LandingFeature {
  title: string;
  body: string;
  icon: LucideIcon;
}

export interface LandingMoment {
  title: string;
  tag: string;
  body: string;
  signal: string;
  detail: string;
}

export interface LandingFooterColumn {
  title: string;
  links: LandingNavLink[];
  comingSoon?: boolean;
}

export interface LandingPricingTier {
  id: string;
  name: string;
  price: string;
  period?: string;
  staffCap: string;
  description: string;
  features: string[];
  cta: string;
  ctaHref: string;
  recommended?: boolean;
  badge?: string;
}
