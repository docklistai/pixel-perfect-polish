---
name: docklist-tanstack-query
description: "Use to prevent stale UI and enforce proper async state patterns with TanStack Query."
---

# TanStack Query Guard

## Purpose
Prevent stale UI and bad async state patterns.

## Rules
- Use TanStack Query for server/client async state where the repo already uses it.
- Prefer typed, stable query keys.
- After mutations, invalidate or update the correct related queries.
- Do not silently replace existing local/demo state or store logic without an audit.
- Do not introduce broad global cache rewrites.
- For rota/leave/time/staff portal flows, treat stale UI as a product bug.
