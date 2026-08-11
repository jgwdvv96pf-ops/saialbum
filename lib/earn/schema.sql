-- Run this once in Neon's SQL Editor (or `psql $DATABASE_URL -f this-file`).
-- Not wired into a migration runner yet — deliberately manual for now,
-- same "run it yourself once" spirit as the Discord webhook setup.

create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  -- external_id is a Firebase UID once auth is wired in. For now it's
  -- a random id stored in an anonymous browser cookie — same column,
  -- swapping the source later is a one-line change, not a schema change.
  external_id text unique not null,
  email text,
  gcash_number text,
  balance integer not null default 0,
  spin_credits integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists spins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  prize_id text not null,
  prize_label text not null,
  points integer not null,
  created_at timestamptz not null default now()
);

create index if not exists spins_user_id_idx on spins(user_id);

create table if not exists ad_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  -- PLACEHOLDER: verified is always true for now since there's no
  -- real ad network postback yet. Once wired up, this row gets
  -- inserted (or flipped to verified) only from the network's S2S
  -- callback, never from the client directly.
  verified boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  kind text not null check (kind in ('cash', 'item')),
  points_cost integer not null,
  payout_php numeric,
  item_label text,
  gcash_number text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'paid')),
  discord_message_id text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists redemptions_user_id_idx on redemptions(user_id);
create index if not exists redemptions_status_idx on redemptions(status);
