import { moments } from "../data/landingContent";

export function LandingMoments() {
  return (
    <section className="bg-[#07171d] py-20 text-[#f5efe2] sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-[#56b8a3]">Real rota moments</p>
            <h2 className="mt-4 text-balance font-serif text-4xl leading-tight sm:text-5xl">
              Because every week brings something.
            </h2>
          </div>
          <p className="max-w-md text-pretty text-base leading-7 text-[#b8c4c5]">
            Because the rota is never just a rota. It is cover, leave, hours, handovers, and the day
            your team is walking into.
          </p>
        </div>

        {/* PLACEHOLDER TESTIMONIAL, replace before public launch */}
        <div className="mt-12 grid auto-rows-fr gap-4 md:grid-cols-2 xl:grid-cols-4">
          {moments.map((moment) => (
            <article
              key={moment.title}
              className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#0d242c] to-[#0a1c22] shadow-[0_24px_50px_-25px_rgba(0,0,0,0.7)] transition duration-300 hover:-translate-y-1 hover:border-[#56b8a3]/25 hover:shadow-[0_30px_60px_-25px_rgba(86,184,163,0.18)]"
            >
              <div className="relative aspect-[5/4] overflow-hidden">
                <img
                  src={moment.image}
                  alt=""
                  className="size-full object-cover brightness-[0.55] saturate-[0.85] transition duration-500 group-hover:scale-[1.04] group-hover:brightness-[0.6]"
                  loading="lazy"
                  decoding="async"
                />
                {/* atmospheric overlay — photo becomes scenery, not subject */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-[#07171d] via-[#07171d]/65 to-[#07171d]/15"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 ring-1 ring-inset ring-white/[0.04]"
                />
                <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-[#56b8a3]/25 bg-[#07171d]/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#56b8a3] backdrop-blur">
                  <span className="size-1.5 rounded-full bg-[#56b8a3]" aria-hidden="true" />
                  {moment.tag}
                </span>
                <h3 className="absolute inset-x-4 bottom-4 font-serif text-2xl leading-tight text-[#f5efe2]">
                  {moment.title}
                </h3>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="text-sm leading-6 text-[#b8c4c5]">{moment.body}</p>
                <figure className="mt-auto border-t border-white/[0.07] pt-4">
                  <blockquote className="font-serif text-[15px] italic leading-6 text-[#f5efe2]/95">
                    &ldquo;{moment.quote}&rdquo;
                  </blockquote>
                  <figcaption className="mt-2 text-[11px] uppercase tracking-[0.12em] text-[#9fb2b4]/85">
                    {moment.who}
                  </figcaption>
                </figure>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
