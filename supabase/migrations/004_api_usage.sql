-- SiteScout · usage meter: one row per paid API request made by the app (Google, 2GIS, Claude).
-- Written and read only by the server with the service-role key (RLS on, no policies = no browser access).
create table if not exists public.api_usage (
  id         bigserial primary key,
  sku        text not null,
  units      integer not null default 1 check (units > 0),
  created_at timestamptz not null default now()
);
create index if not exists api_usage_created_idx on public.api_usage (created_at desc);
alter table public.api_usage enable row level security;
