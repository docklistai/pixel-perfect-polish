import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  HeroSection,
  LandingAnchorNav,
  ProblemSection,
  PlatformOverview,
  ProductPrincipleSection,
  FinalCTA,
  LandingFooter,
} from "@/features/landing";

export const Route = createFileRoute("/landing")({
  head: () => ({
    meta: [
      { title: "Docklist — Staff Scheduling for Hospitality" },
      {
        name: "description",
        content:
          "Docklist keeps shift planning fast and clear. Draft, check, and publish your rota in minutes.",
      },
    ],
  }),
  component: LandingPage,
});

const anchorItems = [
  { label: "Problem", href: "#problem" },
  { label: "Platform", href: "#platform" },
  { label: "Principle", href: "#principle" },
];

function LandingPage() {
  const navigate = useNavigate();

  const goToAuth = () => navigate({ to: "/auth" });

  return (
    <div className="relative flex flex-col overflow-hidden">
      <HeroSection
        onCreateAccount={goToAuth}
        onTryFree={goToAuth}
        onSeeHowItWorks={() => {
          document.getElementById("problem")?.scrollIntoView({ behavior: "smooth" });
        }}
      />

      <div className="sticky top-20 z-20 -mt-10 hidden px-4 pb-4 md:block md:px-6">
        <LandingAnchorNav
          items={anchorItems}
          eyebrow="Explore"
          className="border-border/10 bg-background/80 shadow-[0_18px_60px_color-mix(in_oklch,var(--foreground)_6%,transparent)] supports-[backdrop-filter]:bg-background/60"
        />
      </div>

      <div id="problem">
        <ProblemSection />
      </div>
      <div id="platform">
        <PlatformOverview />
      </div>
      <div id="principle">
        <ProductPrincipleSection />
      </div>
      <FinalCTA onTryFree={goToAuth} />
      <LandingFooter />
    </div>
  );
}
