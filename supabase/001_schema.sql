-- Run in Supabase SQL Editor. Private API uses service role server-side only.
create extension if not exists pgcrypto;
create table if not exists public.stores (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 hostname text not null unique,
 status text not null default 'active' check(status in ('active','suspended')),
 license_expires_at timestamptz,
 created_at timestamptz not null default now()
);
create table if not exists public.ip_rules (
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.stores(id) on delete cascade,
 ip inet not null,
 enabled boolean not null default true,
 starts_at timestamptz not null default now(),
 expires_at timestamptz,
 note varchar(250) not null default '',
 created_at timestamptz not null default now(),
 unique(store_id,ip),
 constraint expires_after_start check(expires_at is null or expires_at > starts_at)
);
create index if not exists ip_rules_lookup on public.ip_rules(store_id,ip) where enabled;
alter table public.stores enable row level security;
alter table public.ip_rules enable row level security;
-- No public grants or RLS policies: user-specific APIs verify ownership before using service role.
-- Never put SUPABASE_SERVICE_ROLE_KEY in NEXT_PUBLIC vars or the YouCan snippet.
