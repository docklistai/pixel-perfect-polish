---
name: docklist-browser-fixtures
description: Use when driving the Docklist app in a real browser — product reality audits, manager or staff portal journeys, mobile checks, or reproducing a user-visible defect. Provides Docklist's local URLs, personas, viewports and pass/fail checks. Pair with the official playwright-cli skill, which supplies the browser commands themselves.
risk: medium
source: project
date_added: "2026-09-09"
---

# Docklist Browser Fixtures

Docklist-specific procedures for browser work. **Command syntax lives in the
official `playwright-cli` skill — do not duplicate it here.**

## Tooling

`@playwright/cli` is a **repo-local dev dependency**. Invoke it as:

```bash
npx --no-install playwright-cli <command>
```

- **Never** `npm install -g @playwright/cli` — the upstream skill offers that
  only as a fallback when no local copy exists. One always exists here.
- **No Playwright MCP** and no persistent MCP browser service.
- `.playwright/` and `.playwright-cli/` are git-ignored. Never commit them, and
  never commit browser binaries or session output.

## Resolving the app URL

1. Start the app with `npm run dev` (Vite) if it is not already running.
2. Use the URL Vite prints. Do not hard-code a port — this repo's dev port can
   move, and a stale port silently tests nothing.
3. If a build-output check is needed, `npm run preview` after `npm run build`.
4. **Local only.** Never point browser QA at a hosted deployment.

## Personas

Docklist has two fundamentally different journeys. Test the one that matters,
and say which you used.

- **Manager** — desktop-first. Rota grid, Build the Week, Import, Open shifts,
  publish, Settings, staff admin.
- **Staff portal** — mobile-first. Published rota only, open-shift applications,
  time off, manager contact.

Sign in through the normal UI so the real auth path is exercised. Reuse a signed-in
session across checks rather than re-authenticating per step (see the official
skill's session/storage-state references).

## Workspace state

- Prefer a **clean local workspace** when the journey depends on first-run
  behaviour. Empty states and cold starts are where this product has historically
  been weakest.
- Use the **local Supabase stack** for any data setup.
- **Never mutate hosted Supabase to run browser QA.** If a scenario appears to
  need hosted data, stop and report — that is a product or fixture gap.

## Viewports

| Persona | Viewport | Why |
| --- | --- | --- |
| Manager | 1440 × 900 | Representative desktop working width. |
| Manager (small) | 1024 × 768 | Catches grid overflow early. |
| Staff portal | **390 × 844** | Real phone. The portal's primary form factor. |

A staff journey that has only been checked at desktop width is **not checked**.

## Required checks on every browser pass

Run these regardless of what the task was about:

1. **Console errors** — capture console output; any error or unhandled rejection
   is a finding, even if the screen looks right.
2. **Horizontal overflow** — the page body must not scroll sideways at the
   persona's viewport. Wide tables and grids must scroll inside their own
   container.
3. **Offered-then-refused** — every control you can see: does it do what it
   claims, or does it error, no-op, or say "not available"? These are
   high-priority trust defects.
4. **Data plausibility** — is the data actually right, not merely well-formed?
   See `docklist-scheduling-integrity`.

## Scenario rules

- **Observe before reading source.** The browser is the evidence for product
  questions; source explains the cause afterwards.
- Use realistic manager/staff tasks, not synthetic clicks.
- Count the interaction burden — clicks, scrolls, re-navigations. A correct
  workflow that takes fourteen steps is a real finding.
- Record what you actually saw, not what you expected to see.
- Browser evidence belongs in the completion report; a passing unit test is not
  a substitute (`docklist-testing-patterns`).

## Boundaries

- Browser QA does not authorise product changes — scope comes from the mission.
- Do not trigger native dialogs (`alert`/`confirm`) unnecessarily; they block
  automation.
- Do not add Playwright test infrastructure to `src/` in this repo without an
  explicit mission — there is currently no Playwright test suite, by design.
