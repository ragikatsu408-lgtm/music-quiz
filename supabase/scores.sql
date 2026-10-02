-- Таблица результатов викторины. Запустите в SQL Editor проекта Supabase.

create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  player text not null default 'Игрок',
  score integer not null,
  total integer not null,
  created_at timestamptz not null default now(),
  constraint scores_score_nonneg check (score >= 0),
  constraint scores_total_positive check (total > 0)
);

alter table public.scores enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert on table public.scores to anon, authenticated;

drop policy if exists "anon can insert scores" on public.scores;
create policy "anon can insert scores"
  on public.scores
  for insert
  to anon, authenticated
  with check (true);

-- Нужно для таблицы лидеров: без SELECT политика скрывает все строки или даёт permission denied.
drop policy if exists "anon can read scores" on public.scores;
create policy "anon can read scores"
  on public.scores
  for select
  to anon, authenticated
  using (true);
