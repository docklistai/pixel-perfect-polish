import { trustLogos } from "../data/landingContent";

export function LandingLogoStrip() {
  return (
    <section className="border-y border-[#07171d]/10 bg-[#f5efe2] py-12 text-[#07171d]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-xs font-semibold uppercase text-[#667275]">
          Trusted by hospitality teams across the UK
        </p>

        {/* PLACEHOLDER LOGOS, replace before public launch */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {trustLogos.map((logo) => (
            <div
              key={logo}
              className="flex h-12 items-center justify-center rounded-lg border border-[#07171d]/8 bg-white/40 px-4 font-serif text-base text-[#07171d]/55 transition hover:border-[#07171d]/15 hover:text-[#07171d]/75"
            >
              {logo}
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-3 border-t border-[#07171d]/5 pt-8 text-[11px] font-semibold uppercase tracking-wider text-[#667275]/70">
          <span>Role-based access</span>
          <span>Published rota visibility</span>
          <span>Staff access codes</span>
          <span>Change history where it matters</span>
        </div>
      </div>
    </section>
  );
}
