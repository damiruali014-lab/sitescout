-- SiteScout · richer demo websites: store the edited site copy (tagline, about, highlights, services, CTA).
-- Business facts (name, phone, hours, rating) are still fetched live — only MY written content is stored.
alter table public.demo_pages add column if not exists content jsonb;
