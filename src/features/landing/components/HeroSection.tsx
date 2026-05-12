import { ChevronDown, Play, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import heroBg from "@/assets/hero-cafe-minimal.jpg";

interface HeroSectionProps {
  onCreateAccount: () => void;
  onTryFree: () => void;
  onSeeHowItWorks?: () => void;
}

const capabilities = [
  { label: "Draft to publish", detail: "Weekly rota built in minutes" },
  { label: "Team-connected", detail: "Availability, swaps, approvals" },
  { label: "Pre-publish checks", detail: "Coverage & compliance verified" },
];

export function HeroSection({ onCreateAccount, onTryFree, onSeeHowItWorks }: HeroSectionProps) {
  return (
    <section className="relative flex min-h-dvh items-center justify-center overflow-hidden">
      {/* Background photo */}
      <img
        src={heroBg}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
        fetchPriority="high"
      />
      {/* Light wash overlay — keeps text readable, lets mood show through */}
      <div className="pointer-events-none absolute inset-0 bg-background/60" aria-hidden="true" />
      {/* Subtle brand tint at bottom */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background to-transparent"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-20 md:py-28">
        <div className="text-center">
          {/* Badge */}
          <p
            className={cn(
              "mb-8 inline-flex items-center rounded-full border border-brand/20 bg-brand-soft px-5 py-2",
              "text-[11px] font-semibold uppercase tracking-[0.25em] text-brand",
              "animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both",
            )}
          >
            Scheduling workspace for hospitality teams
          </p>

          {/* H1 */}
          <h1
            className={cn(
              "mb-8 text-[2.75rem] font-extralight leading-[1.02] tracking-tight text-foreground",
              "md:text-[4rem] lg:text-[5.5rem] xl:text-[6.5rem]",
              "text-balance",
              "animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both [animation-delay:120ms]",
            )}
          >
            The rota, <span className="font-medium text-brand">rebuilt.</span>
          </h1>

          {/* Subtext */}
          <p
            className={cn(
              "mx-auto mb-14 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl lg:text-[1.4rem]",
              "text-pretty",
              "animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both [animation-delay:250ms]",
            )}
          >
            For busy managers. One operating surface for schedules, staff decisions, and the week
            ahead.
          </p>

          {/* CTAs */}
          <div
            className={cn(
              "mb-12 flex flex-col items-center justify-center gap-4 sm:flex-row",
              "animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both [animation-delay:400ms]",
            )}
          >
            <Button
              size="lg"
              className="px-10 text-base font-medium bg-brand text-brand-foreground hover:bg-brand/90 transition-colors duration-200"
              onClick={onTryFree}
            >
              <Play className="h-5 w-5 mr-2" aria-hidden="true" />
              Get started free
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="px-8 text-base font-medium transition-colors duration-200 hover:border-brand/30"
              onClick={onCreateAccount}
            >
              <ArrowRight className="h-5 w-5 mr-2" aria-hidden="true" />
              Create your account
            </Button>
          </div>

          {/* Capability strip */}
          <div
            className={cn(
              "mx-auto mb-10 grid max-w-3xl gap-px overflow-hidden rounded-2xl border border-border/20 bg-border/10 sm:grid-cols-3",
              "animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both [animation-delay:550ms]",
            )}
          >
            {capabilities.map((item) => (
              <div key={item.label} className="bg-card/40 px-6 py-5 text-center backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
                  {item.label}
                </p>
                <p className="mt-1.5 text-sm text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </div>

          {/* Social proof */}
          <p
            className={cn(
              "mb-6 text-[13px] text-muted-foreground/50",
              "animate-in fade-in duration-700 fill-mode-both [animation-delay:700ms]",
            )}
          >
            Free to try · No credit card required
          </p>

          {/* Secondary link */}
          <button
            type="button"
            className={cn(
              "text-base text-muted-foreground underline decoration-muted-foreground/30",
              "transition-all duration-300 hover:text-foreground hover:decoration-brand",
              "animate-in fade-in duration-700 fill-mode-both [animation-delay:800ms]",
            )}
            onClick={onSeeHowItWorks}
          >
            See how it works
          </button>
        </div>

        {/* Scroll indicator */}
        <div
          className={cn(
            "mt-16 flex flex-col items-center space-y-2 opacity-40",
            "animate-in fade-in duration-700 fill-mode-both [animation-delay:1000ms]",
          )}
        >
          <span className="text-xs text-muted-foreground">Explore</span>
          <ChevronDown
            className="h-5 w-5 text-muted-foreground motion-safe:animate-bounce"
            aria-hidden="true"
          />
        </div>
      </div>
    </section>
  );
}
