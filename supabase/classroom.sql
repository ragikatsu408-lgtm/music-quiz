-- Класс: викторины учителя, комнаты с кодом, попытки учеников.
-- Запустите после scores.sql в SQL Editor.

create table if not exists public.classroom_quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  questions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.classroom_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  quiz_id uuid references public.classroom_quizzes (id) on delete set null,
  mode text not null default 'custom',
  title text not null default 'Викторина',
  snapshot jsonb,
  status text not null default 'live',
  created_at timestamptz not null default now()
);

create table if not exists public.classroom_attempts (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.classroom_rooms (id) on delete cascade,
  player text not null default 'Игрок',
  score integer not null default 0,
  total integer not null default 1,
  percent integer not null default 0,
  time_spent_ms integer not null default 0,
  missed jsonb not null default '[]'::jsonb,
  answers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.classroom_quizzes enable row level security;
alter table public.classroom_rooms enable row level security;
alter table public.classroom_attempts enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.classroom_quizzes to anon, authenticated;
grant select, insert, update, delete on public.classroom_rooms to anon, authenticated;
grant select, insert, update, delete on public.classroom_attempts to anon, authenticated;

drop policy if exists "classroom quizzes open" on public.classroom_quizzes;
create policy "classroom quizzes open" on public.classroom_quizzes
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "classroom rooms open" on public.classroom_rooms;
create policy "classroom rooms open" on public.classroom_rooms
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "classroom attempts open" on public.classroom_attempts;
create policy "classroom attempts open" on public.classroom_attempts
  for all to anon, authenticated using (true) with check (true);
