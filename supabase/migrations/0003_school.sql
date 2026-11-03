-- 0.5.0: subjects, item kinds, assessment results. Additive only.
create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  colour text not null default '#c2410c',
  position double precision not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
alter table subjects enable row level security;
drop policy if exists owner_all on subjects;
create policy owner_all on subjects for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table cards add column if not exists subject_id uuid references subjects(id) on delete set null;
alter table cards add column if not exists kind text not null default 'task';
alter table cards drop constraint if exists cards_kind_check;
alter table cards add constraint cards_kind_check check (kind in ('task','homework','sac','exam','assignment'));
alter table cards add column if not exists result_score numeric;
alter table cards add column if not exists result_total numeric;
create index if not exists cards_subject on cards(subject_id);
