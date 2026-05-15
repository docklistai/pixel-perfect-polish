# Landing 10/10 visual polish — plan

Scope: `src/routes/landing.tsx`, `src/features/landing/**`, optional new visual treatment assets in `src/assets/landing/**`. No content rewrites, no new sections, no token/global CSS changes, no non-landing files.

## Discovery first (read-only)

1. Browse `/rota`, `/`, `/leave`, `/ops`, `/staff` via `browser--navigate_to_sandbox` + `browser--screenshot` to capture the real app's surface language (navy sidebar, teal actions, calm grey cards, status pills, publish bar). Use crops as ground truth for the landing's product-preview frame.
2. Screenshot the current `/landing` at 390 (current viewport) and 1440 to baseline mobile + desktop rhythm before any change.
3. Inspect the existing `rota-builder-real-preview.png` asset to decide whether it can be visually re-cropped via CSS framing or if a fresh capture from `/rota` (grid + right-rail summary, no avatars/names where possible) is needed. New screenshot saved as `src/assets/landing/rota-builder-preview-v2.png` if required.

## Priority 1 — Rota Builder screenshot treatment (`LandingFeatures.tsx`)

Rebuild `RotaBuilderPreview` so it stops reading as "pasted screenshot in a card":

- Replace the macOS-style traffic-light chrome with a quieter, app-native frame: thin top bar matching the real Topbar (status dot + small "w/c …" label + teal "Published" pill) instead of generic browser dots — connects to actual app language.
- Tighter crop on the rota grid + summary rail using `object-cover` + `object-[position]` to hide the noisy top-left of the screenshot and emphasise the grid.
- Lower brightness/contrast of the image (`brightness-[0.92] saturate-[0.95] contrast-[1.02]`) and lay a subtle navy multiply tint (`bg-[#07171d]/15` over image) so the image belongs to the section rather than glowing out of it.
- Add a refined frame: `rounded-2xl`, hairline `ring-1 ring-white/10`, inner highlight `shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]`, layered drop shadow.
- Depth behind the frame: a soft teal radial + a faint blueprint grid (CSS `background-image` with two repeating linears at very low opacity) instead of just a blur orb — reads as a product canvas.
- Mask the bottom edge with a true gradient mask (`mask-image: linear-gradient(...)`) so the screenshot fades into the section, not via a hard overlay div.
- Optional floating annotation chips ("Coverage 92%", "3 conflicts") absolutely positioned at the frame edges in the section's teal/navy tokens — implies the rota story without revealing demo data. Behind `aria-hidden`, decorative only.
- Tilt removed; keep dead straight, slightly offset right on `lg+` so primary copy gets more weight.

If the existing PNG is too bright/cluttered, swap to a freshly captured crop from `/rota` (grid + right summary cards) — saved as a new asset and referenced via `landingImages.rotaBuilder`. Existing asset kept on disk for safety.

## Priority 2 — Whole-landing cohesion

Per-section, light-touch only (no copy or structure changes):

- `LandingHero.tsx`: tighten vertical rhythm on mobile (390px), reduce H1 from `text-6xl` baseline to a hair smaller on `sm` so it stops crowding the safe area; add a subtle teal-to-transparent vignette behind the eyebrow chip; keep clean, screenshot-free.
- `LandingNavbar.tsx`: nudge backdrop blur and add a 1px teal hairline only when scrolled (CSS `[data-scrolled]`) — small but premium. Keep markup, only class tweaks.
- `LandingLogoStrip.tsx`: convert the placeholder serif text logos into uniform muted pills with consistent height so they read as a deliberate trust strip rather than raw text. Comment preserved.
- `LandingHowItWorks.tsx`, `LandingChecks.tsx`: align card paddings, harmonise eyebrow/number treatment with Features, add consistent hover lift token (`hover:-translate-y-0.5`).
- `LandingPricing.tsx`: refine "Beta" and "Early access" badges to match the new app-style pill used in the screenshot frame; balance shadow weight with Features card.
- `LandingFinalCTA.tsx`: deepen background gradient + add one teal hairline above to mirror Features section rhythm.
- `LandingFooter.tsx`: tighten column gap, align the "Made in Scotland" line as a footnote-weight detail.
- Section seams: standardise `py-20 sm:py-24` and add a `h-px` brand-tinted hairline between every dark→dark transition for cinematic banding; light section (`LandingLogoStrip`) keeps current contrast.

## Priority 3 — Connection to the real app

Borrow these app cues into landing surfaces (visual only):

- Status-pill language: "Published", "Draft · local only", "Coverage 92%" used only inside the screenshot frame and Features secondary cards as decorative chips.
- Card surface tone (`from-[#0d242c] to-[#0a1c22]`) already in use — keep, but unify the border opacity at `white/10` everywhere (currently mixed `white/10` and `white/12`).
- Teal accent reserved for actions, status, and eyebrows — audit and remove any incidental teal from decorative-only spots that dilute the action signal.

## Priority 4 — Moments section (`LandingMoments.tsx`)

The four photo cards currently feel stock-heavy. Polish:

- Darken images further (`brightness-[0.6] saturate-[0.85]`) with a stronger navy gradient overlay from bottom (`from-[#07171d] via-[#07171d]/70 to-transparent`) so photos become atmosphere, not subjects.
- Move the tag pill into the gradient zone and pair with a small icon-less serif title overlay so the photo half reads as a scenario header, not a thumbnail.
- Tighten the lower text block: remove the `min-h-[18rem]` (causes uneven gaps at xl) and let content set its own height; equalise via `grid auto-rows-fr`.
- Quote treatment: thinner top hairline, smaller `figcaption`, italic serif kept. Preserve PLACEHOLDER TESTIMONIAL comment.

If after this the cards still read stock-photo, fallback (only if needed): collapse to a single wide atmospheric background + four text-only scenario cards on top. Will check visually before applying.

## Priority 5 — Preserve trust markers

- Keep `// PLACEHOLDER LOGOS, replace before public launch` in `LandingLogoStrip.tsx`.
- Keep `// PLACEHOLDER TESTIMONIAL, replace before public launch` in `LandingMoments.tsx`.
- Keep all locked copy verbatim: "The rota, rebuilt.", "Made in Scotland…", "Because the rota is never just a rota…", DocklistAI Core, Pricing in beta, Early access pricing line.

## Out of scope

Auth, app shell, dl primitives, layout, styles.css, package files, routes outside landing, backend, Supabase, RLS, billing, payroll, rota/staff logic.

## Verification

After implementation:

1. `npx tsc --noEmit`
2. `npx eslint src/routes/landing.tsx src/features/landing`
3. `npm run build`
4. `git diff --check`
5. `wc -l src/routes/landing.tsx src/features/landing/components/*.tsx` — confirm all under 350-line guardrail.
6. `browser--screenshot` `/landing` at 390 and 1440 — visually confirm:
   - hero has no screenshot
   - rota screenshot only inside Features Rota Builder card
   - section rhythm reads premium and cohesive
   - Moments no longer reads stock-heavy
7. `git status --short` — confirm only landing files (and optional new asset) changed.

## Final report (delivered after implementation)

Files changed · visual improvements · screenshot treatment fix detail · which app pages were inspected · Moments decision and why · content preservation confirmation · non-landing files untouched confirmation · verification results · final `git status`. Nothing staged or committed.
