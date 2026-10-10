# SiteScout

**Find small businesses that need a website → check their site → score the lead → generate a demo landing page and a personal outreach message → track the conversation.**

Built by [Damir Uali](https://damiruali014-lab.github.io). The full "how I built it" story is in [BUILD_LOG.md](./BUILD_LOG.md).

- **Search** with official APIs only: Google Places API (New) Text Search, and the 2GIS Catalog API for Kazakhstan.
- **Website check** (homepage only, short timeout): none / unreachable / no HTTPS / not mobile-friendly / OK.
- **Lead score** from 0 to 100, with reasons, plus filter and sort.
- **Demo landing page** with a shareable link (`/p/:slug`) in EN/RU/KK, clearly labelled as a concept preview.
- **Outreach message** for WhatsApp, Instagram or email in EN/RU/KK, always with an opt-out line. You send it yourself.
- **Lead tracker** (new → contacted → replied → won / lost) behind your login.
- **Demo mode**: the whole flow works with no keys and no login, using fictional sample data. Built for an iframe at 360 px.

Stack: React 19 + Vite 8 + TypeScript · Vercel Functions (`/api`) · Supabase (Auth + Postgres + RLS) · Claude API (Haiku).

---

## 1. Run locally

```bash
npm install
npm run dev          # http://localhost:5173 — Demo mode works immediately
```

`npm run dev` also serves the `/api/*.ts` functions locally (see `vite.api-dev.ts`), so you don't need `vercel dev`.

Other scripts:

```bash
npm run build        # type-check (app + api) and build
npm run lint         # oxlint, warnings fail
npm test             # unit tests (scoring, SSRF guard, outreach templates)
```

To try live mode locally, copy `.env.example` → `.env.local` and fill in the keys. Set `DEV_SKIP_AUTH=1` to skip the login check on `/api` while developing. Vercel always ignores this setting.

## 2. Keys: where to get them and what they cost

| Variable | Where | Cost (Oct 2026) |
|---|---|---|
| `GOOGLE_PLACES_API_KEY` | [Google Cloud Console](https://console.cloud.google.com) → enable **Places API (New)** → Credentials → API key. **API restrictions: Places API (New) only.** Leave application restrictions on "None" (server-side key). | Search uses **Text Search Enterprise**: 1,000 free requests/month, then ~$35 per 1,000 (each request returns up to 20 places). Place Details Pro: 5,000 free/month, then ~$17 per 1,000. Set a **daily quota** and a **budget alert**. |
| `DGIS_API_KEY` | [platform.2gis.ru](https://platform.2gis.ru) → create a demo key | The demo key is free for testing. Production pricing is a quote from 2GIS. Ask them to enable `contact_groups` (phones/websites). |
| `ANTHROPIC_API_KEY` | [platform.claude.com](https://platform.claude.com) → API Keys | Claude Haiku 5.5, from $0.10 / $0.50 per million input/output tokens, so one message costs a fraction of a cent. Set a spend limit. `ANTHROPIC_MODEL` is optional. |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API | Free plan. The anon key is public by design; RLS protects the data. |
| `SUPABASE_SERVICE_ROLE_KEY` | same page | **Server only.** Never give it a `VITE_` prefix. |
| `ALLOWED_EMAIL` | your login email | Only this account can call the paid endpoints. |
| `IG_USER_ID`, `IG_ACCESS_TOKEN` (optional) | Meta developer app, see **Instagram check** below | Free (Graph API rate limits apply). |

**OpenStreetMap** needs no key: Nominatim finds the city and Overpass finds the businesses. Both are free public services with fair-use limits, so results are cached for 30 minutes. It's the default source for European countries.

API keys never reach the browser: every provider call goes through `/api/*`.

## 3. Supabase setup (about 5 minutes)

1. Create a project, then open **SQL Editor** and run every file in `supabase/migrations/` in order (001 → 005). Paste the SQL itself, not the file name.
2. **Authentication → Users → Add user**: create your own email + password.
3. **Authentication → Sign In / Providers**: turn **off** "Allow new users to sign up".
4. **Authentication → URL Configuration**: set the Site URL to your Vercel URL.

## 4. Deploy to Vercel

1. Push this repo to GitHub, then on Vercel choose **Add New → Project → Import**. The Vite framework is auto-detected.
2. Add the environment variables from step 2 (Production + Preview).
3. Deploy. If the variables are missing, the site still works in Demo mode.

## Instagram check (optional, ~20 min)

The lead page can read the **website in a business's Instagram bio** through the official Graph API ([Business Discovery](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/business-discovery)). It only works for public Business/Creator accounts.

1. Switch your own Instagram to a **Professional** account and link it to a **Facebook Page**.
2. At [developers.facebook.com](https://developers.facebook.com), create an app (type **Business**) and add **Instagram → API setup with Facebook login**.
3. In **Graph API Explorer**, pick your app and grant `instagram_basic`, `instagram_manage_insights` and `pages_show_list`/`pages_read_engagement`. Generate a token, then exchange it for a **long-lived token** (60 days) in the Access Token Debugger.
4. Run `me/accounts?fields=instagram_business_account` in the Explorer. The `instagram_business_account.id` (starts with `1784…`) is `IG_USER_ID`.
5. Put `IG_USER_ID` and `IG_ACCESS_TOKEN` in Vercel → Environment Variables (and `.env.local`), then redeploy. The token expires after about 60 days; the page tells you when.

Without it, the lead page shows an **Open profile** button so you can look at the bio yourself.

## 5. Embed on the portfolio (Live Stage)

```html
<iframe
  src="https://YOUR-APP.vercel.app/?embed=1"
  title="SiteScout — live demo"
  style="width:100%;max-width:420px;height:720px;border:0;border-radius:16px"
  loading="lazy"
></iframe>
```

- `?embed=1` forces Demo mode, hides the footer and adds an "Open ↗" link. `?theme=dark` or `?theme=light` sets the theme.
- `vercel.json` only allows framing from `damiruali014-lab.github.io` (`frame-ancestors`). Edit it if your portfolio domain changes.

## 6. Terms, privacy and safety

- **Official APIs only**: no scraping. Results are cached for 10 minutes on the server and for the current browser tab only.
- **Google Maps Platform terms** allow storing place IDs, but not names, phones or ratings. So the database keeps IDs plus *your* data (status, notes, AI text, website verdict), and details are fetched fresh when shown. 2GIS data is handled the same way. Data is attributed ("© Google" / "© 2GIS").
- **Demo pages** carry a "concept preview by Damir Uali, not the official website" banner, `noindex`, and expire after 60 days. The view counter shows when an owner opened the link.
- **Outreach**: the AI may only use real facts. Every message ends with an opt-out line, and nothing is sent automatically. For EU leads (e.g. Kraków), contact businesses on their published business channels and honour opt-outs right away.
- **Website checker**: homepage only, an identifying User-Agent, private/metadata IPs refused (SSRF guard), at most 4 redirects, 256 KB read limit.

## Project structure

```
api/                 Vercel Functions (web-standard Request → Response)
  _lib/              shared server code + types (imported by the app too)
  search.ts check.ts describe.ts message.ts details.ts page.ts health.ts
src/
  pages/             Search, Lead, Tracker, Login, public DemoLanding
  components/        cards, badges, demo-page + message + tracker cards
  lib/               demo data, stores, API client, i18n, templates
supabase/migrations/ SQL with RLS
```

## Next ideas

- Per-page Open Graph previews for `/p/:slug` (needs a small server-rendered route).
- Photos on demo pages (Places Photos, more expensive SKU).
- Scheduled follow-up reminders.
