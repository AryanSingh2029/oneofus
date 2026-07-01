create extension if not exists pgcrypto;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[0-9]{6}$'),
  game_id text not null check (game_id in ('word-match', 'picture-match', 'question-match', 'mafia')),
  status text not null default 'lobby' check (status in ('lobby', 'reveal', 'discussion', 'voting', 'result', 'ended')),
  host_player_id uuid,
  host_token text not null,
  settings jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null default (now() + interval '12 minutes'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rooms
add column if not exists expires_at timestamptz;

update public.rooms
set expires_at = created_at + interval '12 minutes'
where expires_at is null;

alter table public.rooms
alter column expires_at set default (now() + interval '12 minutes');

alter table public.rooms
alter column expires_at set not null;

create table if not exists public.room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 32),
  player_token text not null,
  is_host boolean not null default false,
  is_connected boolean not null default true,
  is_alive boolean not null default true,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (room_id, player_token)
);

create table if not exists public.rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  round_number integer not null default 1,
  phase text not null default 'setup',
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.round_assignments (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  player_id uuid not null references public.room_players(id) on delete cascade,
  role text not null,
  secret text,
  secret_image text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (round_id, player_id)
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  voter_player_id uuid not null references public.room_players(id) on delete cascade,
  target_player_id uuid not null references public.room_players(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (round_id, voter_player_id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists rooms_set_updated_at on public.rooms;
create trigger rooms_set_updated_at
before update on public.rooms
for each row execute function public.set_updated_at();

drop trigger if exists room_players_set_updated_at on public.room_players;
create trigger room_players_set_updated_at
before update on public.room_players
for each row execute function public.set_updated_at();

drop trigger if exists rounds_set_updated_at on public.rounds;
create trigger rounds_set_updated_at
before update on public.rounds
for each row execute function public.set_updated_at();

alter table public.rooms enable row level security;
alter table public.room_players enable row level security;
alter table public.rounds enable row level security;
alter table public.round_assignments enable row level security;
alter table public.votes enable row level security;

drop policy if exists "rooms are readable by room code" on public.rooms;
create policy "rooms are readable by room code"
on public.rooms for select
to anon
using (true);

drop policy if exists "rooms can be created by anyone" on public.rooms;
create policy "rooms can be created by anyone"
on public.rooms for insert
to anon
with check (true);

drop policy if exists "rooms can be updated by host token" on public.rooms;
create policy "rooms can be updated by host token"
on public.rooms for update
to anon
using (true)
with check (true);

drop policy if exists "players are readable by room members" on public.room_players;
create policy "players are readable by room members"
on public.room_players for select
to anon
using (true);

drop policy if exists "players can join rooms" on public.room_players;
create policy "players can join rooms"
on public.room_players for insert
to anon
with check (
  exists (
    select 1
    from public.rooms
    where rooms.id = room_players.room_id
      and rooms.status = 'lobby'
  )
);

drop policy if exists "players can update themselves" on public.room_players;
create policy "players can update themselves"
on public.room_players for update
to anon
using (true)
with check (true);

drop policy if exists "rounds are readable" on public.rounds;
create policy "rounds are readable"
on public.rounds for select
to anon
using (true);

drop policy if exists "rounds can be created" on public.rounds;
create policy "rounds can be created"
on public.rounds for insert
to anon
with check (true);

drop policy if exists "rounds can be updated" on public.rounds;
create policy "rounds can be updated"
on public.rounds for update
to anon
using (true)
with check (true);

drop policy if exists "votes are readable" on public.votes;
create policy "votes are readable"
on public.votes for select
to anon
using (true);

drop policy if exists "votes can be created" on public.votes;
create policy "votes can be created"
on public.votes for insert
to anon
with check (true);

grant usage on schema public to anon;

revoke all on public.rooms from anon;
revoke all on public.room_players from anon;
revoke all on public.rounds from anon;
revoke all on public.round_assignments from anon;
revoke all on public.votes from anon;

grant select (
  id,
  code,
  game_id,
  status,
  host_player_id,
  settings,
  expires_at,
  created_at,
  updated_at
) on public.rooms to anon;

grant select (
  id,
  room_id,
  name,
  is_host,
  is_connected,
  is_alive,
  joined_at,
  updated_at
) on public.room_players to anon;

grant select (
  id,
  room_id,
  round_number,
  phase,
  created_at,
  updated_at
) on public.rounds to anon;
grant select (
  id,
  round_id,
  voter_player_id,
  target_player_id,
  created_at
) on public.votes to anon;

create index if not exists rooms_expires_at_idx on public.rooms(expires_at);

do $$
begin
  if exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'rooms'
  ) then
    alter publication supabase_realtime drop table public.rooms;
  end if;

  if exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'room_players'
  ) then
    alter publication supabase_realtime drop table public.room_players;
  end if;

  if exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'rounds'
  ) then
    alter publication supabase_realtime drop table public.rounds;
  end if;
end;
$$;
