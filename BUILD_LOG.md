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

---

## Step 5 — Demo landing page + shareable link

**Prompt:** "For a chosen lead, generate a one-page demo landing page (name, category, address, hours, phone, rating, a short AI-written description and a call-to-action) with a shareable link I can send to the owner."

**What I built:**
- **Lead page** `/lead/:key`. It shows why the lead scored what it did, the website-check details with a re-check button, and contacts and hours. Then the demo-page builder.
- **Public landing page** `/p/:slug`, shown in EN/RU/KK. It has a hero (category, name, rating), CTA buttons (book/call, WhatsApp, directions), an About text, hours and location cards, and a footer CTA back to me. It's styled with the same tokens, so dark mode works there too.
- **Honesty built in:** every page has a top bar saying it's a concept preview made by me and *not* the business's official site. It carries `noindex` (both a meta tag and the `X-Robots-Tag` header from `vercel.json`) and expires after 60 days.
- **AI description** (`/api/describe`): one Claude Haiku call with a short system prompt. It may use only the facts given (name, category, address, rating); no invented services, prices or awards. I can edit the text before publishing. If the AI isn't configured, it falls back to a template.
- **Storage that respects Google's terms:** `demo_pages` stores the slug, provider + ID, language and *my* text. `/api/page` reads the row with the service-role key and re-fetches the business details live (`api/_lib/details.ts`, cached 10 min).
- **View counter:** a `security definer` SQL function bumps `views` and `last_viewed_at` when someone opens the page, so I'll know when an owner opened my link. My own visits while logged in don't count.
- SQL migration: `supabase/migrations/001_demo_pages.sql`, with RLS so only I can create or see my pages from the browser.
- **Demo mode:** links like `/p/demo-alm-1-ru` rebuild the page from bundled sample data, so portfolio visitors can open and share them. The CTA buttons are inert there, so nobody dials a fake 555 number.

**What went wrong / surprises:**
- The new React lint rule `set-state-in-effect` flagged my first version of the data loading. I refactored: demo data is now *derived during render* (`useMemo`), and the effect only handles the remote fetch.
- Opening a lead straight from a link showed "Not checked", because checks only ran on the search page. The lead page now runs the check for that one lead.
- The Kazakh UI strings and templates are my best effort; **they need a native-speaker review.**

---

## Step 6 — Outreach message (RU / KK / EN)

**Prompt:** "Generate a short, personal first message for WhatsApp/Instagram/email that mentions something specific about that business and links its demo page. Language selectable: Russian, Kazakh or English. Include a polite one-line opt-out."

**What I built:**
- `api/_lib/outreach.ts`, shared by the browser and the API:
  - `hookDetail()` picks **one specific, verifiable detail**: rating + review count if there are 50+ reviews, otherwise a great rating, otherwise their street.
  - `issueLine()` states the actual website problem in plain words ("opens without HTTPS, browsers mark it Not secure", "only a social media page", …).
  - Templates in 3 languages × 3 channels. Email gets a subject and a signature.
  - **The opt-out line is appended by code, never by the AI**, so it can't be forgotten or reworded.
- `/api/message`: one Claude Haiku call. The prompt tells it exactly which detail to use, the word limit per channel, the link to include once, and "no invented facts". If the model drops the link, the code adds it back. If the AI fails, the response falls back to the template and says so in the UI.
- Message card on the lead page: pick a channel and language, edit the text, then copy it or open WhatsApp/email with the message pre-filled. **You always send it yourself**; nothing is sent automatically.
- In Demo mode, "Open WhatsApp" is disabled, because the numbers are fictional.
- 6 new unit tests (27 total). They check that every language ends with its opt-out line, that the link appears exactly once, and that only email gets a subject and signature.

**What went wrong / surprises:**
- In a column layout, the segmented channel picker stretched to full width. I fixed it with `align-self: flex-start`.
- The first draft wrapped the Copy button in a `<span onClick>` to log "sent". I replaced it with a proper `onCopied` callback, which is more accessible and is also what the tracker uses next.

---

## Step 7 — Login + lead tracker

**Prompt:** "Save leads with status (new → contacted → replied → won / lost), notes and last-contact date. Protect the tracker with my login."

