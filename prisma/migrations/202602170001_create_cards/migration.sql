create extension if not exists pgcrypto;

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id text not null,
  status text not null default 'not-finalized' check (status in ('not-finalized', 'finalized')),
  finalized_at timestamptz,
  profile_snapshot jsonb not null,
  generation_meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cards_user_id_created_at_idx on public.cards (user_id, created_at desc);
create index if not exists cards_template_id_idx on public.cards (template_id);

alter table public.cards enable row level security;

drop policy if exists "Users can view own cards" on public.cards;
create policy "Users can view own cards"
  on public.cards
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own cards" on public.cards;
create policy "Users can insert own cards"
  on public.cards
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own cards" on public.cards;
create policy "Users can update own cards"
  on public.cards
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cards_set_updated_at on public.cards;
create trigger cards_set_updated_at
before update on public.cards
for each row
execute function public.set_updated_at();
