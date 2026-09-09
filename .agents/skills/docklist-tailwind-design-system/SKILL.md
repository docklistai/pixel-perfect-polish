---
name: docklist-tailwind-design-system
description: Use when styling Docklist UI with Tailwind — adding or changing components, working with design tokens, theming, dark mode, or responsive patterns. Encodes this repo's Tailwind v4 CSS-first setup and existing token system. Use before writing new utility classes or touching src/styles.css.
risk: low
source: project
date_added: "2026-02-27"
---

# Docklist Tailwind Design System

**This repo uses Tailwind v4 with a CSS-first configuration.** There is no
`tailwind.config.ts`, and there never should be unless the owner asks for one.

## How this repo is actually set up

`src/styles.css` is the single source of styling configuration:

```css
@import "tailwindcss" source(none);
@source "../src";
@import "tw-animate-css";

@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *, .dark, .dark *));

@theme inline {
  --color-background: var(--background);
  --color-primary: var(--primary);
  --radius-md: var(--r-md);
  /* … */
}
```

- **`@import "tailwindcss"`**, not `@tailwind base/components/utilities`.
- **`@theme inline`** maps design tokens to Tailwind's namespaces
  (`--color-*`, `--radius-*`), so `bg-primary` and `rounded-md` resolve to the
  Docklist tokens.
- **Dark mode is `[data-theme="dark"]`**, registered via `@custom-variant`, with
  `.dark` kept as a legacy alias. Do not switch to Tailwind's default `class`
  strategy.
- Content scanning is `@source "../src"` with `source(none)` — no `content:`
  array.

Stack: Tailwind 4.2 · `@tailwindcss/vite` 4.2 · `tw-animate-css`.

## Rules

1. **Use existing tokens.** Style with `bg-card`, `text-muted-foreground`,
   `border-border`, `rounded-lg`. Never hard-code a hex value or an arbitrary
   `bg-[#…]` when a token exists.
2. **Add tokens in `@theme inline`**, alongside the existing ones, and only when
   a genuinely new semantic role is needed — not a one-off shade.
3. **Preserve the current visual direction.** Docklist's visible design is
   canonical; redesign happens only when the owner asks
   (`docs/ai/DOCKLIST_OPERATING_SYSTEM.md` → Frontend authority).
4. **Both themes.** Anything you add must read correctly in light and dark.
   Never define a colour only inside the dark variant.
5. **No new UI system.** No random gradients, no gratuitous glassmorphism, no
   generic AI-SaaS look — see `docs/ai/FRONTEND_GUARDRAILS.md`.
6. **Components use `cva` + `tailwind-merge`** (`class-variance-authority`,
   `clsx`, `tailwind-merge` are already dependencies). Follow the existing
   component patterns rather than inventing a variant mechanism.
7. **Radix primitives** back the interactive components. Style them; do not
   replace them.
8. **Mobile matters.** The staff portal is phone-first — verify at 390px
   (`docklist-browser-fixtures`).

## Do not use (Tailwind v3 patterns)

- `tailwind.config.js` / `.ts`
- `@tailwind base;` `@tailwind components;` `@tailwind utilities;`
- `content: [...]` arrays
- `darkMode: 'class'` config
- `theme.extend` in JS

If you find guidance recommending these, it predates this repo's v4 setup.

## Related

- `docklist-baseline-ui` — spacing, typography, motion baseline.
- `docklist-frontend-dev-guidelines` — component construction.
- `docklist-fixing-accessibility` — contrast, focus, ARIA.
- `resources/implementation-playbook.md` — general design-system patterns
  (tokens, variants, responsive). **Its setup section describes Tailwind v3; the
  repo setup above wins wherever they disagree.**