**What I built:**
- `supabase/migrations/002_leads.sql`: a `leads` table with RLS (`auth.uid() = user_id`), a unique `(user, source, source_id)` pair so saving twice just updates, and an `updated_at` trigger. **Only IDs and my own data are stored**: status, notes, dates, website verdict, score, demo slug, and my search inputs.
- **Login** (`/login`): Supabase email + password for a single user. I create my user in the dashboard and turn off sign-ups. The paid `/api/*` endpoints check the token *and* `ALLOWED_EMAIL`, so even a leaked sign-up couldn't use my quota.
- **Live vs Demo:** live mode turns on only when Supabase is configured, I'm logged in, and the page isn't embedded or using `?demo=1`. Everyone else gets Demo mode automatically. When logged in, a Live/Demo switch appears on the search page.
- **Tracker page:**
  - pipeline filter with counts;
  - per lead: status dropdown, "Log contact today" (moves New → Contacted), notes that save on blur, a link to its demo page, and a two-step Remove (no browser `confirm()` popups);
  - an automatic **"Follow up"** badge when a lead was contacted 3+ days ago with no reply.
- Business names in the tracker are fetched with the cheaper "basic" Place Details field mask and cached for the browser session.
- **Lead page integration:**
  - "Save to tracker";
  - publishing a demo page saves the lead automatically;
  - after copying or opening a message, it asks *"Sent the message? Mark as contacted"* instead of assuming you sent it.
- **Demo tracker:** the same UI backed by localStorage and seeded with 3 sample leads, so portfolio visitors can try the full pipeline.
- **End-to-end test** (Playwright, 360 px, `?embed=1`): search → open top lead → demo link → write message (checks the link and opt-out) → copy → mark contacted → tracker → change status + notes → reload → still saved → public page renders. Passes with zero console errors and no horizontal scroll.

**What went wrong / surprises:**
- **Bug found by the e2e test:** the footer came back after navigating inside the iframe. In `isEmbed = urlFlag || rememberInSession(...)`, the `||` short-circuited, so the "remember" side never ran when the URL flag was true. I fixed it by always calling the function.
- On 360 px the status filter labels wrapped ("All / 3" on two lines). They're now `nowrap`, and the group scrolls horizontally instead.
- TypeScript caught that spreading a `Partial<>` over a new lead could leave `source`/`sourceId` undefined. Fixed by setting them explicitly.
- I can't run a real Supabase here, so I parsed both SQL migrations with `pglast` (the real Postgres parser) to catch syntax errors before you run them.

---

## Step 8 — Polish, embed mode, README

**Prompt:** "Demo mode must work inside an iframe on my portfolio's Live Stage at 360px wide. Keep it calm and clean."

**What I built:**
- **Embed mode** (`?embed=1`): forces Demo mode, hides the footer and the subtitle, and adds an "Open ↗" link to the full app. It's remembered while you navigate inside the iframe.
- **Instant first paint in Demo mode:** sample results show immediately, so the Live Stage is never an empty form.
- Compact nav under 400 px, so Search · Tracker · Open ↗ · theme fit at 360 px next to the logo.
- README with setup, keys and costs, Supabase steps, Vercel deploy, the iframe snippet, and a "terms, privacy and safety" section.

**Final checks:**
- `npm run build` ✓ · `npm run lint` (warnings fail) ✓ · `npm test`: 27 unit tests ✓.
- Playwright end-to-end flow at 360 px inside `?embed=1` ✓. No console errors and no horizontal scroll on any screen at 360 px, in light and dark.
- `/api/*` without login returns a clear error. With auth skipped locally, the real website check correctly classified wikipedia.org (OK), info.cern.ch (not mobile-friendly) and 10.0.0.1 (refused).

**Not yet verified, needs real keys:** live Google/2GIS responses (adapters tested with mocked API responses), Supabase writes (SQL parsed with the real Postgres parser, not executed), and Claude output quality in Kazakh.

---

## Time & lessons

- 8 steps, each one: prompt → build → lint → commit. Roughly half a day of agent time for the first version.
- Most useful habits:
  - (1) Decide the **data/terms rules before coding**. The "store only IDs" rule shaped the database design.
  - (2) Put **anything the AI must never get wrong** (opt-out line, link) in code, not in the prompt.
  - (3) A single end-to-end test caught a bug that unit tests and screenshots didn't.

