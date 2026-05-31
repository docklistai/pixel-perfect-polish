
# Landing — align to PDF reference (with targeted upgrades)

Scope: `src/routes/landing.tsx`, `src/features/landing/**`, plus 1-2 new assets under `src/assets/landing/**`. No app code, no tokens in `src/styles.css` beyond landing-scoped vars, no backend, no copy rewrites outside the PDF's own copy.

## Diagnosis — what's drifted from the PDF

Side-by-side comparison of the current landing vs the PDF surfaced six gaps:

1. **Hero** — current treatment is close, but the bottom-row "key pillars" only show 4 short labels; PDF treats them as a deliberate horizontal pillar strip (4 evenly spaced items with bullets) framed by a hairline. Currently navbar shows a full nav; PDF hero has logo left + single "Get early access" pill right (no nav links).
2. **Three steps** — PDF actually has only steps 1 and 2 on page 3, then step 3 carries over to page 4 followed by a "control room" headline. The current site flattens it into 3 cards on one band, which is fine, but the typographic weight is much lighter than the PDF. PDF uses a giant ghost numeral behind each step.
3. **Product proof (rota mock)** — current proof is a CSS-rendered grid with abstract column tones. PDF shows a richer mock with named staff rows (Sophie C., Daniel M., Priya P., Liam O., Elena V.), shift labels ("08–16 Front of House"), an "ANNUAL LEAVE" cell, a "Clash · leave" cell, an OPEN cell, AND a "Things to check" AI panel beneath with an "Ask · Summarise leave impact" callout and Draft update / Not now buttons. This is the most underbuilt section vs the PDF.
4. **The admin layer (6 surfaces)** — currently missing entirely. PDF page 9 has a 2×3 grid card titled "The admin layer · LIGHT. CLOSE TO THE ROTA. MANAGER-LED." with 6 surfaces: Staff records, Leave & absence, Approved hours, Reminders, Team updates, Ops handover.
5. **Manager-led AI** — currently missing as its own section. PDF pages 10-12 have a dedicated "AI that helps managers check, not guess" band with the same Ask · Summarise leave impact card plus 4 capability tiles (Reviews rota issues, Suggests fixes, Drafts staff updates, Explains the pressure) and a "AI suggests, manager decides / Nothing publishes without you / Review before acting" footer strip.
6. **Pricing** — current is a 2-card "Core / See the workspace" layout. PDF is a 4-tier grid: Free £0 / Core £39 / Pro £79 (recommended) / Custom. Big departure from current.

Also drifted: Moments uses one stretched background photo. PDF treats it as 4 distinct timestamped vignettes on a darker, calmer cinematic band (closer to current Moments rebuild, OK). Footer in PDF is a 4-column layout (PRODUCT / COMPANY / GET STARTED), current is lighter — needs alignment.

## Opinion — where to deviate from the PDF (small, deliberate)

- **Keep current navbar with section links** behind a scrolled state, but match PDF hero behavior: until scroll, suppress nav links so the hero reads as cleanly as the PDF (logo left, single CTA right). Show nav after scroll.
- **Pricing**: adopt the 4-tier structure from the PDF but keep the "Pricing in beta" honesty note above it. PDF's "RECOMMENDED" floating pill that overlaps the card edge is good — keep it; but soften the recommendation outline so it doesn't dominate.
- **Rota mock**: PDF mock is visually richer than current ProductProof, but the named-staff mock risks being read as a screenshot, not a real product surface. Build it as a labeled "Manager view" frame with the same chrome the real app uses (workspace pill + week pill + status), so it reads as a real product surface — not a marketing illustration. Avoid macOS traffic lights; use the app's actual top bar language already documented in `.lovable/plan.md`.
- **Admin layer 2×3 grid (PDF page 9)**: PDF puts it on a light card with subtle dashed gridlines between cells. Keep that, but raise icon contrast vs the PDF (PDF icons read flat).
- **Manager-led AI**: build it, but resist a second hero-sized headline. Treat it as a quieter band sitting beside the rota mock, with the "Ask · Summarise leave impact" card as the visual hero of the section rather than the H2.

## Section-by-section plan

Final ordering (mirrors PDF flow):

