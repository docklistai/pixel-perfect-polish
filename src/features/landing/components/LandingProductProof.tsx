import { LandingProductProofRota } from "./LandingProductProofRota";
import { LandingProductProofRotaMobile } from "./LandingProductProofRotaMobile";
import { LandingProductProofSidebar } from "./LandingProductProofSidebar";
import { managerPreviewUrl } from "../data/landingContent";

const proofAnnotations = [
  {
    label: "Open shifts",
    value: "2",
    body: "Lunch and Friday service need cover.",
    tone: "warn",
  },
  {
    label: "Leave clash",
    value: "1",
    body: "Approved leave overlaps a bar shift.",
    tone: "warn",
  },
  {
    label: "Publish",
    value: "Private draft",
    body: "Staff see the rota only after manager confirmation.",
    tone: "safe",
  },
] as const;

export function LandingProductProof() {
  return (
    <section
      id="product"
      className="relative scroll-mt-24 overflow-hidden py-12 text-[var(--landing-cream)] sm:py-16 lg:py-18"
      style={{ background: "var(--landing-ink)" }}
      aria-labelledby="reveal-title"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(54% 44% at 50% 0%,rgba(14,165,162,.13),transparent 70%), radial-gradient(42% 42% at 86% 82%,rgba(201,149,77,.1),transparent 72%)",
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,.05) 1px,transparent 1.4px)",
          backgroundSize: "28px 28px",
          WebkitMaskImage: "radial-gradient(74% 70% at 50% 42%,#000,transparent 78%)",
          maskImage: "radial-gradient(74% 70% at 50% 42%,#000,transparent 78%)",
        }}
      />

      <div className="relative mx-auto max-w-[1240px] px-6 lg:px-10">
        <div className="mb-7 grid gap-5 lg:grid-cols-[.48fr_.52fr] lg:items-end">
          <div>
            <span className="landing-section-eyebrow on-dark">The Manager Workspace</span>
            <h2 id="reveal-title" className="landing-section-title on-dark">
              Your week,
              <br />
              in one <span className="landing-it on-dark">place.</span>
            </h2>
          </div>
          <p className="max-w-[500px] text-pretty text-[15px] leading-[1.55] text-[var(--landing-cream-dim)] sm:text-[16px]">
            Not a dashboard dump: a calm view of the things that decide your week. The draft rota,
            what's left before publishing, where the pressure sits, and what's worth a second look.
          </p>
        </div>

        <div
          className="landing-reveal relative overflow-hidden rounded-[18px] border border-white/10"
          style={{
            background: "rgba(17, 23, 20, 0.45)",
            backdropFilter: "blur(10px)",
            boxShadow: "0 50px 100px -30px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          <div
            className="flex items-center gap-3 border-b px-4 py-3 sm:px-5"
            style={{ borderColor: "rgba(255,255,255,0.08)" }}
          >
            <div className="flex gap-1.5">
              <span className="size-3 rounded-full bg-white/10" />
              <span className="size-3 rounded-full bg-white/10" />
              <span className="size-3 rounded-full bg-white/10" />
            </div>
            <span className="landing-mono ml-2 text-[10px] text-white/40 sm:ml-4 sm:text-[11px]">
              docklist-workspace / Week 21 / Friday Night Service
            </span>
            <span className="landing-mono ml-auto hidden rounded-full border border-white/10 px-2.5 py-1 text-[9.5px] uppercase text-white/45 sm:inline-flex">
              draft
            </span>
          </div>

          <div className="grid gap-3 p-3 sm:p-4 lg:grid-cols-[.34fr_1.42fr_.48fr] lg:items-start">
            <aside className="rounded-xl border border-white/10 p-4 text-[var(--landing-cream)] lg:p-5">
              <p className="landing-mono text-[10.5px] uppercase text-[#d9ad70]">
                Scheduling-first workspace
              </p>
              <h3 className="mt-3 text-balance break-words text-[22px] font-extrabold leading-[1.04] sm:text-[25px]">
                This is where the week becomes publishable.
              </h3>
              <p className="mt-3 text-pretty text-[13px] leading-[1.55] text-[var(--landing-cream-dim)]">
                Build the draft, check coverage, resolve open shifts, and confirm the version your
                team should see.
              </p>
              <ul className="mt-4 grid gap-2 text-[12px] text-white/72 sm:grid-cols-2 lg:grid-cols-1">
                {[
                  "Draft changes stay private",
                  "Leave clashes and notes stay in context",
                  "Open shifts remain visible until resolved",
                  "Manager confirms before publishing",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border border-[#c9954d]/40 text-[#d9ad70]">
                      <svg
                        className="size-3"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <path d="M3.5 8.2 6.7 11.4 12.7 4.8" />
                      </svg>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href={managerPreviewUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-2 text-[13px] font-bold text-[var(--landing-teal-400)] transition hover:text-[var(--landing-cream)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--landing-teal-400)]"
              >
                Preview manager app
                <svg
                  className="size-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </a>
            </aside>
            <div className="relative flex flex-col gap-3">
              <LandingProductProofRota />
              <LandingProductProofRotaMobile />
              <div className="product-annotations pointer-events-none grid gap-2 sm:mt-0 sm:grid-cols-3">
                {proofAnnotations.map((annotation) => (
                  <div
                    key={annotation.label}
                    className="rounded-xl border p-3 shadow-2xl"
                    style={{
                      background:
                        annotation.tone === "safe" ? "rgba(14,48,43,.92)" : "rgba(35,27,17,.94)",
                      borderColor:
                        annotation.tone === "safe"
                          ? "rgba(43,184,181,.32)"
                          : "rgba(201,149,77,.36)",
                    }}
                  >
                    <p className="landing-mono text-[10px] uppercase text-white/50 sm:text-[9.5px] sm:text-white/45">
                      {annotation.label}
                    </p>
                    <div className="mt-1 flex items-baseline justify-between gap-3 sm:block sm:mt-1">
                      <p
                        className="text-[18px] font-extrabold sm:text-[16px]"
                        style={{
                          color: annotation.tone === "safe" ? "var(--landing-teal-400)" : "#d9ad70",
                        }}
                      >
                        {annotation.value}
                      </p>
                      <p className="text-right text-[12.5px] leading-[1.4] text-white/70 sm:mt-1.5 sm:text-left sm:text-[12px] sm:leading-[1.45] sm:text-white/66">
                        {annotation.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <LandingProductProofSidebar />
          </div>
        </div>

        <p
          className="landing-mono mt-7 flex flex-wrap items-center gap-[11px] text-[10px] uppercase sm:text-[11px]"
          style={{ color: "rgba(234,240,247,.4)" }}
        >
          <span className="h-px w-6 bg-[var(--landing-teal-400)] opacity-60" />A working view of the
          week — manager confirms every change before it reaches the floor
        </p>
      </div>
    </section>
  );
}
