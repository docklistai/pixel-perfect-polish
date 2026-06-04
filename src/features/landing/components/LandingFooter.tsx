import { managerPreviewUrl } from "../data/landingContent";

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
      { label: "About", href: "#" },
      { label: "Contact", href: "#" },
      { label: "Made in Scotland", href: "#" },
    ],
  },
  {
    title: "Get started",
    links: [
      { label: "Early access", href: "#pricing" },
      { label: "Preview the manager app", href: managerPreviewUrl, external: true },
    ],
  },
] as const;

export function LandingFooter() {
  return (
    <footer
      className="pb-12 text-[var(--landing-cream)]"
      style={{ background: "var(--landing-ink)" }}
    >
      <div className="mx-auto max-w-[1240px] px-6 lg:px-10">
        <div
          className="grid gap-8 border-t pt-[34px] lg:grid-cols-[1.6fr_1fr_1fr_1fr]"
          style={{ borderColor: "rgba(255,255,255,.06)" }}
        >
          {/* Brand col */}
          <div>
            <a
              href="#top"
              className="mb-[14px] flex w-fit items-center gap-2.5 font-bold tracking-[-0.01em] text-[18px] text-[var(--landing-cream)]"
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
                className="landing-mono mb-3 text-[10.5px] uppercase tracking-[0.16em] font-medium"
                style={{ color: "rgba(234,240,247,.5)" }}
              >
                {group.title}
              </h2>
              <ul className="flex flex-col gap-2">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target={"external" in link && link.external ? "_blank" : undefined}
                      rel={"external" in link && link.external ? "noreferrer" : undefined}
                      className="text-[13.5px] text-[var(--landing-cream-dim)] transition-colors hover:text-[var(--landing-cream)]"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="landing-mono mt-11 flex flex-wrap items-center justify-between gap-3 border-t pt-[22px] text-[10.5px] uppercase tracking-[0.1em]"
          style={{ borderColor: "rgba(255,255,255,.06)", color: "rgba(234,240,247,.34)" }}
        >
          <span>© 2026 DocklistAI · Hospitality scheduling workspace</span>
          <span>Made in Scotland</span>
        </div>
      </div>
    </footer>
  );
}
