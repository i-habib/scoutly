create table if not exists public.scout_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.scout_profiles enable row level security;

create policy "Users can read their own Scout profile"
  on public.scout_profiles
  for select
  using (auth.uid() = user_id);

create policy "Users can create their own Scout profile"
  on public.scout_profiles
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own Scout profile"
  on public.scout_profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
