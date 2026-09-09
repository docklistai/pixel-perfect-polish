# Vendor provenance — `playwright-cli`

| Field | Value |
| --- | --- |
| Upstream | Microsoft Playwright — official agent skill shipped inside the package |
| Package | `@playwright/cli` |
| Pinned version | 0.1.19 — **exact pin**, declared in `devDependencies` as `"@playwright/cli": "0.1.19"` (no caret, no range) |
| Source path in package | `node_modules/playwright-core/lib/tools/skills/playwright-cli/` |
| Installed by | `npx playwright-cli install --skills claude` |
| Sync date | 2026-09-09 |
| Licence | Apache-2.0 (`@playwright/cli`) |
| Local modifications | **NONE.** Verified byte-identical to the package copy. |

## Rules

- **Do not edit the vendored files.** Docklist-specific procedures live in
  `docklist-browser-fixtures`.
- **Do not auto-update.** Re-running `playwright-cli install --skills` is an
  explicit maintenance task; it overwrites this directory. Re-pin the version
  and update this file when it happens.
- Re-verify against the installed package with:
  `diff -r node_modules/playwright-core/lib/tools/skills/playwright-cli .claude/skills/playwright-cli`
  (expect differences only for this `VENDOR.md`).

## Docklist execution path (overrides vendor defaults)

- **Repo-local only.** `@playwright/cli` is a **dev dependency**, pinned to the
  exact version `0.1.19` so a routine dependency refresh cannot install a
  different 0.1.x while this file and the vendored skill still claim 0.1.19.
  Invoke it as `npx --no-install playwright-cli …`.
- **Changing the version is an explicit maintenance task**: bump the exact pin,
  re-run `playwright-cli install --skills claude`, re-sync the mirror, and update
  this file. Never widen the pin to a range.
- The upstream `SKILL.md` offers `npm install -g @playwright/cli@latest` as a
  *fallback* when no local version exists. **Never run it.** A local version
  always exists here, so the upstream preference for the local binary applies.
- **No Playwright MCP**, and no persistent MCP browser service.
- `.playwright/` (machine-specific browser choice) and `.playwright-cli/`
  (session output, may contain credentials) are git-ignored and must never be
  committed.
- A one-time local browser binary download for verification is permitted; browser
  binaries must never enter the repo.

## What this replaced

The retired community skill `docklist-playwright` (author `lackeyjb`,
`playwright-skill` v4.1.0), which auto-ran `npm install` and
`npx playwright install chromium`, wrote and `require()`d temp JS inside its own
skill directory, injected arbitrary headers from generic environment variables,
assumed `/tmp`, and maintained its own `node_modules`. None of that behaviour
exists in the official tooling.
