-- Additive production schema for tenant metadata, licenses, and audit history.
alter table public.stores add column if not exists name text;
alter table public.stores add column if not exists domain text;
alter table public.stores add column if not exists verified_at timestamptz;
alter table public.stores add column if not exists public_store_id uuid default gen_random_uuid();
alter table public.stores add column if not exists updated_at timestamptz not null default now();
update public.stores set public_store_id=gen_random_uuid() where public_store_id is null;
create unique index if not exists stores_public_store_id_idx on public.stores(public_store_id);
create index if not exists stores_owner_idx on public.stores(owner_id);

create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 email text not null,
 role text not null default 'owner' check(role in ('owner','admin')),
 created_at timestamptz not null default now()
);
create table if not exists public.licenses (
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null unique references public.stores(id) on delete cascade,
 status text not null default 'active' check(status in ('active','suspended','expired')),
 starts_at timestamptz not null default now(),
 expires_at timestamptz,
 plan text not null default 'manual'
);
create table if not exists public.audit_logs (
 id uuid primary key default gen_random_uuid(),
 store_id uuid references public.stores(id) on delete cascade,
 actor_id uuid references auth.users(id) on delete set null,
 action text not null,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index if not exists audit_logs_store_created_idx on public.audit_logs(store_id,created_at desc);
alter table public.profiles enable row level security;
alter table public.licenses enable row level security;
alter table public.audit_logs enable row level security;
-- The application uses verified server-side ownership checks and service-role writes.
-- Keep these tables inaccessible through the public Data API by default.