---
name: docklist-typescript-expert
description: Use when designing Docklist types — feature data models, service and API contracts, component props, route data shapes, discriminated unions for state — or when resolving a stubborn type error. Calibrated to this repo's TypeScript 5.8 strict, React 19, TanStack setup. Use before introducing `any` or widening a type to make an error disappear.
risk: low
source: project
date_added: "2026-02-27"
---

# Docklist TypeScript

## This repo

TypeScript **5.8**, `strict: true`, `target: ES2022`, `module: ESNext`,
`moduleResolution: Bundler`, `jsx: react-jsx`. React 19, TanStack Router/Start/Query,
Zod 3 for runtime validation. Single package — no monorepo, no project references.

Typecheck with `npm run typecheck` (`tsc --noEmit`). That is the only diagnostic
command needed; there is no bespoke script.

## Rules

1. **No `any`.** If a type is genuinely unknown, use `unknown` and narrow. `any`
   deletes the guarantee the rest of the file depends on.
2. **No `as` to silence an error.** A cast asserts you know better than the
   compiler; usually the compiler is right. Narrow, guard, or fix the model.
   `as const` and casts after a real type guard are fine.
3. **No `@ts-ignore`/`@ts-expect-error`** without a comment naming the reason and
   the condition for removal.
4. **Model illegal states out of existence.** Prefer a discriminated union over
   a bag of optional fields:

   ```ts
   type BuildState =
     | { status: "idle" }
     | { status: "building"; sourceWeek: WeekId }
     | { status: "failed"; reason: string };
   ```

   This is worth more in Docklist than any other single type technique — most
   scheduling defects are "impossible" combinations that the type allowed.
5. **Types live with the feature.** `src/features/<feature>/types.ts` is the
   home; mock data and services type against it, never the reverse.
6. **Validate at the boundary.** Anything from the network, the database, a file
   import, or the URL is `unknown` until a Zod schema (or explicit guard) proves
   otherwise. Infer the TS type from the schema rather than declaring it twice.
7. **Derive, don't duplicate.** `Pick`, `Omit`, `ReturnType`, and template
   literal types keep one source of truth. A hand-copied shape drifts.
8. **Explicit exported signatures.** Public functions and hooks declare their
   return types; inference is fine for locals.

## Common Docklist shapes

- **Dates/times** — see `docklist-scheduling-integrity`. Do not type a
  wall-clock date and an instant as the same thing; give them distinct types so
  the compiler catches the confusion.
- **IDs** — prefer branded types (`type WorkspaceId = string & { __brand: "WorkspaceId" }`)
  where mixing two id kinds would be silent and damaging.
- **Query data** — type TanStack Query results from the service contract, not
  from what the component happens to use.

## When a type error is stubborn

1. Read the *first* error, not the last — later ones are usually consequences.
2. Ask whether the model is wrong before making the type looser.
3. Narrow with a type guard or `in`/`typeof` check.
4. Split a large union or intersection if instantiation gets deep.
5. Only then consider a cast — and comment why.

## References

Load only when needed:

- `references/typescript-cheatsheet.md` — syntax and utility-type reference.
- `references/utility-types.ts` — reusable helper type implementations.
- `references/tsconfig-strict.json` — strictness options for comparison. **Do
  not apply it to this repo's `tsconfig.json`** without an explicit task; config
  changes affect the whole codebase.

## Not applicable here

JS→TS migration strategy, monorepo project references, and Biome-vs-ESLint
comparisons are out of scope — this repo is already TypeScript, single-package,
and standardised on ESLint + Prettier.
