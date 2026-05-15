import { createFileRoute } from "@tanstack/react-router";
import {
  LandingChecks,
  LandingFeatures,
  LandingFinalCTA,
  LandingFooter,
  LandingHero,
  LandingHowItWorks,
  LandingLogoStrip,
  LandingMoments,
  LandingNavbar,
  LandingPricing,
} from "@/features/landing";

export const Route = createFileRoute("/landing")({
  head: () => ({
    meta: [
      { title: "DocklistAI - The rota, rebuilt." },
      {
        name: "description",
        content:
          "DocklistAI is the rota-first workspace for hospitality teams. Build the week, check the pressure, and publish a rota your team can trust.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-dvh bg-[#07171d] text-[#07171d]">
      <LandingNavbar />
      <main id="main-content" className="!p-0">
        <LandingHero />
        <LandingLogoStrip />
        <LandingHowItWorks />
        <LandingFeatures />
        <LandingChecks />
        <LandingMoments />
        <LandingPricing />
        <LandingFinalCTA />
      </main>
      <div>
        <LandingFooter />
      </div>
    </div>
  );
}
