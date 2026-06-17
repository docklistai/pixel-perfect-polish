#!/usr/bin/env bash
#
# Phase 10 quality grep gate.
#
# Fails (exit 1) when production source re-introduces a pattern that would break a
# DocklistAI non-negotiable or the Phase 9 AI-honesty boundary. Static, read-only,
# no network, no database. Scans src/ production files only — *.test.ts are skipped
# because tests legitimately name the patterns they assert against.
#
# Allowed matches that are intentionally NOT flagged (documented so the gate stays
# non-brittle):
#   - "service-role" written in prose comments (hyphen) is documentation; only the
#     real underscore identifier `service_role` / SUPABASE_SERVICE* is a violation.
#   - Supabase writes inside `*/api/*` server-fn files and the server client are the
#     sanctioned write path; the browser-write check excludes them.
#   - Lightweight-HR sickness/absence fields (sickDays*, sicknessEpisodes,
#     shortNoticeAbsence*) are allowed product data, not AI risk signals — not flagged.
#   - "best fit for ..." marketing copy and the claude.ai/design prototype link are
#     allowed; the AI/model patterns are scoped so they do not match these.
#
# Usage: bash scripts/quality-greps.sh
set -uo pipefail

SRC="src"
fail=0

mapfile -t FILES < <(find "$SRC" -type f \( -name '*.ts' -o -name '*.tsx' \) ! -name '*.test.ts' 2>/dev/null)
if [[ ${#FILES[@]} -eq 0 ]]; then
  echo "FAIL: no source files found under $SRC/" >&2
  exit 1
fi

# check <label> <files-subset...> via stdin pattern.
# Args: label, extended-regex; optional 3rd arg = allowlist regex to drop.
report() {
  local label="$1" matches="$2"
  if [[ -n "$matches" ]]; then
    echo "FAIL: $label"
    echo "$matches" | sed 's/^/   /'
    fail=1
  else
    echo "ok:   $label"
  fi
}

grep_over() { # pattern  [files...]
  local pattern="$1"; shift
  grep -nIE "$pattern" "$@" 2>/dev/null || true
}

# 1. select('*') — every query must select explicit fields.
report "no select('*')" \
  "$(grep_over "select\(\s*['\"]\*['\"]" "${FILES[@]}")"

# 2. service-role key usage — never in client-reachable source.
report "no service_role / SUPABASE_SERVICE key" \
  "$(grep_over "service_role|SERVICE_ROLE_KEY|SUPABASE_SERVICE" "${FILES[@]}")"

# 3. Browser-side sensitive Supabase writes. insert/upsert are Supabase-specific;
#    update/delete are only flagged when chained off from(...) so Set/Map .delete()
#    and React state .update() are not false positives. Sanctioned server-fn writes
#    under */api/* and the server client are excluded.
mapfile -t BROWSER_FILES < <(printf '%s\n' "${FILES[@]}" | grep -vE '/api/|serverClient')
report "no browser-side Supabase writes" \
  "$(grep_over "\.(insert|upsert)\(|from\([^)]*\)\.(update|delete)\(" "${BROWSER_FILES[@]}")"

# 4. Real model SDK / API / env-key terms (claude-<id> not claude.ai design link).
report "no model SDK / API key terms" \
  "$(grep_over "\bopenai\b|@anthropic|anthropic-ai|claude-[0-9a-z]|gpt-[0-9]|\bcohere\b|mistralai|gemini-[0-9]|OPENAI_API_KEY|ANTHROPIC_API_KEY|GOOGLE_API_KEY|HUGGINGFACE" "${FILES[@]}")"

# 5. Forbidden AI phrases removed in Phase 9 (deterministic/honest AI boundary).
#    Exact removed surfaces only — NOT generic words like "risk" or "fit".
report "no forbidden AI phrases" \
  "$(grep_over "reviewing your data|train on (this )?workspace|allow ai to publish|include pay information|custom ai playbook|ai-assisted|risk signals?|fit score|ai-(powered|driven|generated)" "${FILES[@]}")"

echo
if [[ "$fail" -ne 0 ]]; then
  echo "quality-greps: FAILED — see flagged matches above."
  exit 1
fi
echo "quality-greps: all checks passed."
