export function ProductPrincipleSection() {
  return (
    <section className="relative overflow-hidden py-28 md:py-36 lg:py-44">
      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <p className="mb-6 text-xs font-semibold uppercase tracking-[0.3em] text-brand">
          Why we built this
        </p>
        <h2 className="mb-8 text-balance text-[2.25rem] font-extralight leading-[1.08] tracking-tight text-foreground md:text-[3rem] lg:text-[3.75rem]">
          Built from real{" "}
          <span className="font-semibold text-brand">hospitality rota problems</span>
        </h2>
        <p className="mx-auto mb-14 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
          Docklist is shaped around the weekly reality of caf&eacute;s, pubs, restaurants, hotels,
          and small hospitality teams where one rota change can affect the whole day.
        </p>

        <blockquote className="relative mx-auto max-w-2xl overflow-hidden rounded-2xl border border-border/40 bg-card/30 px-10 py-9 text-left">
          <div
            className="pointer-events-none absolute left-0 top-0 h-full w-1 rounded-l-2xl bg-brand/30"
            aria-hidden="true"
          />
          <p className="text-[1rem] font-light leading-[1.8] text-foreground/80 md:text-[1.0625rem]">
            The goal is simple: less rota chaos, clearer weeks, and fewer surprises for managers
            and staff.
          </p>
          <footer className="mt-5">
            <span className="inline-flex items-center rounded-full border border-border/50 bg-background/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Product principle
            </span>
          </footer>
        </blockquote>
      </div>
    </section>
  );
}
