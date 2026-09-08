# DocklistAI Non-Negotiables

These rules are enforced on every task. Violations require an immediate stop and user flag.

**Mode**

- Docklist is in product build / refinement mode. Pilot, release, paid and production readiness are owner-initiated goals only. Never adopt them as the default frame.

**Access control**

- Staff see only published/committed rota snapshots. Never live drafts.
- Managers and owners manage live draft data.
- Staff never see: manager notes, payroll settings, internal review notes, performance data, private staff fields.

**Billing / integrations**

- Billing remains disabled until the product is ready.
- Payroll integrations remain disabled.
- Payroll-ready exports are allowed.

**Database**

- Never use `select('*')`. Always select explicit fields.
- Every query is workspace-scoped.

**Frontend authority**

- Current Docklist visible content and visual direction are canonical. Preserve them unless the owner explicitly asks for a redesign.
- Lovable is a design/build/deployment tool, not product authority.
- Do not remove UI content the owner likes without explicit approval.
- Structure and file splitting must preserve visible behaviour.

**Old repository**

- The old SmartRota/Docklist repo is retired as a product roadmap. Do not inspect, harvest or compare against it during normal product work. Historical questions from the owner are the only exception.

**Product boundaries**

- 50/30/20: scheduling / lightweight HR / limited manager-led AI. Scheduling is the product centre. See `docs/adr/0001`.

**Forbidden scope drift**

Forbidden scope drift requires a new ADR in `docs/adr/` and an explicit product-boundary update before implementation. A user prompt alone is not enough.

- No full HR suite / HRIS.
- No payroll platform.
- No LMS / training platform.
- No social, chat, or team-feed features.
- No billing implementation.
- No integration marketplace or unnecessary integrations.
- No analytics / BI dashboard expansion.
- No generic AI SaaS product or UI.
- No autonomous AI scheduling authority — AI stays manager-led and manager-approved.
- No predictive worker scoring.
- No performance, wellness, or engagement scoring.
