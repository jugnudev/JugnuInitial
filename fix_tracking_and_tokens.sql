-- Fix tracking: add date column & refresh PostgREST cache
create extension if not exists pgcrypto;

create table if not exists public.sponsor_metrics_daily (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null,
  placement text not null,
  date date not null,                              -- REQUIRED BY SELF-TEST
  raw_impressions integer not null default 0,
  billable_impressions integer not null default 0,
  clicks integer not null default 0,
  created_at timestamptz not null default now()
);

-- If a legacy column 'day' exists but 'date' does not, rename it:
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='sponsor_metrics_daily' and column_name='day'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='sponsor_metrics_daily' and column_name='date'
  ) then
    alter table public.sponsor_metrics_daily rename column "day" to "date";
  end if;
end$$;

-- Useful uniqueness guard for upserts:
create unique index if not exists sponsor_metrics_daily_unique_idx
  on public.sponsor_metrics_daily (campaign_id, placement, date);

-- Fix portal tokens: ensure table shape
create table if not exists public.sponsor_portal_tokens (
  id uuid primary key default gen_random_uuid(),    -- canonical key used by URLs
  campaign_id uuid not null,
  token text,                                       -- LEGACY HEX (optional)
  expires_at timestamptz not null default now() + interval '30 days',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists sponsor_portal_tokens_campaign_idx
  on public.sponsor_portal_tokens(campaign_id);

-- Make PostgREST see the new columns immediately
select pg_notify('pgrst','reload schema');