-- MBP Lingerie — Supabase schema
-- Run this in Supabase Dashboard → SQL Editor

create table if not exists public.mbp_kv (
  k text primary key,
  v jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists mbp_kv_updated_at_idx on public.mbp_kv (updated_at desc);

alter table public.mbp_kv enable row level security;

-- Public read for storefront content keys only (optional; API uses service role)
create policy "Public read content keys"
  on public.mbp_kv for select
  using (k in ('home', 'store', 'gallery', 'settings', 'content'));

-- Storage bucket for product/media uploads (create in Dashboard → Storage if script fails)
insert into storage.buckets (id, name, public)
values ('mbp', 'mbp', true)
on conflict (id) do update set public = true;

create policy "Public read mbp bucket"
  on storage.objects for select
  using (bucket_id = 'mbp');

create policy "Service role write mbp bucket"
  on storage.objects for insert
  with check (bucket_id = 'mbp');

create policy "Service role update mbp bucket"
  on storage.objects for update
  using (bucket_id = 'mbp');

create policy "Service role delete mbp bucket"
  on storage.objects for delete
  using (bucket_id = 'mbp');
