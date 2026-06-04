const aiExamples = [
  {
    title: "Spot gaps",
    body: "Highlights open shifts and thin coverage before they bite.",
  },
  {
    title: "Review leave impact",
    body: "Shows clashes and cover risks across the week at a glance.",
  },
  {
    title: "Check handover notes",
    body: "Keeps key notes visible so nothing important gets missed.",
  },
  {
    title: "Flag coverage pressure",
    body: "Shows when and where your service is most at risk.",
  },
] as const;

export function LandingAI() {
  return (
    <section
      id="ai"
      className="border-t py-12 text-[var(--landing-cream)] sm:py-14"
      style={{ background: "var(--landing-ink)", borderColor: "rgba(255,255,255,.08)" }}
    >
      <div className="mx-auto grid max-w-[1240px] gap-9 px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:px-10">
        <div>
          <span className="landing-section-eyebrow on-dark">Manager-led AI</span>
          <h2 className="landing-section-title on-dark max-w-[520px]">
            AI helps you check, not guess.
          </h2>
          <p className="max-w-[500px] text-pretty text-[16px] leading-[1.62] text-[var(--landing-cream-dim)]">
            It sits beside the rota, reviews the week, and drafts support notes. The manager still
            decides what changes and what gets published.
          </p>
        </div>

        <div
          className="grid overflow-hidden rounded-[16px] border sm:grid-cols-2"
          style={{ borderColor: "rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)" }}
        >
          {aiExamples.map((example, index) => (
            <article
              key={example.title}
              className={`p-5 sm:p-6 ${
                index % 2 === 0 ? "sm:border-r" : ""
              } ${index < 2 ? "border-b" : ""}`}
              style={{
                borderColor: "rgba(255,255,255,.08)",
                background: "linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.025))",
              }}
            >
              <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold text-[var(--landing-teal-400)]">
                <span className="size-1.5 rounded-full bg-[#d9a968]" />
                {example.title}
              </div>
              <p className="text-[14px] leading-[1.55] text-[var(--landing-cream-dim)]">
                {example.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
