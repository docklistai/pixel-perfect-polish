import { createFileRoute } from "@tanstack/react-router";
import {
  LandingAdminLayer,
  LandingBecause,
  LandingControlRoom,
  LandingFinalCTA,
  LandingFooter,
  LandingHero,
  LandingLogoStrip,
  LandingManagerAI,
  LandingMoments,
  LandingNavbar,
  LandingPricing,
  LandingProductProof,
  LandingThreeSteps,
  LandingTrustStrip,
  LandingWalkthrough,
} from "@/features/landing";

export const Route = createFileRoute("/landing")({
  head: () => ({
    meta: [
      { title: "DocklistAI - The rota, rebuilt." },
      {
        name: "description",
        content:
          "The scheduling workspace for hospitality teams — build rotas, catch coverage gaps, review leave and approved hours, and get practical manager support before you publish.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="landing-page min-h-dvh bg-[var(--landing-ink)] text-[var(--landing-ink)]">
      <LandingNavbar />
      <main id="main-content" className="!p-0">
        <LandingHero />
        <LandingTrustStrip />
        <LandingLogoStrip />
        <LandingThreeSteps />
        <LandingControlRoom />
        <LandingProductProof />
        <LandingWalkthrough />
        <LandingBecause />
        <LandingAdminLayer />
        <LandingManagerAI />
        <LandingMoments />
        <LandingPricing />
        <LandingFinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
