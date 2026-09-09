---
name: docklist-pwa-installability
description: "Use when working on Docklist installability or staff mobile access — web app manifest, icons, service worker registration, offline fallback, or Add to Home Screen. Use only for app-like install behaviour; not for general mobile layout work."
---

# PWA Installability Guard

## Purpose
Support installable staff portal/main app behaviour without native app bloat.

## Rules
- Use only for app-like installability, staff portal mobile access, manifest/icons, service worker registration, offline fallback, and Add to Home Screen behaviour.
- Do not add push notifications unless explicitly approved.
- Do not cache sensitive rota/staff/session data by default.
- Prefer safe app-shell caching and online-first behaviour.
- Do not turn this into a native app rebuild.
- Preserve staff portal simplicity.
