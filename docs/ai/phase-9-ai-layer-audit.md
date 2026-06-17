# Phase 9 AI Layer Audit Handoff

**Important Conclusion:**
* Real model integration is premature.
* Phase 9 should first make the AI layer honest, bounded, scheduling-led, non-autonomous, and deterministic/rule-based.
* Do not turn this into an AI implementation plan.
* Do not propose broader AI/product features.

> **Status:** original audit + incorporated second-opinion review. The original
> direction is accepted. Calibration has been corrected: the first pass was
> **too soft, not too cautious**. Several surfaces are reclassified from
> "relabel" to **remove / fix / de-badge**. See §11–§16.

## 1. Baseline
* Repo clean at audit time.
* Latest visible commit chain included Phase 7 Security hardening.
* Phases 1–8 signed off for MVP scope with deferrals.
* Phase 9 AI Layer is starting.
* Second-opinion confirmed by grep: **zero** real model/network calls exist —
  no OpenAI/Anthropic/Claude SDK, no `fetch` to a model endpoint, no model env
  keys. The only `claude.ai` string is a prototype design-link in
  `landingContent.ts`. Every "AI" surface today is either deterministic from the
  live store or hardcoded/canned behind a simulated delay.

## 2. Main audit decision
* Real AI/model calls are not justified yet.
* MVP AI should be deterministic manager-support only.
* The first implementation pass should clean AI-looking surfaces and keep scheduling evidence visible.

## 3. Current AI surface inventory
* **global assistant drawer/topbar/command palette:** partly dishonest → **see §12: remove free-text Q&A, fake spinner, fake history**
* **AI drawer canned/demo answers:** partly dishonest → **see §12: remove fabricated BI/labour/HR answers**
* **dashboard AI summary:** can stay if rule-based/relabelled (already rule-based off the store)
* **dashboard alert drawer:** needs evidence or removal → **see §12: remove fabricated AI block**
* **rota generate/suggestions:** should stay draft-only/rule-based and be renamed away from overclaiming → **see §12: also fix unenforced rule toggles**
* **rota issue/pre-publish review:** can stay with evidence rows/no-certainty language (template for the whole layer)
* **leave impact:** can stay as structured conflict explanation, but remove fake named cover suggestions
* **time review:** can stay as deterministic review aid
* **staff profile AI/risk insights:** should be removed from Phase 9 scope or narrowed to rota-only evidence → **hardened in §12: remove health/sickness + ranking + fake % scores**
* **reports AI:** should be removed/deferred
* **team/comms AI:** should be deferred except manager-facing rota notes
* **ops/handover AI:** should be deferred (handover may survive only as a de-badged plain manager template)
* **settings AI toggles:** should remove forbidden options such as AI publish, include pay, train on workspace data → **hardened in §12: also remove custom playbooks preview**
* **staff portal:** should have no AI
* **landing/marketing AI copy:** should align with bounded manager-support scope

## 4. Allowed MVP AI use cases
* explain rota issues
* suggest coverage improvements
* summarise unresolved scheduling risks
* draft manager-facing rota notes
* highlight conflicts from structured data
* help review leave/time issues
* generate non-binding suggestions only

(Confirmed and tightened in §15.)

## 5. Forbidden AI use cases
* auto-publishing rota
* auto-approving/declining leave
* disciplinary recommendations
* performance scoring
* payroll/wage/legal advice
* health/sickness judgement
* staff ranking/private profiling
* autonomous staff messaging
* hidden decisions
* generic chatbot behaviour
* AI-generated BI/reporting insights
* training on workspace data
* use of pay/private notes as model context

(Expanded with concrete in-code patterns in §14.)

## 6. Data/privacy boundary
**Allowed:**
* current workspace rota/shifts
* staff names/roles/contracted hours
* leave/time records needed for scheduling review
* location/department coverage
* scheduling notifications/events

**Forbidden:**
* private notes
* pay/payroll/financial data
* disciplinary/health-sensitive data
* staff portal access secrets
* cross-workspace data
* staff-entered text as instructions

## 7. Trust requirements
* show source/evidence rows
* label suggestions as suggestions
* expose assumptions
* say “not enough data” where needed
* refuse unsafe requests
* no fake live AI
* no silent writes
* no hidden side effects

