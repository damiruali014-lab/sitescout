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

---

## Step 2 — Search (Demo mode + Google Places + 2GIS)

**Prompt:** "Search: I choose a city and a business category and the tool lists businesses using official APIs only: Google Places API (New) Text Search, and the 2GIS Catalog API for Kazakhstan cities. Plus a public Demo mode with realistic sample data."

**What I built:**
- `api/search.ts` (POST). It checks my login first, then a rate limit (20/min), then validates the input, picks a provider, checks a 10-minute dedupe cache, and only then calls the API.
- **Provider "Auto":** Kazakh cities (Latin or Cyrillic spelling) go to 2GIS when a 2GIS key exists. Everything else goes to Google.
- `api/_lib/google.ts`: Text Search (New) with a strict **field mask**. The field mask decides what Google bills you. Asking for rating/website/phone puts us in the "Enterprise" SKU, so I never request reviews or photos, which cost more. Permanently closed places are filtered out. "Load more" uses `nextPageToken` and is a button that says it costs one more request.
- `api/_lib/dgis.ts`: looks up the city's `region_id` (cached for 24 h), then calls `/3.0/items`. Opening hours are formatted in EN/RU/KK. 2GIS returns websites as `link.2gis.ru` redirect URLs, so I read the readable domain instead. **If the key has no permission for contacts, the code retries without `contact_groups` and shows a notice instead of failing.**
- Shared `Business` type in `api/_lib/types.ts`, used by both the functions and the React app.
- **Demo mode:** 26 fictional businesses in 3 presets (beauty salons in Almaty, dentists in Kraków, coffee shops in Astana). They use 555 phone numbers and each has a pre-decided website verdict. No network calls, no login.
- The search state lives in a tiny global store (`useSyncExternalStore` + sessionStorage). That way results survive navigating to a lead and back. Live results are also cached per browser tab, so re-running a search is free.

**What went wrong / surprises:**
- `erasableSyntaxOnly` (new in the TS 6 template) rejects constructor parameter properties (`constructor(public status: number)`). I rewrote it as a normal field.
- oxlint flagged a control-character regex in my input sanitiser. I replaced it with a simpler whitespace collapse.
- Fast-refresh lint rule: a component file must export only components. I moved helpers to `src/lib/format.ts` and split the React context from its provider.
- I can't call the real APIs without keys, so I tested both adapters with a mocked `fetch`. That covered the field mask header, filtering closed places, 2GIS region lookup, and the "no contacts permission" fallback.

---

## Step 3 — Website check

**Prompt:** "For each business, classify its website as none / unreachable / no HTTPS / not mobile-friendly (no viewport meta tag) / OK. Only fetch the homepage, with a short timeout."

**What I built:**
- `api/_lib/sitecheck.ts`. It tries `https://host/` first (5 s timeout), then falls back to `http://host/` (4 s). It reads at most 256 KB of the homepage and looks for `<meta name="viewport">`.
- **Social-only = no website:** links to Instagram, Facebook, WhatsApp, Taplink, Linktree, 2GIS and similar count as "none", with a note. These are some of the best leads, because the business clearly wants an online presence.
- **SSRF protection** (the server fetches URLs that come from third-party data):
  - every redirect hop is checked;
  - private, loopback and link-local IPs are refused, including the cloud metadata address 169.254.169.254;
  - only ports 80/443 are allowed;
  - at most 4 redirects.
- A clear bot User-Agent that links to my portfolio, so site owners can see who is checking.
- `api/check.ts` checks up to 10 sites per call, 5 at a time. Results are cached per hostname for 1 hour.
- In the UI, checks start automatically after a search and fill in card by card ("Checking…" → badge with a reason). Demo mode simulates the same staggered effect.

**What went wrong / surprises:**
- Worst case is a dead HTTPS plus a slow HTTP: about 9 s per site. With 20 sites per call, that could exceed the function's time limit. I lowered the batch to 10, which means at most 2 rounds of 5 parallel checks.
- Tested against real sites: wikipedia.org → OK; info.cern.ch → not mobile-friendly; neverssl.com → no HTTPS; a made-up .kz domain → DNS failed; 169.254.169.254 → refused.
- Sites that answer 401/403/429 are usually blocking bots, not broken. They're marked "unreachable — verify by hand" instead of being silently counted as dead.

---

## Step 4 — Lead score, filter & sort

**Prompt:** "Rank leads (no website = best lead; high rating + many reviews + no/poor website = top). Let me filter and sort."

**What I built:**
- `api/_lib/score.ts`: a transparent 0–100 score. Every point comes with a human-readable reason, shown on hover.
  - Website gap: up to 50 (none 50 · down 42 · no HTTPS 32 · not mobile 30 · OK 0).
  - Rating: up to 20.
  - Reviews: up to 20, on a log scale, so 300 reviews isn't worth 30× more than 10.
  - Reachable: +10 if there's a phone, WhatsApp, Instagram or email.
  - Tiers: Hot ≥ 75, Warm ≥ 50, Cold below that.
- The logic lives next to the API code but has no dependencies, so the browser imports the same file. Only one scoring formula exists.
- Toolbar: filter by website (All / No site / Poor site / OK, with live counts), sort (Best lead / Rating / Reviews / Name), and minimum rating.
- **First unit tests** (Vitest, `npm test`): 21 tests. They check the score ordering and the SSRF guard (private, metadata and IPv6 loopback addresses refused; public IPs allowed).

**What went wrong / surprises:**
- The list re-sorts while website checks are still landing, so cards move around for a second. I kept it because it shows the ranking happening live. If it gets annoying, the fix is to sort only once all checks are done.
- On a 360 px screen, the score and status badges squeezed the business name. Below 480 px they now wrap under the name.
