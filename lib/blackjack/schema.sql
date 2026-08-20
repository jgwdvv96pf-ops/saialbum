-- Run this once in Neon's SQL Editor, same as the other schema files.
-- References users(id) from lib/earn/schema.sql — blackjack chip
-- balance IS users.balance, not a separate currency.

create table if not exists blackjack_rooms (
  id uuid primary key default gen_random_uuid(),
  -- short, shareable code like "AB7K2" — what actually shows in the URL
  code text unique not null,
  host_user_id uuid not null references users(id),
  status text not null default 'waiting' check (status in ('waiting', 'in_round', 'closed')),
  created_at timestamptz not null default now()
);

create index if not exists blackjack_rooms_code_idx on blackjack_rooms(code);

create table if not exists blackjack_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references blackjack_rooms(id) on delete cascade,
  user_id uuid not null references users(id),
  display_name text not null,
  seat_index integer not null,
  left_at timestamptz,
  created_at timestamptz not null default now(),
  unique (room_id, user_id),
  unique (room_id, seat_index)
);

create index if not exists blackjack_players_room_id_idx on blackjack_players(room_id);

create table if not exists blackjack_rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references blackjack_rooms(id) on delete cascade,
  -- 'betting' -> 'dealing' -> 'player_turns' -> 'dealer_turn' -> 'resolved'
  status text not null default 'betting',
  -- server-only remaining shoe — never sent to the client
  deck jsonb not null default '[]',
  dealer_hand jsonb not null default '[]',
  dealer_hole_revealed boolean not null default false,
  -- whose turn it is, by seat_index — null once player_turns is done
  turn_seat_index integer,
  dealer_message text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists blackjack_rounds_room_id_idx on blackjack_rounds(room_id);

create table if not exists blackjack_hands (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references blackjack_rounds(id) on delete cascade,
  player_id uuid not null references blackjack_players(id) on delete cascade,
  cards jsonb not null default '[]',
  bet integer not null,
  doubled boolean not null default false,
  -- 'active' -> 'stood' | 'bust' | 'blackjack' -> resolved into result
  status text not null default 'active',
  result text, -- 'win' | 'lose' | 'push' | 'blackjack_win'
  payout integer,
  created_at timestamptz not null default now(),
  unique (round_id, player_id)
);

create index if not exists blackjack_hands_round_id_idx on blackjack_hands(round_id);
