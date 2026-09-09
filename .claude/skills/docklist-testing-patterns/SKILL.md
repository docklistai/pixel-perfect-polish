---
name: docklist-testing-patterns
description: Use when writing, changing or reviewing Docklist automated tests — Vitest unit tests, jsdom component tests with @testing-library/react, factories, regression coverage for a bug, or deciding what a change must prove. Matches this repo's actual stack. Use whenever a fix needs test coverage or an existing test needs updating.
risk: low
source: project
date_added: "2026-09-09"
---

# Docklist Testing Patterns

## The canonical rule

> **Automated tests prove implementation correctness.
> Browser workflows prove product behaviour.
> Neither substitutes for the other.**

A green suite does not mean the workflow is usable, and a good browser session
does not mean the logic is right. Report both kinds of evidence, or say which is
missing and why (`docklist-browser-fixtures`, `docklist-validate`).

## This repo's stack

**Vitest 4** · **@testing-library/react 16** · **@testing-library/jest-dom** ·
**@testing-library/user-event** · **jsdom 30** · React 19 · TypeScript 5.8.

`vitest.config.ts` defines two projects:

| Project | Files | Environment | Setup |
| --- | --- | --- | --- |
| node | `src/**/*.test.ts` | `node` | — |
| dom | `src/**/*.test.tsx` | `jsdom` | `./src/test/setupDom.ts` |

**Components are rendered directly — never routes.** Put logic in `.test.ts`
(node) and rendered component behaviour in `.test.tsx` (jsdom).

There is **no Jest, no React Native, and no Playwright test suite** in this
project. Do not use `fireEvent.press`, `fireEvent.changeText`,
`@testing-library/react-native`, `jest.requireMock`, or `jest.requireActual`.
Vitest's `vi.*` API is the mocking surface; `describe/it/expect` come from
`vitest`.

## Shape of a test

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("resolveShiftWeek", () => {
  beforeEach(() => vi.clearAllMocks());

  it("keeps an overnight shift in its owning shift-day", () => {
    expect(resolveShiftWeek(overnightShift)).toBe("2026-09-07");
  });
});
```

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

it("shows the refusal reason when Build has no source week", async () => {
  render(<BuildTheWeekPanel {...getMockProps({ sourceWeek: null })} />);
  await userEvent.click(screen.getByRole("button", { name: /build/i }));
  expect(screen.getByText(/no recent pattern/i)).toBeVisible();
});
```

Query by role and accessible name where possible — it tests what a user can
actually reach, and doubles as an accessibility check.

## Factories

Use `getMockX(overrides?: Partial<X>)` helpers with sensible defaults, typed
against the feature's `types.ts`. Override only the field under test, so the
test states its own point.

## TDD — rigor without destructive ritual

Test order is a tool, not a moral test.

- **New bug** — reproduce with a failing test first where practical. The failing
  test proves you understood the defect.
- **New pure behaviour** (rules, calculations, data shaping) — test-first
  preferred.
- **Inherited or in-progress work** — do **not** delete valid working code
  because the test came second. Add the coverage now.
- **Before claiming a defect fixed** — coverage must exist and must exercise the
  defect. Verify red-green: revert the fix, watch it fail, restore it.
- **Browser-observed regression** — add automated coverage where practical so it
  cannot return silently.
- Refactor after green.

## Test behaviour, not mocks

```ts
// Bad — asserts the mock, proves nothing about the product
expect(mockFetchRota).toHaveBeenCalled();

// Good — asserts what the user gets
expect(screen.getByText("Late shift")).toBeVisible();
```

**Never mock away the behaviour under test.** If a test passes with the real
implementation deleted, it is not a test. Mock at the boundary — network,
clock, randomness — not at the thing you are trying to prove.

Prefer real data structures over stubs; prefer a fake clock over `Date.now()`
assertions that drift.

## Scope of proof

| Change | Minimum proof |
| --- | --- |
| Helper / rule / calculation | targeted node test |
| Component behaviour | targeted jsdom test + browser check |
| Shared type or provider | full `npm run test` |
| Scheduling rule | test at the **shared** layer, not per call site — see `docklist-scheduling-integrity` |
| RLS / policy / RPC | SQL suite — see `docklist-sql-suite` |
| User-visible workflow | browser evidence — see `docklist-browser-fixtures` |

Targeted checks first; full suite when scope or risk warrants it. Commands are
in `docklist-validate`.
