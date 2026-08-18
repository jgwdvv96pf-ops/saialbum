-- Run this once in Neon's SQL Editor (same as lib/earn/schema.sql).

create table if not exists page_views (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null,
  ip text,
  path text not null,
  referrer text,
  user_agent text,
  country text,
  city text,
  created_at timestamptz not null default now()
);

create index if not exists page_views_ip_idx on page_views(ip);
create index if not exists page_views_visitor_id_idx on page_views(visitor_id);
create index if not exists page_views_created_at_idx on page_views(created_at);
create index if not exists page_views_path_idx on page_views(path);