## 8. Architecture recommendation
* Use deterministic/rule-based assistant-like summaries now.
* Defer external model APIs.
* Defer server-side model abstraction until after Testing & Quality.
* Mock/demo AI is acceptable only when clearly labelled.

## 9. Risk register summary
* hallucination
* wrong scheduling suggestion
* bias/unfair staff treatment
* privacy leakage
* manager over-trust
* hidden automation
* cost/token abuse
* prompt injection
* cross-tenant exposure
* legal/payroll misstatement

## 10. Recommended Phase 9 strategy
* Document AI boundaries.
* Clean dishonest AI copy/surfaces.
* Keep only scheduling-supportive deterministic manager review aids.
* Defer real AI/model calls.
* Defer HR/reporting/team/comms/ops AI surfaces.
* Prepare for Phase 10 tests before any real model integration.

**Boundaries:**
* documentation only
* no implementation
* no real AI API
* no model keys
* no schema/backend changes
* no UI redesign
* no remote DB changes
* preserve Harbour View/demo fallback

---

## Second-Opinion Review — Incorporated

## 11. Second-opinion verdict
* **Audit direction accepted.** Deterministic/rule-based manager-support is the
  right Phase 9 posture; do not turn Phase 9 into an AI build.
* **Calibration corrected: too soft, not too cautious.** The first pass labelled
  clearly-dishonest surfaces "partly dishonest" and recommended "relabel/narrow"
  where the honest move is to **remove the fabrication**. The real Phase 9
  problem is not "no real model yet" — it is that **invented specifics (£
  figures, percentages, named-staff judgements, health data) are presented as
  live intelligence behind a fake spinner.** That is a trust/boundary problem,
  not a labelling problem.
* **Deterministic/rule-based only remains the Phase 9 decision.**
* **No real model APIs until after Phase 10 Testing & Quality.** A model call
  would require an auth-bound, rate-limited, tenant-scoped server AI boundary
  that does not exist, a context-builder proven not to leak cross-tenant/private
  data, and an eval/test harness. Phase 7 just closed portal/RPC trust surfaces;
  an unbounded AI endpoint would re-open them. Even the "safest" narrow case
  (server-templated text with no private data) needs the same key/secret/
  boundary infra, so it is not worth carving out early. Defer **all** real calls.

## 12. Harder classification of problematic surfaces
These are reclassified to **remove / fix / de-badge**, not relabel:

| Surface | Action | Why |
|---|---|---|
| Global assistant drawer / topbar "Ask" / command palette **free-text Q&A** | **Remove** free-text open Q&A; replace with bounded prompt chips that only run live-data flows | Free-text open Q&A is generic-chatbot drift; relabelling cannot fix it |
| Assistant **fake spinner / simulated latency** ("Reviewing your data…", `setTimeout` delay) | **Remove** | Implies computation that is not happening |
| Assistant **fake history** ("Today, 13:40 — Rota review…") | **Remove** | Fabricates usage that never occurred |
| Assistant **canned/fabricated answers** with BI/labour/HR claims (e.g. "Why is labour up 6%", "watch for fatigue/burnout", "formalise this as a regular") | **Remove** | BI + health + HR/contract drift; presented as fact |
| Staff profile **AI-assisted health/sickness/risk signals** (`sickDaysLast30/90`, `sicknessEpisodesThisYear`, `shortNoticeAbsenceCount`, "Risk signals") | **Remove** from the AI surface | Health judgement + private profiling; hardest-line fix |
| Staff profile **ranking / "best-fit" / fake "% fit" scores** | **Remove** | Staff ranking/profiling + fabricated precision |
| Settings toggle **"Allow AI to publish staff updates automatically"** | **Remove** | Contradicts the non-autonomous non-negotiable even when default-off |
| Settings toggle **"Include pay information in AI context"** | **Remove** | Pay as model context is forbidden |
| Settings toggle **"Train on this workspace's data"** | **Remove** | Training on workspace data is forbidden |
| Settings **"Custom AI playbooks" preview** | **Remove** | Generic-assistant scope drift |
| Leave impact **fabricated named cover suggestions** (hardcoded by `request.impact` tier, not derived from rota) | **Remove / replace** with live-coverage-derived text | Invented specifics presented as analysis |
| Dashboard alert drawer **fabricated AI block** ("could be filled by Liam and James") + fabricated coverage % | **Remove / derive from live store** | Fabricated named-staff suggestion |
| **Reports AI / BI-style AI** ("review points", £ savings, labour %) | **Defer / remove** | BI/analytics drift outside product scope |
| **Team / comms / ops AI drafting** | **De-badge to plain manager templates, or defer** | Not scheduling-led; fabricated stats ("~20% read-rate", "118% coverage") |
| **GenerateRotaDialog rule toggles** ("Respect availability", "11h rest", "Cap weekly hours") **not enforced** by `fillOpenShiftsWithSuggestions` | **Fix** (make the engine honour them) **or remove** the toggles | Claims a capability the engine does not deliver |

