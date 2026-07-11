const footerGroups = [
  {
    title: "Product",
    links: [
      { label: "Weekly rhythm", href: "#rhythm" },
      { label: "The workspace", href: "#product" },
      { label: "AI support", href: "#ai" },
      { label: "Pricing", href: "#pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About" },
      { label: "Contact", href: "mailto:docklistai@gmail.com" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Made in Scotland" },
    ],
  },
  {
    title: "Get started",
    links: [{ label: "Early access", href: "#pricing" }],
  },
] as const;

export function LandingFooter() {
  return (
    <footer
      className="relative overflow-hidden pb-12 pt-16 text-[var(--landing-cream)]"
      style={{ background: "var(--landing-ink)" }}
    >
      {/* Top brass hairline + soft radial wash */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(201,149,77,.48), transparent)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgba(201,149,77,.08), transparent 70%), radial-gradient(50% 60% at 10% 100%, rgba(14,165,162,.07), transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-[1240px] px-6 lg:px-10">
        {/* Tagline cap */}
        <div className="mb-12 flex flex-col items-start justify-between gap-4 border-b border-[rgba(255,255,255,.06)] pb-10 sm:flex-row sm:items-end">
          <p className="max-w-[640px] text-balance text-[clamp(22px,2.4vw,30px)] font-extrabold leading-[1.15] text-[var(--landing-cream)]">
            A calmer rota week.{" "}
            <span className="landing-it text-[#d9ad70]">Built for the floor.</span>
          </p>
          <span
            className="landing-mono inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10.5px] uppercase tracking-[0.14em]"
            style={{
              borderColor: "rgba(201,149,77,.25)",
              background: "rgba(201,149,77,.06)",
              color: "#d9ad70",
            }}
          >
            <span
              className="size-1.5 rounded-full bg-[var(--landing-teal-400)] motion-safe:animate-pulse"
              aria-hidden="true"
            />
            Early access · 2026
          </span>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          {/* Brand col */}
          <div>
            <a
              href="#top"
              className="mb-[14px] flex w-fit items-center gap-2.5 text-[18px] font-bold tracking-[-0.01em] text-[var(--landing-cream)]"
              aria-label="DocklistAI home"
            >
              <span
                className="grid size-7 place-items-center rounded-[8px] text-[14px] font-extrabold"
                style={{
                  background: "linear-gradient(135deg,var(--landing-teal-400),var(--landing-teal))",
                  color: "#08222A",
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,.12)",
                }}
              >
                D
              </span>
              DocklistAI
            </a>
            <p className="max-w-[340px] text-[13.5px] leading-[1.55] text-[var(--landing-cream-dim)]">
              The scheduling workspace for hospitality teams — rota, light workforce admin, and
              manager-led AI support. Made in Scotland.
            </p>
          </div>

          {/* Link groups */}
          {footerGroups.map((group) => (
            <div key={group.title}>
              <h2
                className="landing-mono mb-3 text-[10.5px] font-medium uppercase tracking-[0.16em]"
                style={{ color: "rgba(234,240,247,.5)" }}
              >
                {group.title}
              </h2>
              <ul className="flex flex-col gap-2.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    {"href" in link ? (
                      <a
                        href={link.href}
                        target={"external" in link && link.external ? "_blank" : undefined}
                        rel={"external" in link && link.external ? "noreferrer" : undefined}
                        className="group inline-flex items-center gap-1.5 text-[13.5px] text-[var(--landing-cream-dim)] transition-colors hover:text-[var(--landing-cream)]"
                      >
                        <span
                          aria-hidden="true"
                          className="h-px w-0 bg-[#d9ad70] transition-all duration-200 group-hover:w-3"
                        />
                        {link.label}
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[13.5px] text-[var(--landing-cream-dim)]">
                        <span aria-hidden="true" className="h-px w-3 bg-[#d9ad70]/60" />
                        {link.label}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="landing-mono mt-12 flex flex-wrap items-center justify-between gap-3 border-t pt-6 text-[10.5px] uppercase tracking-[0.1em]"
          style={{ borderColor: "rgba(255,255,255,.06)", color: "rgba(234,240,247,.34)" }}
        >
          <span>© 2026 DocklistAI · Hospitality scheduling workspace</span>
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-[var(--landing-teal-400)]"
            />
            Made in Scotland
          </span>
        </div>
      </div>
    </footer>
  );
}
