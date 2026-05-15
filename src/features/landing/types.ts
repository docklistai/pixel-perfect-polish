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
  quote: string;
  who: string;
  image: string;
}

export interface LandingFooterColumn {
  title: string;
  links: LandingNavLink[];
  comingSoon?: boolean;
}
