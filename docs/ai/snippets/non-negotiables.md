# DocklistAI Non-Negotiables

These rules are enforced on every task. Violations require an immediate stop and user flag.

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
- Do not blindly port complexity from the old repo.

**Architecture**

- Lovable owns frontend design direction unless told otherwise.
- Prefer clean V2 rebuilds over copying old bloat.

**Product boundaries**

- 50/30/20: scheduling / lightweight HR / limited AI. See `docs/adr/0001`.
- No generic AI SaaS UI. No feature bloat. No backend/product-scope drift.

**Forbidden scope drift (unless explicitly requested)**

- No full HR suite.
- No LMS / training platform.
- No social, chat, or team-feed features.
- No payroll platform.
- No billing implementation.
- No integration marketplace.
- No analytics / BI dashboard.
