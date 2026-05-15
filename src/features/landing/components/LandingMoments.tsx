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
        <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {moments.map((moment) => (
            <article
              key={moment.title}
              className="overflow-hidden rounded-lg border border-white/10 bg-[#0b2027] shadow-xl shadow-black/15"
            >
              <div className="relative aspect-[5/4] overflow-hidden">
                <img
                  src={moment.image}
                  alt=""
                  className="size-full object-cover"
                  loading="eager"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-[#07171d]/25" aria-hidden="true" />
                <span className="absolute left-3 top-3 rounded-full bg-[#07171d]/80 px-3 py-1 text-xs font-semibold text-[#56b8a3]">
                  {moment.tag}
                </span>
              </div>
              <div className="flex min-h-[18rem] flex-col p-5">
                <h3 className="font-serif text-2xl">{moment.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#b8c4c5]">{moment.body}</p>
                <figure className="mt-auto border-t border-white/10 pt-4">
                  <blockquote className="font-serif text-base italic leading-6 text-[#f5efe2]">
                    &ldquo;{moment.quote}&rdquo;
                  </blockquote>
                  <figcaption className="mt-2 text-xs text-[#9fb2b4]">{moment.who}</figcaption>
                </figure>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
