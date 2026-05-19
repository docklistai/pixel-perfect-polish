import { landingImages } from "../data/landingContent";

const moments = [
  {
    time: "06:47",
    day: "Mon",
    title: "Someone calls in sick before the kitchen has even opened.",
    body: "A name flashes on your phone before the coffee's on. You see who's nearby, who's under their hours, who's said yes before — and the gap closes before service.",
    tag: "Fast cover.",
    sub: "Without the group chat scramble.",
  },
  {
    time: "11:30",
    day: "Tue",
    title: "A published rota meets a real week.",
    body: "Things move. A swap, a no-show, a section change. The week shifts in one place — context, hours and visibility kept intact, for you and for them.",
    tag: "Calm updates.",
    sub: "Everyone stays in the loop.",
  },
  {
    time: "15:12",
    day: "Thu",
    title: "Approved leave lands on the worst possible Friday.",
    body: "The system sees the conflict the moment it appears — and shows the impact in coverage, hours and the rest of the week.",
    tag: "Leave that adds up.",
    sub: "No surprises on the floor.",
  },
  {
    time: "22:38",
    day: "Fri",
    title: "The handover is the difference between two services.",
    body: "Notes, context and the small things that don't fit on a sheet — carried into tomorrow. The next shift walks in already knowing.",
    tag: "Clear handovers.",
    sub: "For the shift walking in.",
  },
] as const;

export function LandingMoments() {
  return (
    <section className="relative overflow-hidden bg-[#08100e] py-24 text-[var(--landing-cream)] sm:py-36">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-70"
        style={{ backgroundImage: `url(${landingImages.moments})` }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,16,14,1)_0%,rgba(8,16,14,0.86)_40%,rgba(8,16,14,0.52)_70%,rgba(8,16,14,0.95)_100%)]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 max-w-3xl">
          <p className="landing-section-eyebrow text-[var(--landing-teal)]">Real rota moments</p>
          <h2 className="landing-section-title text-[var(--landing-cream)]">
            Life happens.
            <br />
            Your rota should <span className="italic text-[var(--landing-teal)]">keep up.</span>
          </h2>
          <p className="max-w-xl text-pretty text-[17px] leading-7 text-[var(--landing-cream)]/65">
            The hour-to-hour of running a hospitality team isn't a roadmap. It's a series of small,
            real moments — handled well, or handled badly.
          </p>
        </div>

        <div className="border-t border-white/10">
          {moments.map((moment) => (
            <article
              key={moment.time}
              className="grid gap-5 border-b border-white/10 py-8 md:grid-cols-[130px_1fr_1.1fr_220px] md:gap-12 md:py-11"
            >
              <div className="landing-mono text-[11px] uppercase tracking-[0.16em] text-[var(--landing-teal)]">
                — {moment.time}
                <span className="ml-3 font-serif text-2xl normal-case tracking-[-0.02em] text-[var(--landing-cream)] md:ml-0 md:mt-1 md:block md:text-4xl">
                  {moment.day}
                </span>
              </div>
              <h3 className="text-balance font-serif text-2xl font-light leading-tight tracking-[-0.02em] text-[var(--landing-cream)] md:text-[32px]">
                {moment.title}
              </h3>
              <p className="max-w-lg text-pretty text-[15.5px] leading-7 text-[var(--landing-cream)]/70">
                {moment.body}
              </p>
              <div className="landing-mono text-left text-[10px] uppercase tracking-[0.14em] text-[var(--landing-cream)]/42 md:text-right">
                <span className="mb-1 block font-serif text-[15px] normal-case tracking-normal text-[var(--landing-cream)]">
                  {moment.tag}
                </span>
                {moment.sub}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