```text
Navbar (logo + single CTA until scroll, then full nav)
1.  Hero                         LandingHero            (refine)
2.  Logo / venue-type strip      LandingLogoStrip       (keep)
3.  Weekly rhythm — 3 steps      LandingThreeSteps      (refine — bigger ghost numerals)
4.  Control room intro           NEW: LandingControlRoom (split off from current Because)
5.  Rota mock (product proof)    LandingProductProof    (rebuild — named staff + Things-to-check panel)
6.  Pre-publish checks           LandingChecks          (keep, minor polish)
7.  Admin layer 2×3              NEW: LandingAdminLayer (PDF page 9)
8.  Manager-led AI band          NEW: LandingManagerAI  (PDF pages 10-12)
9.  Real rota moments            LandingMoments         (keep current rebuild)
10. Because — origin / Scotland  LandingBecause         (collapse — move "Made in Scotland" into Moments footer hairline OR keep small, reduce photo size)
11. Pricing — 4 tiers            LandingPricing         (rebuild)
12. Final CTA                    LandingFinalCTA        (keep, deepen background)
13. Footer 4-col                 LandingFooter          (rebuild to PRODUCT/COMPANY/GET STARTED)
```

### LandingNavbar
- Hide center nav links until `scrolled === true` so hero matches PDF (logo left, single Get early access right). When scrolled, current behavior returns.
- Remove "Sign in" from the hero scroll-state to match PDF.

### LandingHero
- Keep current copy verbatim.
- Move the bottom pillar strip to PDF rhythm: 4 evenly spaced items on one row with bullet markers, separated by hairline above; current has "Made in Scotland" on a second wrapped line — keep the four on one row at lg+.
- Ensure single CTA pair (Get early access primary, Preview the manager app secondary) — already present.

### LandingThreeSteps
- Add a ghost numeral behind each step (01 / 02 / 03) at ~140px, 6% opacity teal, matching PDF.
- Tighten typographic scale to match PDF (titles ~ 32px serif, body ~ 15px / 24 line-height).

### NEW: LandingControlRoom
- A short pull-quote band: "A control room for the week ahead." with the supporting paragraph from PDF page 4.
- Single column, centered, dark band, no imagery — used as a breather before the rota mock.

### LandingProductProof (rebuild)
- Replace abstract column tones with a true rota grid using named staff rows from PDF (Sophie C., Daniel M., Priya P., Liam O., Elena V.), shift labels with time + role, ANNUAL LEAVE / DAY OFF / OPEN / Clash · leave cells.
- Top bar: status dot + "Rota · Week 21" + small "Draft · not shared" pill + 4 status chips ("2 conflicts", "3 open", "1 leave clash", "98% coverage") — matches PDF.
- Below the grid: "Things to check" AI panel with 3 bullets and the "Ask · Summarise leave impact" card with Draft update / Not now buttons. Decorative only, `aria-hidden` on interactive-looking elements.
- Stats strip at the bottom (24/27 shifts, 98% coverage, 1 leave clash, 802h/820h) — from PDF page 6.
- Mobile: collapse the AI panel under the grid; keep the grid horizontally scrollable.

### LandingChecks
- Keep 5-up grid; align eyebrow + headline weight with HowItWorks for cohesion. Minor only.

### NEW: LandingAdminLayer
- Light card (var(--landing-paper)) inside the dark band so it reads like a callout artifact.
- Header: small dark "The admin layer" pill, eyebrow "LIGHT. CLOSE TO THE ROTA. MANAGER-LED.", right side "6 surfaces · 1 workspace".
- 2×3 grid of 6 surfaces with icon tile + title + body + category tag (PEOPLE / TIME OFF / HOURS / CHECKS / COMMS / SERVICE).
- Footer line: "All six surfaces sit around the rota — none of them away from it." + "ONE WORKSPACE · NO PER-SEAT ANXIETY" right-aligned.

