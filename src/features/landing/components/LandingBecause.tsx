const adminItems = [
  "Staff records",
  "Leave and absence",
  "Approved hours",
  "Reminders and documents",
  "Team updates",
  "Handover",
] as const;

export function LandingBecause() {
  return (
    <section
      className="border-y py-[72px] sm:py-[88px]"
      style={{ background: "var(--landing-paper)", borderColor: "var(--landing-border)" }}
    >
      <div className="mx-auto grid max-w-[1240px] gap-10 px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:px-10">
        <div>
          <span className="landing-section-eyebrow">Around the rota</span>
          <h2 className="landing-section-title max-w-[520px]">
            The admin stays close to the week.
          </h2>
          <p className="max-w-[520px] text-pretty text-[16px] leading-[1.62] text-[var(--landing-ink-600)]">
            DocklistAI carries the lightweight workforce context managers need around the rota,
            without turning into a full HR suite.
          </p>
        </div>

        <div>
          <div
            className="grid border-t sm:grid-cols-2"
            style={{ borderColor: "var(--landing-border)" }}
          >
            {adminItems.map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 border-b px-1 py-4 text-[14px] font-semibold text-[var(--landing-ink-700)] sm:px-4"
                style={{ borderColor: "var(--landing-border)" }}
              >
                <span className="size-2 rounded-full bg-[#c9954d]" />
                {item}
              </div>
            ))}
          </div>

          <p
            className="mt-6 max-w-[620px] border-l-2 py-1 pl-4 text-[13.5px] leading-[1.58] text-[var(--landing-ink-600)]"
            style={{ borderColor: "#c9954d" }}
          >
            Approved hours are for review and export. Payroll integrations remain outside the
            product.
          </p>
        </div>
      </div>
    </section>
  );
}
