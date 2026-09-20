-- Migration 003: YouCan Remote Code Management tables
-- Run AFTER 001_schema.sql and 002_saas_tables.sql
-- Safe to run multiple times (IF NOT EXISTS / IF EXISTS guards)

-- ─── Store enhancements ───────────────────────────────────────────────────────
alter table public.stores add column if not exists name text;
alter table public.stores add column if not exists description text;
alter table public.stores add column if not exists verification_token text;
alter table public.stores add column if not exists verified_at timestamptz;

-- ─── Code documents (header / footer / custom modules) ────────────────────────
create table if not exists public.code_documents (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  -- Human label shown in UI
  name text not null,
  -- doc_type: header_css | header_js | footer_css | footer_js | module_css | module_js | module_html
  doc_type text not null check (doc_type in (
    'header_css','header_js','footer_css','footer_js',
    'module_css','module_js','module_html','critical_css'
  )),
  -- Draft is what the editor saves; published is what the last release captured
  draft_content text not null default '',
  published_content text not null default '',
  -- Whether this document is included in new releases
  enabled boolean not null default true,
  -- Execution phase within the loader
  execution_phase text not null default 'main' check (execution_phase in (
    'critical','main','header','footer','async'
  )),
  -- Page targeting
  page_target text not null default 'all' check (page_target in (
    'all','home','product','collection','cart','confirmation','pattern'
  )),
  page_pattern text,
  -- Lower number = earlier load
  priority int not null default 50,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists code_documents_store_idx on public.code_documents(store_id);
alter table public.code_documents enable row level security;

-- ─── Releases ─────────────────────────────────────────────────────────────────
create table if not exists public.releases (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  version_number int not null,
  published_by uuid references auth.users(id) on delete set null,
  published_at timestamptz not null default now(),
  is_active boolean not null default false,
  notes text not null default '',
  -- JSONB manifest: {criticalCss, mainCssHash, headerJsHash, footerJsHash, modules:[]}
  manifest jsonb not null default '{}'::jsonb,
  unique(store_id, version_number)
);
create index if not exists releases_store_active_idx on public.releases(store_id, is_active);
alter table public.releases enable row level security;

-- ─── Release assets (immutable blobs by content hash) ────────────────────────
create table if not exists public.release_assets (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  release_id uuid not null references public.releases(id) on delete cascade,
  asset_type text not null check (asset_type in ('css','js','html','json')),
  content_hash text not null,  -- sha256 hex prefix (12 chars)
  content text not null,
  content_length int not null,
  created_at timestamptz not null default now(),
  unique(store_id, content_hash)
);
create index if not exists release_assets_store_hash_idx on public.release_assets(store_id, content_hash);
alter table public.release_assets enable row level security;

-- ─── Customer block rules ─────────────────────────────────────────────────────
create table if not exists public.customer_rules (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  -- rule_type: phone | name | address | address_contains
  rule_type text not null check (rule_type in ('phone','name','address','address_contains')),
  -- Raw value as entered
  value text not null,
  -- Normalized value for matching (lowercased, phone formatted)
  normalized_value text not null,
  enabled boolean not null default true,
  reason text not null default '',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_rule_value_not_empty check (length(trim(value)) > 0)
);
create index if not exists customer_rules_store_idx on public.customer_rules(store_id, enabled);
alter table public.customer_rules enable row level security;

-- ─── Audit log actions ────────────────────────────────────────────────────────
-- (table already created in 002; just add index if missing)
create index if not exists audit_logs_actor_idx on public.audit_logs(actor_id, created_at desc);

-- ─── Helper: bump updated_at on code_documents ───────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists code_documents_updated_at on public.code_documents;
create trigger code_documents_updated_at
  before update on public.code_documents
  for each row execute function public.set_updated_at();

drop trigger if exists customer_rules_updated_at on public.customer_rules;
create trigger customer_rules_updated_at
  before update on public.customer_rules
  for each row execute function public.set_updated_at();