---

## Step 9 — Real keys: Google ✓, Supabase ✓, 2GIS (demo key) surprises

**Prompt:** "In my country we don't use Google Maps, we use 2GIS — add the 2GIS key."

**Tested with real keys (from my Mac, without printing them):**
- **Google Places:** "dentists in Kraków" returned real clinics with ratings, review counts and websites.
- **Supabase:**
  - both tables and the view-counter function work;
  - the anon key can't read anyone's leads (RLS);
  - sign-ups are blocked.
  - **Bug in my setup:** I had pasted the URL with `/rest/v1/` on the end. The fix: the URL must end at `.supabase.co`.
- **2GIS:** search works, with real ratings (e.g. 4.8 from 1,173 reviews) and opening hours. But two surprises:
  1. **`en_KZ` is not a valid 2GIS locale** (HTTP 400). English searches now use `ru_KZ`, since the business data is in Russian anyway.
  2. **The demo key silently drops phones and websites.** I'd guessed 2GIS would return an error, but it just leaves `contact_groups` out. That made every business look like it had "No website", a fake 100-point Hot lead. The fix: when no result has contacts, each business is flagged `contactsHidden`. The badge then says "Website unknown", the website check is skipped, the score treats the website as unknown (max ≈ 70, "Warm"), and the outreach text no longer claims "you don't have a website".
- New test built from the real 2GIS response shape (28 tests total).

**Lesson:** mocked tests passed for the case I *imagined* (an error). The real API did something else. Test with real keys as early as possible.

---

## Step 10 — Country list, city suggestions, choose how many (1–50)

**Prompt:** "While using the app I realised we need a list of countries, then cities, and to choose how many businesses I see — anywhere from 1 to 50, not always 10."

**What I built:**
- `api/_lib/countries.ts`: 21 countries (Kazakhstan, most of Europe, Georgia, Turkey, UAE, Malaysia), each with a default data source and suggested cities. Kazakhstan uses 2GIS; the rest use Google.
- Search form: **Country** dropdown, then **City** with suggestions for that country (any city can still be typed), then category, **How many (1–50)**, and language. In Live mode it shows an estimate of the paid API requests before you search.
- **Paging on the server:**
  - Google returns up to 20 per request and at most 60 per query, so asking for 45 means 3 requests, with the last one asking for exactly 5.
  - The 2GIS demo key allows **10 per page and at most 5 pages**, which I found by testing the real API (`page_size` 20 → HTTP 400). So 50 results means 5 requests.
  - Both limits can be raised with env vars for a paid key.
- Google queries now include the country ("barbershops in Kraków, Poland") plus `regionCode`, which avoids results from a same-named city elsewhere. I checked this with a real request.
- 3 new unit tests for paging (31 total).

**What went wrong / surprises:**
- The demo key's limits weren't in the docs I read. A real request told me ("Length of parameter 'page_size' should be from 1 to 10"). The real-key tests keep paying off.
- The client-side session cache key didn't include the country or the count. The same search with a different count would have shown stale results. Fixed.

---

## Step 11 — Faster city picker + business category list

**Prompt:** "The cities list is lagging, and add a list of business categories."

**What I built:**
- Replaced the native `<datalist>` with a small custom **Combobox** component.
  - Clicking it shows the whole list immediately. With a value already filled in, `<datalist>` on macOS showed only that one match, so it felt stuck.
  - Typing filters as you go. Matching ignores accents and case, so "krakow" finds "Kraków", and names that start with your text come first.
  - Full keyboard support (↑ ↓ Enter Esc) and proper ARIA roles.
  - Measured in a test browser: typing feels instant (about 40 ms for 6 keystrokes).
- **45 business categories** in 9 groups (beauty, health, sport, food, shops, auto, services, education, stay), each shown with its Russian name. You can still type your own.
- **Smarter queries:** for 2GIS the app sends the Russian term ("барбершоп"), because 2GIS's catalogue is Russian-first. Google gets the English one. Custom text is sent unchanged. 2 new tests (33 total).

**What went wrong / surprises:**
- The dev server had stopped between sessions, so my first test run failed with "connection refused", not because of a code bug. I restarted it and the tests passed.
