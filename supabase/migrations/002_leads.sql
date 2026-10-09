-- SiteScout · lead tracker
-- Stores the provider ID + MY data only (status, notes, dates, my website verdict, my score).
-- Names/phones are re-read from Google/2GIS when shown (Google allows storing place IDs only).

create table if not exists public.leads (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  source          text not null check (source in ('google', '2gis')),
  source_id       text not null,
  status          text not null default 'new' check (status in ('new', 'contacted', 'replied', 'won', 'lost')),
  notes           text not null default '' check (char_length(notes) <= 4000),
  last_contact_at timestamptz,
  site_status     text check (site_status in ('none', 'unreachable', 'no_https', 'no_viewport', 'ok')),
  score           smallint check (score between 0 and 100),
  demo_slug       text,
  search_city     text check (char_length(search_city) <= 80),
  search_category text check (char_length(search_category) <= 80),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, source, source_id)
);

create index if not exists leads_user_status_idx on public.leads (user_id, status, updated_at desc);

alter table public.leads enable row level security;

drop policy if exists "owner manages own leads" on public.leads;
create policy "owner manages own leads" on public.leads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists leads_touch on public.leads;
create trigger leads_touch before update on public.leads
  for each row execute function public.touch_updated_at();
