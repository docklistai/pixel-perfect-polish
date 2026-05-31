import { createFileRoute } from "@tanstack/react-router";
import {
  LandingAdminLayer,
  LandingBecause,
  LandingChecks,
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
} from "@/features/landing";

export const Route = createFileRoute("/landing")({
  head: () => ({
    meta: [
      { title: "DocklistAI - The rota, rebuilt." },
      {
        name: "description",
        content:
          "DocklistAI is the rota-first workspace for hospitality teams. Build the week, check coverage, handle staff changes, and publish a rota your team can trust.",
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
        <LandingLogoStrip />
        <LandingThreeSteps />
        <LandingControlRoom />
        <LandingProductProof />
        <LandingChecks />
        <LandingAdminLayer />
        <LandingManagerAI />
        <LandingMoments />
        <LandingBecause />
        <LandingPricing />
        <LandingFinalCTA />
      </main>
      <div>
        <LandingFooter />
      </div>
    </div>
  );
}
