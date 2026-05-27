# DocklistAI Architecture Guardrails

Canonical file-size and worktree rules for all agents. Supersedes the previous `repo-architecture-guardrails.md` and `frontend-architecture-guardrails.md`.

## Universal pre-edit rule

Run the line-count check from `docs/ai/snippets/line-count-precheck.md` before editing.

If a file is already over its hard max:

- Do not add more logic.
- Propose extraction first.
- Only a targeted bug fix is allowed, and only with explicit user approval.

## File size limits

| File type               |    Target |        Hard max | Required action if exceeded                                     |
| ----------------------- | --------: | --------------: | --------------------------------------------------------------- |
| Route/page files        | 250 lines |       350 lines | Extract sections, mock data, hooks, drawers, tables             |
| UI components           | 150 lines |       250 lines | Split into subcomponents                                        |
| Forms, drawers, dialogs | 180 lines |       280 lines | Extract sections, field config, validation, footer actions      |
| Hooks                   | 120 lines |       180 lines | Split responsibilities                                          |
| Services                | 200 lines |       300 lines | Split by domain action                                          |
| Utilities/helpers       | 120 lines |       200 lines | Split by purpose                                                |
| Types/schema files      | 150 lines |       250 lines | Split by domain or model                                        |
| Edge functions          | 220 lines |       350 lines | Extract shared helpers, validation, auth, response builders     |
| Tests                   | 250 lines |       450 lines | Split by behaviour or scenario                                  |
| Docs                    | 300 lines |       600 lines | Split into focused docs                                         |
| SQL migrations          | Exception | Review required | One purpose per migration; include RLS where relevant           |
| Design system files     | Exception | Review required | Do not add route-specific or feature-specific logic             |

## Frontend route rules

Routes **should**: import page sections, orchestrate layout, hold small local demo state, connect drawers/dialogs, pass data into components.

Routes **should not**: contain large mock datasets, complex tables inline, large forms inline, many nested components, duplicated design system primitives, backend or service logic.

Extract when: a JSX block exceeds ~80 lines, a drawer/form has more than one section, table rows contain complex rendering, mock data exceeds ~40 lines, the route has more than 3 major sections, or a section appears on more than one page.

## Mock data rules

- Mock data lives in `src/features/<feature>/data/`, never inline in JSX.
- Type all mock data against the feature's `types.ts`.

## Drawer and dialog rules

- Drawers are components in `src/features/<feature>/components/`, not inline route JSX.
- A drawer with more than one form section is split into sub-sections.
- Footer actions are extracted when the drawer exceeds hard max.

## Worktree safety

Run `docs/ai/snippets/worktree-precheck.md` before any branch, sync, or worktree task.

## Enforcement (PR review)

1. Check line counts.
2. At/above Target → flag for extraction in the PR description.
3. At/above Hard max → extraction required before merge.
4. Lovable-generated output → apply `docklist-vibe-code-auditor`.
