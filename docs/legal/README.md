# Legal pages — status and owner review

The public `/terms` and `/privacy` routes (content in
`src/features/legal/data/`) are **plain-language beta documents written from
repository facts only**. They deliberately make no compliance claims, name no
certifications, and promise no retention schedules or SLAs.

## Formal legal review required before open release

These pages are placeholders in the legal sense: they are honest, but they
have **not** been reviewed by a lawyer. Before any non-invite (open) release,
an owner must arrange formal review and expansion. Until then the product must
not claim GDPR or any other compliance.

## Owner decisions still outstanding

- **Governing law / jurisdiction** — intentionally omitted from the terms;
  a legal/owner decision.
- **Legal/support contact address** — currently the owner-review placeholder exported as
  `SUPPORT_EMAIL` from `src/config/commercial.ts`
  (`src/features/legal/data/legalMeta.ts`). Confirm or replace.
- **Trading entity name** — pages say "DocklistAI"; confirm the legal entity
  once one exists.

## Consent records

On signup, the app records in Supabase auth user metadata:
`consent_accepted_at` (ISO timestamp), `consent_terms_version`, and
`consent_privacy_version` (version tags from `LEGAL_VERSIONS`).

This is an **operational record** of what was shown and accepted — useful for
support and audits, but not designed as immutable legal evidence (user
metadata is mutable by the authenticated user via the auth API). If stronger
evidence is ever needed, move consent records to an append-only table via a
reviewed migration.

## Versioning rule

Any material content change to a legal page must bump that page's tag in
`LEGAL_VERSIONS` (`src/features/legal/data/legalMeta.ts`) so future signups
record the version they actually accepted.