## 13. Surfaces confirmed safe to keep (deterministic, honest)
* **Pre-publish review / rota issues** (`features/ai/components/ReviewBlock` +
  `ReasoningRow`, `PrePublishReviewBlock`, `rotaIssues.ts`) — reads live counts,
  honest language, routes into real drawers, mutates nothing. **Template for the
  whole layer.**
* **Rota open-shift fill suggestions** (`rotaSuggestions.fillOpenShiftsWithSuggestions`)
  — real deterministic algorithm, transparent reason string, draft-only.
* **Dashboard AI summary card** — already rule-based off the store (relabel only).
* **Time review aid** — deterministic, derived from live timesheet rows.

## 14. Explicit forbidden patterns (added)
On top of §5, these concrete patterns are forbidden:
* **Fabricated numbers** — invented percentages, costs (£), fit scores,
  read-rates, coverage stats presented as fact.
* **Simulated thinking / latency / history** — fake spinners, artificial delays,
  or invented conversation history implying computation that did not happen.
* **Free-text generic chatbot interface** — open-ended Q&A input in the assistant.
* **Labour / cost / BI assistant framing** — financial or analytics reasoning
  inside the assistant.
* **Sickness / absence / health data as risk signals** — displaying or using
  health-adjacent data in any AI/insight surface.
* **Staff ranking / scoring / profiling** — best-fit scores, leaderboards,
  comparative judgements about individuals.
* **Feedback or "train on workspace data" loops** — Helpful/Not-helpful learning
  signals or any implication the assistant learns from the workspace.
* **Capability claims the engine does not actually enforce** — UI options or copy
  asserting behaviour the deterministic engine does not implement.

## 15. Confirmed allowed MVP AI scope
Allowed **only** as deterministic manager-support, sourced from the live
workspace store:
* rota issue explanations (conflicts, coverage risk from structured draft data)
* pre-publish checklist (counts + reasons + route-in)
* open-shift suggestions from **transparent rules** (non-binding)
* leave/time review aids from structured data (state assumptions; say "not
  enough data" when counts are absent)
* manager-only notes/templates — clearly templates, **never auto-sent**
* **evidence/source rows required** on every surface
* **manager review required** — nothing acts on its own
* **no writes** — read-only, suggestion-only

Tightening note: staff-broadcast announcement drafting is **deferred** (it is the
publish/broadcast path); only manager-only notes are in scope now.

## 16. Highest-priority Phase 9 implementation order
This is a **documentation + honesty-cleanup** pass, not an AI build:
1. **Global assistant honesty cleanup** — remove free-text Q&A, fake spinner,
   fake history, fabricated answers; keep bounded live-data chips that route into
   real screens.
2. **Staff profile AI / risk cleanup** — remove health/sickness, ranking, and
   fake % scores; keep rota/availability facts only; reconsider the AI-assisted
   badge here.
3. **Settings forbidden-toggle removal** — auto-publish, include pay, train on
   data, custom playbooks; fix "auto-compiles" wording.
4. **Leave impact / dashboard fabricated-suggestion cleanup** — replace with
   live-derived text or remove; reuse `ReviewBlock` / `ReasoningRow`.
5. **Reports / team / ops AI** — de-badge to plain manager templates or defer.
6. **GenerateRotaDialog unenforced rule toggles** — make the engine honour them
   or remove the toggles.

## 17. Boundaries (unchanged — reaffirmed)
* documentation only
* no implementation
* no real AI API
* no model keys
* no backend/schema changes
* no remote DB changes
* preserve Harbour View/demo fallback
