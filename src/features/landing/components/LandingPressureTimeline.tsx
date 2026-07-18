import { useState } from "react";

const pressureMoments = [
  {
    time: "06:47",
    status: "Heads up",
    title: "Sick call before prep",
    body: "A gap opens before prep. Cover options are visible before the room wakes up.",
    tone: "watch",
  },
  {
    time: "15:12",
    status: "Risk",
    title: "Leave clash on Friday",
    body: "Approved time off meets a busy service while the rota is still private.",
    tone: "risk",
  },
  {
    time: "17:30",
    status: "Needs decision",
    title: "Open shift on the pass",
    body: "The rota shows what is unfilled, where coverage dips, and what needs a decision.",
    suggestedMove: "Ask Alex to extend, or pull from floor support.",
    action: "Review options",
    tone: "active",
  },
  {
    time: "22:38",
    status: "Watch",
    title: "Handover pressure",
    body: "The note, the change, and the next shift stay close to the week.",
    tone: "watch",
  },
  {
    time: "Publish",
    status: "Ready",
    title: "Manager control",
    body: "Manager support can surface recorded items, but the manager decides what to change.",
    tone: "ready",
  },
] as const;

const defaultActiveIndex = 2;

export function LandingPressureTimeline() {
  const [activeIndex, setActiveIndex] = useState(defaultActiveIndex);
  const progress = ((activeIndex + 1) / pressureMoments.length) * 100;

  return (
    <div
      className="rounded-[18px] border p-4 sm:p-5 lg:p-6"
      style={{
        background: "linear-gradient(180deg,#fffaf1,#ffffff)",
        borderColor: "var(--landing-border)",
        boxShadow: "0 24px 60px -38px rgba(17,23,20,.58)",
      }}
    >
      <div className="mb-4 flex items-center justify-between gap-4 border-b border-[var(--landing-border-faint)] pb-4">
        <div>
          <span className="landing-mono text-[10px] uppercase text-[var(--landing-ink-400)]">
            Pressure timeline
          </span>
          <p className="mt-1 text-[14px] font-bold text-[var(--landing-ink-900)]">
            Work through the week
          </p>
        </div>
        <div className="w-[112px] shrink-0">
          <div className="landing-mono mb-2 flex justify-between text-[9px] uppercase text-[var(--landing-ink-400)]">
            <span>Draft</span>
            <span>Publish</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--landing-border-faint)]">
            <div
              className="h-full rounded-full bg-[#c9954d] transition-[width] duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="relative grid gap-2.5">
        <div
          aria-hidden="true"
          className="absolute bottom-7 left-[19px] top-7 hidden w-px overflow-hidden rounded-full bg-[var(--landing-border-faint)] sm:block"
        >
          <div
            className="w-full rounded-full bg-[#c9954d] transition-[height] duration-200"
            style={{ height: `${progress}%` }}
          />
        </div>
        {pressureMoments.map((moment, index) => {
          const isActive = index === activeIndex;
          const isReady = moment.tone === "ready";
          return (
            <button
              key={moment.title}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              onMouseEnter={() => setActiveIndex(index)}
              className={`group relative w-full rounded-[15px] border p-3.5 text-left transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--landing-teal)] ${
                isActive ? "sm:p-4" : ""
              }`}
              style={{
                background: isActive
                  ? isReady
                    ? "linear-gradient(135deg,#ecfaf9,#ffffff)"
                    : "linear-gradient(135deg,#fff7e9,#ffffff)"
                  : "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(255,255,255,0.72))",
                borderColor: isActive
                  ? isReady
                    ? "rgba(14,165,162,.42)"
                    : "rgba(201,149,77,.5)"
                  : "var(--landing-border-faint)",
                boxShadow: isActive
                  ? isReady
                    ? "0 1px 0 rgba(255,255,255,0.9) inset, 0 22px 44px -24px rgba(14,165,162,0.3)"
                    : "0 1px 0 rgba(255,255,255,0.9) inset, 0 22px 44px -24px rgba(201,149,77,0.32)"
                  : "0 1px 0 rgba(255,255,255,0.85) inset, 0 4px 12px -10px rgba(17,23,20,0.08)",
              }}
            >
              <span className="relative z-[1] flex gap-3">
                <span
                  className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border landing-mono text-[10px] font-bold ${
                    isActive ? "scale-105" : ""
                  }`}
                  style={{
                    background: isActive
                      ? isReady
                        ? "var(--landing-teal-50)"
                        : "var(--landing-amber-50)"
                      : "#fff",
                    borderColor: isActive
                      ? isReady
                        ? "var(--landing-teal-100)"
                        : "var(--landing-amber-100)"
                      : "var(--landing-border-faint)",
                    color: isReady ? "var(--landing-teal-deep)" : "var(--landing-amber-700)",
                  }}
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="landing-mono text-[10px] font-semibold uppercase text-[var(--landing-ink-400)]">
                      {moment.time}
                    </span>
                    <span
                      className="landing-mono rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
                      style={{
                        background: isReady ? "var(--landing-teal-50)" : "var(--landing-amber-50)",
                        color: isReady ? "var(--landing-teal-deep)" : "var(--landing-amber-700)",
                      }}
                    >
                      {moment.status}
                    </span>
                  </span>
                  <span className="mt-1.5 block text-[15px] font-extrabold text-[var(--landing-ink)]">
                    {moment.title}
                  </span>
                  {isActive && (
                    <span className="mt-2 block text-[13px] leading-[1.5] text-[var(--landing-ink-600)]">
                      {moment.body}
                    </span>
                  )}
                  {isActive && "suggestedMove" in moment && (
                    <span className="mt-3 flex flex-wrap items-center gap-2.5">
                      <span className="rounded-lg bg-[var(--landing-amber-50)] px-3 py-2 text-[12px] font-semibold text-[var(--landing-amber-700)]">
                        {moment.suggestedMove}
                      </span>
                      <span className="rounded-lg bg-[var(--landing-ink)] px-3 py-2 text-[12px] font-bold text-[var(--landing-cream)]">
                        {moment.action}
                      </span>
                    </span>
                  )}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl bg-[var(--landing-ink)] p-3.5 text-[12px] leading-[1.5] text-[var(--landing-cream-dim)]">
        Draft changes stay private until the manager publishes the rota. Staff only see the
        confirmed version.
      </div>
    </div>
  );
}
