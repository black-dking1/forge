-- ============================================================
-- FORGE — migration 06: the pinned "next step"
--
-- Each build can hold ONE short line saying what to do the next time
-- you sit down to work on it, e.g. "Repeat the button input test".
-- Home shows it on the build's card and the Overview tab shows it
-- near the top, so opening the app tells you where you left off.
--
-- Two new columns on projects:
--
--   next_step     the line itself. Empty ('') means no step is set,
--                 the same way inventory works in migration 05. The
--                 database refuses anything over 140 characters, so
--                 the card can never overflow.
--
--   next_step_at  when the step was last changed, so the card can say
--                 "SET 3D AGO". The trigger below fills it in, never
--                 the app, so it can't be wrong.
--
-- Run it in Supabase → SQL Editor → New query → paste → Run.
-- Safe to run more than once.
-- ============================================================


-- ------------------------------------------------------------
-- 1. The columns.
-- ------------------------------------------------------------

alter table projects
  add column if not exists next_step    text not null default '',
  add column if not exists next_step_at timestamptz;


-- ------------------------------------------------------------
-- 2. Stamp the time whenever the step changes.
--
-- "before update of next_step" means this only runs when an update
-- touches the next_step column. It only stamps when the text actually
-- CHANGES, so saving the same words again keeps the old time. Clearing
-- the step clears the time too.
-- ------------------------------------------------------------

create or replace function stamp_next_step_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.next_step is distinct from old.next_step then
    if coalesce(new.next_step, '') = '' then
      new.next_step_at := null;
    else
      new.next_step_at := now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists projects_stamp_next_step_at on projects;

create trigger projects_stamp_next_step_at
  before update of next_step on projects
  for each row
  execute function stamp_next_step_at();


-- ------------------------------------------------------------
-- 3. The rules on the column.
--
-- The 140-character rule is dropped and added back, so re-running
-- this file always leaves exactly one copy of it.
--
-- The middle three lines only matter if you ran the FIRST DRAFT of
-- this file, which stored "no step" as NULL instead of ''. They bring
-- it in line, and do nothing otherwise.
-- ------------------------------------------------------------

alter table projects drop constraint if exists projects_next_step_check;

update projects set next_step = '' where next_step is null;
alter table projects alter column next_step set default '';
alter table projects alter column next_step set not null;

alter table projects
  add constraint projects_next_step_check check (char_length(next_step) <= 140);


-- No new security rules are needed. The existing "own projects" rules
-- already decide who can read and change each build's row, and these
-- columns ride along with the row, like name, goal and inventory do.