### NEW: LandingManagerAI
- Eyebrow "MANAGER-LED AI", H2 "AI that helps managers check, not guess.", supporting paragraph from PDF page 10.
- Below: Ask · Summarise leave impact card (reused visually from ProductProof's panel, but standalone here, larger).
- 4 capability tiles: Reviews rota issues / Suggests fixes / Drafts staff updates / Explains the pressure.
- Footer pill strip: "AI suggests, manager decides · Nothing publishes without you · Review before acting".
- Aligns with the project's "5% AI, manager-led" non-negotiable from the operating system doc.

### LandingMoments
- Keep current 4-row dark band. Tighten photo treatment per the existing `.lovable/plan.md` (darker overlay, calmer atmosphere). No new content.

### LandingBecause
- Shrink to a thin band: keep "Made in Scotland · Built from real hospitality rota problems" as a single editorial line with the small portrait image at ~40% width on lg+. Avoid duplicating the "rota is never just a rota" headline that PDF places earlier on page 8.

### LandingPricing (rebuild)
- 4-tier card grid: Free £0 / Core £39 / Pro £79 RECOMMENDED / Custom Let's talk.
- Keep "Pricing in beta · Early access pricing will be confirmed before launch" eyebrow above the grid (preserve current honesty signal).
- RECOMMENDED chip floats above the Pro card edge, teal.
- Bullet lists match PDF verbatim.
- Footer caption line: "Start on the 14-day full Pro trial — then upgrade, stay on Core, or fall back to Free. No per-seat billing, ever." + three small labeled blocks (WORKSPACE PRICING / MANAGER-LED / HOSPITALITY-NATIVE).

### LandingFinalCTA
- Keep copy. Add a teal hairline above, deepen radial gradient to match PDF page 17.

### LandingFooter
- Rebuild to 4 columns: brand blurb (left) + PRODUCT / COMPANY / GET STARTED.
- Bottom line: "© 2026 DOCKLISTAI · HOSPITALITY SCHEDULING WORKSPACE" left, "MADE IN SCOTLAND" right.

## Assets

- `src/assets/landing/landing-hero-hospitality.jpg` — already in place, keep.
- `src/assets/landing/landing-because-hospitality.jpg` — already in place, keep but use at reduced size.
- `src/assets/landing/landing-moments-hospitality.jpg` — keep.
- No new photographic assets needed. All new sections are typographic + iconographic.
- Lucide icons only (no custom SVG bespoke art).

## Out of scope

App routes outside `/landing`, auth, design tokens in `src/styles.css` (the existing `--landing-*` vars are sufficient), staff portal, rota app code, backend wiring, package install, animation library introduction. No Motion / GSAP added — CSS-only transitions and existing utility patterns.

## Guardrails

- Every component file stays under 350 lines (per `docs/ai/guardrails.md` and existing landing convention).
- No new globals added to `src/styles.css` unless a token is reused 3+ times across landing.
- Preserve placeholder comments: `// PLACEHOLDER LOGOS, replace before public launch`, `// PLACEHOLDER TESTIMONIAL, replace before public launch`.
- Preserve verbatim copy: "The rota, rebuilt.", "Made in Scotland…", "Because the rota is never just a rota…", DocklistAI Core, Pricing in beta, Early access pricing line — and now also the four PDF pricing tier names + their bullet lists.
- Staff-safe: nothing in the rota mock implies a staff portal capability or leaks manager-only data semantically (it's all draft-stage visuals).

## Verification (after implementation, in build mode)

1. `npx tsc --noEmit`
2. `npx eslint src/routes/landing.tsx src/features/landing`
3. Browser screenshots of `/landing` at 390, 768, 1440. Compare side-by-side with PDF pages 1, 3, 5, 9, 11, 16.
4. `wc -l src/features/landing/components/*.tsx` — all under 350 lines.
5. `git status --short` — only landing files + new asset additions.

## Recommended first implementation slice (when approved)

To keep risk low, ship in this order:
1. New sections in isolation: `LandingAdminLayer`, `LandingManagerAI`, `LandingControlRoom`.
2. Rebuild `LandingPricing` to 4 tiers.
3. Rebuild `LandingProductProof` to the PDF rota mock.
4. Polish pass: Hero pillar strip, ThreeSteps ghost numerals, Navbar scroll-state, Footer 4-col, FinalCTA gradient deepening.
5. Trim `LandingBecause`.

After each slice, screenshot at 1440 + 390 and diff against the PDF before moving on.
