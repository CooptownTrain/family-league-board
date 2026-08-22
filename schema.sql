-- One row per person. Row-level security means nobody can read anyone else's board.
create table if not exists boards (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text,
  state      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table boards enable row level security;
create policy "own board read"   on boards for select using  (auth.uid() = user_id);
create policy "own board write"  on boards for insert with check (auth.uid() = user_id);
create policy "own board update" on boards for update using  (auth.uid() = user_id);
