-- 0.4.0: personal-task fields. Additive only.
alter table cards alter column list_id drop not null;          -- tasks captured without a board ("unsorted")
alter table cards add column if not exists done_at timestamptz; -- null = open
alter table cards add column if not exists due_has_time boolean not null default false;
alter table cards add column if not exists priority smallint not null default 0; -- 1 = focus (starred)
create index if not exists cards_open_due on cards(user_id, due_at) where done_at is null;
