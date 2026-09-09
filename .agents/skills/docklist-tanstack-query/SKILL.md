---
name: docklist-tanstack-query
description: "Use when fetching or mutating server state in Docklist — queries, query keys, mutations, cache invalidation, or any screen showing stale data after an action. Enforces TanStack Query v5 patterns for rota, leave, timesheet and staff portal flows. Use whenever a change adds or updates a useQuery/useMutation."
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
