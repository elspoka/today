-- ============================================================
-- Run this in the Supabase SQL editor (one-time setup)
-- ============================================================

-- 1. Todos table (basic — user_id only)
create table if not exists public.todos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  text       text not null check (char_length(text) between 1 and 200),
  completed  boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2. Lists table
create table if not exists public.todo_lists (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 100),
  created_at timestamptz not null default now()
);

-- 3. Add list_id to todos (links a todo to a list, optional)
alter table public.todos
  add column if not exists list_id uuid references public.todo_lists(id) on delete set null;

-- 4. List members table (for sharing lists)
create table if not exists public.list_members (
  id         uuid primary key default gen_random_uuid(),
  list_id    uuid not null references public.todo_lists(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now(),
  unique (list_id, user_id)
);

-- 5. Indexes
create index if not exists todos_user_id_created_at_idx on public.todos (user_id, created_at desc);
create index if not exists todos_list_id_idx            on public.todos (list_id);
create index if not exists todo_lists_user_id_idx       on public.todo_lists (user_id);
create index if not exists list_members_user_id_idx     on public.list_members (user_id);
create index if not exists list_members_list_id_idx     on public.list_members (list_id);

-- 6. Notifications table
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null,
  message    text not null check (char_length(message) between 1 and 500),
  read       boolean not null default false,
  metadata   jsonb,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "Users can view own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

-- ============================================================
-- If you already have the todos table but are missing list_id,
-- just run this single statement:
--
--   alter table public.todos
--     add column if not exists list_id uuid references public.todo_lists(id) on delete set null;
--
-- ============================================================
