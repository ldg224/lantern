create table if not exists boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  position double precision not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  board_id uuid not null references boards(id) on delete cascade,
  title text not null,
  position double precision not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  list_id uuid not null references lists(id) on delete cascade,
  title text not null,
  description text not null default '',
  due_at timestamptz,
  position double precision not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists checklist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  card_id uuid not null references cards(id) on delete cascade,
  text text not null,
  done boolean not null default false,
  position double precision not null default 0
);
create index if not exists lists_board on lists(board_id);
create index if not exists cards_list on cards(list_id);
create index if not exists items_card on checklist_items(card_id);

do $$ declare t text; begin
  foreach t in array array['boards','lists','cards','checklist_items'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists owner_all on %I', t);
    execute format('create policy owner_all on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;
