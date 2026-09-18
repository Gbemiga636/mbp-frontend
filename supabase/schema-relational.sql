-- MBP Lingerie — additive relational schema (non-destructive)
-- Run in Supabase SQL Editor after mbp_kv already exists.
-- Does NOT drop or alter mbp_kv.

create table if not exists public.mbp_categories (
  id text primary key,
  slug text unique not null,
  name text not null,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.mbp_collections (
  id text primary key,
  slug text unique not null,
  name text not null,
  description text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.mbp_products (
  id text primary key,
  category_id text references public.mbp_categories(id) on delete set null,
  name text not null,
  price numeric not null default 0,
  sale_price numeric,
  description text default '',
  image text default '',
  image_back text default '',
  images jsonb not null default '[]'::jsonb,
  sizes jsonb not null default '[]'::jsonb,
  colors jsonb not null default '[]'::jsonb,
  badges jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  sku text default '',
  stock int,
  sold_out boolean not null default false,
  materials text default '',
  care text default '',
  slug text,
  seo_title text default '',
  seo_description text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mbp_orders (
  id text primary key,
  reference text unique not null,
  customer jsonb not null default '{}'::jsonb,
  totals jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  notes text default '',
  admin_notes text default '',
  paystack jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mbp_order_items (
  id text primary key,
  order_id text not null references public.mbp_orders(id) on delete cascade,
  product_id text,
  name text not null,
  size text default '',
  color text default '',
  qty int not null default 1,
  unit_price numeric not null default 0,
  image text default ''
);

create table if not exists public.mbp_promotions (
  id text primary key,
  code text unique not null,
  type text not null default 'percent',
  value numeric not null default 0,
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit int,
  min_order numeric default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.mbp_analytics_events (
  id text primary key,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists mbp_analytics_events_type_idx on public.mbp_analytics_events(type);
create index if not exists mbp_analytics_events_created_idx on public.mbp_analytics_events(created_at desc);
create index if not exists mbp_orders_created_idx on public.mbp_orders(created_at desc);
create index if not exists mbp_products_category_idx on public.mbp_products(category_id);

create table if not exists public.mbp_reviews (
  id text primary key,
  product_id text not null,
  rating int not null check (rating between 1 and 5),
  body text not null default '',
  author_name text default '',
  author_email text default '',
  approved boolean not null default false,
  helpful int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.mbp_profiles (
  id uuid primary key,
  email text unique,
  full_name text default '',
  phone text default '',
  addresses jsonb not null default '[]'::jsonb,
  wishlist jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.mbp_subscribers (
  email text primary key,
  created_at timestamptz not null default now()
);

-- Seed default categories if empty
insert into public.mbp_categories (id, slug, name, sort)
values
  ('lingerie', 'lingerie', 'Lingerie', 1),
  ('underwear', 'underwear', 'Underwear', 2),
  ('nightwear', 'nightwear', 'Nightwear', 3),
  ('pyjamas', 'pyjamas', 'Pyjamas', 4)
on conflict (id) do nothing;
