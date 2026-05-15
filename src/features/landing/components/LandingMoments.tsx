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
              className="group overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-[#0d242c] to-[#0a1c22] shadow-[0_24px_50px_-25px_rgba(0,0,0,0.7)] transition duration-300 hover:-translate-y-1 hover:border-[#56b8a3]/25 hover:shadow-[0_30px_60px_-25px_rgba(86,184,163,0.18)]"
            >
              <div className="relative aspect-[5/4] overflow-hidden">
                <img
                  src={moment.image}
                  alt=""
                  className="size-full object-cover transition duration-500 group-hover:scale-[1.03]"
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
