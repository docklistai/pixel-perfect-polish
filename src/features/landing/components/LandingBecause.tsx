import { CalendarX2, Clock3, FileText, UsersRound } from "lucide-react";
import { landingImages } from "../data/landingContent";

const pillars = [
  { title: "Cover", body: "Right people, right shifts.", Icon: UsersRound },
  { title: "Leave", body: "Planned time off that actually works.", Icon: CalendarX2 },
  { title: "Hours", body: "Fair, legal and within targets.", Icon: Clock3 },
  { title: "Handovers", body: "Clear notes for a smooth shift.", Icon: FileText },
] as const;

export function LandingBecause() {
  return (
    <section className="bg-[var(--landing-cream)] py-24 text-[var(--landing-ink)] sm:py-36">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-20 lg:px-8">
        <div>
          <p className="landing-section-eyebrow">Because</p>
          <h2 className="landing-section-title">
            the rota is never
            <br />
            <span className="italic text-[var(--landing-teal-deep)]">just a rota.</span>
          </h2>
          <p className="max-w-lg text-pretty text-[17px] leading-7 text-[#3f4744]">
            It is cover, leave, hours, handovers, and the day your team is walking into. DocklistAI
            treats it that way — operationally, not as a spreadsheet.
          </p>

          <div className="mt-12 grid grid-cols-2 gap-6 border-t border-[#0c1412]/10 pt-7 sm:grid-cols-4">
            {pillars.map((pillar) => (
              <article key={pillar.title} className="flex flex-col gap-2">
                <span className="grid size-8 place-items-center rounded-md bg-[var(--landing-teal-deep)]/10 text-[var(--landing-teal-deep)]">
                  <pillar.Icon className="size-4" aria-hidden="true" />
                </span>
                <h3 className="font-serif text-lg font-medium tracking-[-0.01em]">
                  {pillar.title}
                </h3>
                <p className="text-[13.5px] leading-5 text-[#5c645f]">{pillar.body}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-[var(--landing-ink)] lg:aspect-[4/4.4]">
          <img
            src={landingImages.because}
            alt=""
            className="absolute inset-0 size-full object-cover"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--landing-ink)]/10 to-[var(--landing-ink)]/55" />
          <div className="absolute bottom-6 right-6 max-w-[280px] rounded-md border border-white/10 bg-[var(--landing-ink)]/85 p-5 text-[var(--landing-cream)] backdrop-blur-md">
            <p className="landing-mono mb-2 text-[9.5px] uppercase tracking-[0.2em] text-[var(--landing-teal)]">
              Origin
            </p>
            <p className="font-serif text-[17px] leading-snug">
              Made in Scotland.
              <br />
              Built from real hospitality rota problems.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
