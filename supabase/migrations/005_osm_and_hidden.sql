-- SiteScout · step 17–19
-- 1) Allow OpenStreetMap leads in the tracker and on demo pages.
-- 2) "Hidden" businesses: ones I've marked as already having a website. Stores only the provider
--    key + MY verdict (and the website I found, e.g. in their Instagram bio) — never Google data.

alter table public.leads drop constraint if exists leads_source_check;
alter table public.leads add constraint leads_source_check check (source in ('google', '2gis', 'osm'));
alter table public.demo_pages drop constraint if exists demo_pages_source_check;
alter table public.demo_pages add constraint demo_pages_source_check check (source in ('google', '2gis', 'osm'));

create table if not exists public.hidden_places (
  key        text primary key check (char_length(key) <= 320),          -- e.g. google:ChIJ…, osm:node/123
  reason     text not null default 'has_website' check (reason in ('has_website', 'not_interested', 'chain')),
  website    text check (char_length(website) <= 500),                    -- what I found (Instagram bio, Google…)
  found_via  text check (found_via in ('manual', 'instagram', 'google', 'osm')),
  created_at timestamptz not null default now()
);
alter table public.hidden_places enable row level security;
-- No policies: only the server (service role) reads/writes it, behind the owner login.
