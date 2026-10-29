-- MBP Lingerie — namespaced schema for a shared Supabase project
-- Paste into SQL Editor → Run. Safe to re-run.

create table if not exists public.mbp_kv (
  k text primary key,
  v jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists mbp_kv_k_idx on public.mbp_kv (k);
create index if not exists mbp_kv_updated_at_idx on public.mbp_kv (updated_at desc);
create index if not exists mbp_kv_v_gin_idx on public.mbp_kv using gin (v);

alter table public.mbp_kv enable row level security;

drop policy if exists "Public read content keys" on public.mbp_kv;
drop policy if exists mbp_kv_public_read_content on public.mbp_kv;
create policy mbp_kv_public_read_content
  on public.mbp_kv for select
  using (k in ('home', 'store', 'gallery', 'settings', 'content', 'promotions'));

insert into storage.buckets (id, name, public, file_size_limit)
values ('mbp', 'mbp', true, 52428800)
on conflict (id) do update set public = true;

drop policy if exists "Public read mbp bucket" on storage.objects;
drop policy if exists "Service role write mbp bucket" on storage.objects;
drop policy if exists "Service role update mbp bucket" on storage.objects;
drop policy if exists "Service role delete mbp bucket" on storage.objects;
drop policy if exists mbp_storage_public_read on storage.objects;
drop policy if exists mbp_storage_insert on storage.objects;
drop policy if exists mbp_storage_update on storage.objects;
drop policy if exists mbp_storage_delete on storage.objects;

create policy mbp_storage_public_read
  on storage.objects for select
  using (bucket_id = 'mbp');

create policy mbp_storage_insert
  on storage.objects for insert
  with check (bucket_id = 'mbp');

create policy mbp_storage_update
  on storage.objects for update
  using (bucket_id = 'mbp');

create policy mbp_storage_delete
  on storage.objects for delete
  using (bucket_id = 'mbp');
