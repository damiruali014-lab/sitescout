# SiteScout — Build log

A running "How I built it" diary. After every major step: the prompt I gave, what got built, and what went wrong.

---

## Step 0 — The brief & the plan

**Prompt (summary of what I asked Claude):**
> Build a tool that finds small businesses that need a website, using official APIs only (Google Places API (New) Text Search + 2GIS Catalog API for Kazakhstan). It should check each business's website (none / unreachable / no HTTPS / not mobile-friendly / OK), score leads, generate a one-page demo landing page with a shareable link, and write a short personal outreach message in Russian, Kazakh or English with an opt-out line. It should also have a login-protected lead tracker. Stack: React + Vite on Vercel, serverless `/api` so keys never reach the browser, Supabase, the Claude API. It needs a public Demo mode with no keys and no login that works at 360px in an iframe on my portfolio. Keep it simple: first version in 1–2 days.

**Plan agreed:** 8 small steps, each ending with `npm run build` + `npm run lint` + a git commit.

**Decisions made before writing code:**
- **The paid `/api` endpoints check my login.** Without that, anyone who found the URL could spend my Google quota. Demo mode never calls them.
- **Google's terms only allow storing place IDs long-term** (lat/lng for up to 30 days). So the tracker stores IDs plus my own data (status, notes, AI text, website verdict), and loads business details fresh when needed. I'm treating 2GIS the same way until I've read its contract.
- **Demo pages are clearly labelled** as a concept preview by me, not the business's official site, and are `noindex`.

---

## Step 1 — Scaffold

**Prompt:** "Scaffold the project: Vite + React + TypeScript, lint, Geist font, light/dark theme with one accent colour, app shell, BUILD_LOG.md, .env.example."

**What I built:**
- Vite 8 + React 19 + TypeScript, linted with `oxlint` (the new Vite template ships it instead of ESLint).
- Design tokens in `src/index.css`: neutral surfaces, **one teal accent**, muted status colours, and light/dark themes. The theme follows the system setting, has a toggle, and accepts `?theme=dark` for the iframe. A tiny inline script applies it before first paint, so there's no flash.
- Geist (variable) self-hosted through `@fontsource-variable/geist`, including Cyrillic, which RU/KK text needs.
- App shell with routing (`react-router-dom`): Search, Tracker, and 404.
- `/api/health`: reports which integrations are configured, as booleans only.
- **Dev trick:** `vite.api-dev.ts` is a small Vite plugin that serves `api/*.ts` during `npm run dev`. The functions use web-standard `Request → Response` handlers, which Vercel runs natively in production. So you don't need `vercel dev` or a Vercel login to work locally.
- `vercel.json`: SPA rewrites, `noindex` header on `/p/*` demo pages, and a CSP that only allows my portfolio to iframe the app.
- `.env.example` with where to get each key and what it costs.

**What went wrong / surprises:**
- The Vite template now uses **oxlint**, not ESLint. I kept it (much faster) and made warnings fail the lint (`--deny-warnings`).
- First version of the theme toggle saved `"dark"` as JSON, but the pre-paint script compared the raw string `dark`. That mismatch would have caused a theme flash on reload. I fixed it by storing the raw string.
