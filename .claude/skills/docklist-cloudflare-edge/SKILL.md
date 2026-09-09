---
name: docklist-cloudflare-edge
description: "Use when Docklist code could break on the Cloudflare Workers runtime, or when a task touches deployment/runtime config. Prevents Node-only API assumptions and protects Supabase as the data layer. Use for edge-runtime questions; the broad official Cloudflare skill is an on-demand upstream specialist for explicit Cloudflare missions."
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

## On-demand upstream specialist

The official `cloudflare/skills` repository (Workers, Pages, KV/D1/R2, Workers AI,
WAF, Terraform) is **not installed as a project skill**, deliberately: it teaches
adoption of D1/KV/R2, which is forbidden scope here.

Pull it in only for an **explicit Cloudflare mission** the owner has scoped, and
treat this file's constraints as still binding.
