import { createFileRoute } from "@tanstack/react-router";
import {
  LandingAI,
  LandingBecause,
  LandingFinalCTA,
  LandingFooter,
  LandingHero,
  LandingNavbar,
  LandingPricing,
  LandingProductProof,
  LandingWeeklyRhythm,
  LandingWeekBeforeService,
} from "@/features/landing";

export const Route = createFileRoute("/landing")({
  head: () => ({
    meta: [
      { title: "DocklistAI — The rota, rebuilt." },
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
    <div className="landing-page min-h-dvh text-[var(--landing-ink)]">
      <LandingNavbar />
      <main id="main-content" tabIndex={-1} className="!p-0 focus:outline-none">
        <LandingHero />
        <LandingWeeklyRhythm />
        <LandingProductProof />
        <LandingWeekBeforeService />
        <LandingBecause />
        <LandingAI />
        <LandingPricing />
        <LandingFinalCTA />
      </main>
      <div>
        <LandingFooter />
      </div>
    </div>
  );
}
