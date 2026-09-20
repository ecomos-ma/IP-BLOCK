-- Migration 004: Custom IP Block Screen Settings
-- Run in Supabase SQL Editor if you want native columns on the stores table.

alter table public.stores add column if not exists block_message text;
alter table public.stores add column if not exists block_image_url text;
