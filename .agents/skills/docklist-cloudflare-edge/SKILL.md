---
name: docklist-cloudflare-edge
description: "Use to prevent deployment-breaking Node/server assumptions in the Cloudflare Edge runtime."
---

# Cloudflare Edge Guard

## Purpose
Prevent deployment-breaking Node/server assumptions.

## Rules
- This repo deploys through Cloudflare/Wrangler and has a Cloudflare edge/runtime constraint.
- Do not use Node-only runtime APIs such as fs, path, net, child_process, or Express-style servers in app runtime code.
- Do not assume a traditional Node server.
- Do not replace Supabase with D1/KV/R2/Durable Objects.
- Supabase remains the data layer unless explicitly changed by the user.
- Cloudflare is deployment/runtime guardrail, not a product-scope expansion.
- Do not edit wrangler.jsonc or deployment config unless task explicitly requires it.
