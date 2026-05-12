import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FinalCTAProps {
  onTryFree: () => void;
}

const supportBullets = [
  "No credit card required",
  "Built for hospitality teams",
  "Scheduling first, admin second",
];

export function FinalCTA({ onTryFree }: FinalCTAProps) {
  return (
    <section className="relative overflow-hidden py-36 md:py-48 lg:py-56">
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/[0.06] blur-[120px]"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <p className="mb-8 text-xs font-semibold uppercase tracking-[0.3em] text-brand">
          Start today
        </p>

        <h2 className="mb-8 text-balance text-[2.5rem] font-extralight leading-[1.06] tracking-tight text-foreground md:text-[3.5rem] lg:text-[4.5rem]">
          Ready for a calmer{" "}
          <span className="font-semibold text-brand">rota week?</span>
        </h2>

        <p className="mx-auto mb-14 max-w-lg text-pretty text-lg leading-relaxed text-muted-foreground">
          Start with scheduling, then bring staff, time, leave, and daily operations into one clear
          workspace.
        </p>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            size="lg"
            className="px-14 text-lg font-medium bg-brand text-brand-foreground hover:bg-brand/90 transition-colors duration-200"
            onClick={onTryFree}
          >
            Create your account
            <ArrowRight className="ml-3 h-5 w-5" aria-hidden="true" />
          </Button>
        </div>

        <ul className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {supportBullets.map((bullet) => (
            <li key={bullet} className="text-[13px] text-muted-foreground/60">
              {bullet}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
