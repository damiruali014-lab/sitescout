-- SiteScout · demo landing pages
-- Run in Supabase → SQL Editor (or `supabase db push`).
-- Stores ONLY the provider ID + my own content. Business details are fetched fresh at view time.

create table if not exists public.demo_pages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  slug        text not null unique check (slug ~ '^[a-z0-9-]{6,80}$'),
  source      text not null check (source in ('google', '2gis')),
  source_id   text not null,
  lang        text not null default 'en' check (lang in ('en', 'ru', 'kk')),
  description text not null check (char_length(description) <= 600),
  cta         text check (char_length(cta) <= 120),
  views       integer not null default 0,
  last_viewed_at timestamptz,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz default (now() + interval '60 days')
);

create index if not exists demo_pages_user_idx on public.demo_pages (user_id, created_at desc);

alter table public.demo_pages enable row level security;

-- Only the owner can see/create/edit/delete their pages from the browser.
-- The public /p/:slug page is served by /api/page with the service-role key.
drop policy if exists "owner manages own demo pages" on public.demo_pages;
create policy "owner manages own demo pages" on public.demo_pages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- View counter, callable only by the service role (used by /api/page).
create or replace function public.increment_demo_view(p_slug text)
returns void language sql security definer set search_path = public as $$
  update public.demo_pages set views = views + 1, last_viewed_at = now() where slug = p_slug;
$$;
revoke all on function public.increment_demo_view(text) from public, anon, authenticated;
grant execute on function public.increment_demo_view(text) to service_role;
