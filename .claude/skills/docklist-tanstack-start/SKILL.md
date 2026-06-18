---
name: docklist-tanstack-start
description: "Use to prevent Next.js/App Router/RSC hallucinations and enforce TanStack Start/Router conventions."
---

# TanStack Start Guard

## Purpose
Prevent Next.js/App Router/RSC hallucinations in this TanStack Start app.

## Rules
- This repo uses TanStack Start, TanStack Router, Vite, and Lovable TanStack config.
- Do not introduce Next.js conventions such as app/page.tsx, page.tsx routing, App Router assumptions, getServerSideProps, Next API routes, or arbitrary 'use server' patterns.
- Respect existing route structure and generated route tree conventions.
- Use existing server-function/server-entry patterns already present in the repo.
- Do not alter vite.config.ts, src/start.ts, src/server.ts, or routeTree.gen.ts unless the task explicitly requires it.
- Preserve Lovable TanStack config unless explicitly approved.
