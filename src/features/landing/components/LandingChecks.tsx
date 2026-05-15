import { AlertTriangle, CheckCircle2, History, PoundSterling } from "lucide-react";
import { checksBeforePublish, reviewChecks } from "../data/landingContent";

const checkIcons = [CheckCircle2, AlertTriangle, PoundSterling, History];

export function LandingChecks() {
  return (
    <section className="bg-[#fbf7ee] py-20 text-[#07171d] sm:py-24">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8">
        <div>
          <p className="text-sm font-semibold text-[#2f8c7b]">Before you publish</p>
          <h2 className="mt-4 max-w-xl text-balance font-serif text-4xl leading-tight sm:text-5xl">
            Checks before the rota goes live.
          </h2>
          <p className="mt-5 max-w-xl text-pretty text-base leading-7 text-[#526064]">
            A practical review before the rota goes out. Not magic, just the obvious checks a good
            manager would run every week.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {checksBeforePublish.map((check, index) => {
              const Icon = checkIcons[index] ?? CheckCircle2;
              return (
                <article
                  key={check.title}
                  className="rounded-xl border border-[#07171d]/10 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#2f8c7b]/30 hover:shadow-md"
                >
                  <Icon className="size-5 text-[#2f8c7b]" aria-hidden="true" />
                  <h3 className="mt-3 font-semibold">{check.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#526064]">{check.body}</p>
                </article>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-[#07171d]/10 bg-white p-6 shadow-[0_30px_60px_-25px_rgba(7,23,29,0.25)] ring-1 ring-black/[0.03]">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#07171d]/10 pb-5">
            <div>
              <p className="text-sm font-semibold text-[#667275]">Review before publish</p>
              <h3 className="mt-1 font-serif text-3xl">Week 18 &middot; 4 checks</h3>
            </div>
            <span className="rounded-full bg-[#dff3ec] px-3 py-1 text-sm font-semibold text-[#2f8c7b]">
              3 clear &middot; 1 to review
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {reviewChecks.map((check) => (
              <div
                key={check.title}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border border-[#07171d]/10 bg-[#fbf7ee] p-3"
              >
                <span
                  className={`size-3 rounded-full ${
                    check.tone === "review"
                      ? "bg-[#c58a4a]"
                      : check.tone === "note"
                        ? "bg-[#4f8fa5]"
                        : "bg-[#2f8c7b]"
                  }`}
                  aria-hidden="true"
                />
                <span className="font-semibold">{check.title}</span>
                <span className="text-sm text-[#526064]">{check.status}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[#07171d]/10 pt-5">
            <p className="text-sm text-[#526064]">Last reviewed by manager &middot; 2 min ago</p>
            <span className="rounded-full bg-[#2f8c7b] px-5 py-2.5 text-sm font-semibold text-white">
              Publish rota
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
