-- ============================================================
-- FORGE — migration 01: the database schema
--
-- !!  FOR A BRAND-NEW SUPABASE PROJECT ONLY  !!
--
-- This file starts by DROPPING FORGE's tables and rebuilding them.
-- On a database that already has builds in it, running it again
-- deletes every build, area, task and template, for every user.
--
-- Setting up from scratch: run this once, then 02 → 07 in order,
-- each in Supabase → SQL Editor → New query → paste → Run.
--
-- It never touches auth.users or any data Supabase owns.
-- ============================================================


-- ------------------------------------------------------------
-- 0. CLEAN SLATE
--
-- "if exists" means: delete it if it's there, say nothing if
-- it isn't. So running this file twice is not an error.
--
-- "cascade" means: also drop anything that depends on this.
-- Order matters less because of it, but we still drop children
-- before parents out of habit.
-- ------------------------------------------------------------

drop view if exists project_overview cascade;
drop view if exists area_progress cascade;
drop view if exists project_progress cascade;

drop table if exists tasks cascade;
drop table if exists areas cascade;
drop table if exists templates cascade;
drop table if exists projects cascade;
drop table if exists profiles cascade;

drop function if exists create_project(text, text, text[]) cascade;
drop function if exists starter_tasks_for(text) cascade;
drop function if exists handle_new_user() cascade;
drop function if exists set_updated_at() cascade;
drop function if exists set_task_completed_at() cascade;
drop function if exists set_task_project_id() cascade;
drop function if exists touch_parent_project() cascade;
drop function if exists set_order_index() cascade;


-- ------------------------------------------------------------
-- 1. PROFILES
--
-- Supabase owns a table called auth.users. You cannot add
-- columns to it. So you make your own table with the SAME id
-- and put your app's user data there. This is the standard
-- Supabase pattern.
--
-- "references auth.users(id) on delete cascade" means: this id
-- must be a real user, and if that user is ever deleted, this
-- row goes too.
-- ------------------------------------------------------------

create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Builder',
  created_at   timestamptz not null default now()
);


-- ------------------------------------------------------------
-- 2. PROJECTS
--
-- The top of the tree. "Hexapod Mk II" is a project.
--
-- gen_random_uuid() makes a new random id for every row.
-- timestamptz stores a moment in time WITH its timezone, so
-- your 9pm in Lagos and a judge's 9pm in New York both mean
-- the right thing.
-- ------------------------------------------------------------

create table projects (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  name       text not null check (length(trim(name)) > 0),
  goal       text not null default '',
  status     text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- ------------------------------------------------------------
-- 3. AREAS
--
-- The middle of the tree: Hardware, Software, Power, Testing.
--
-- order_index exists because rows in a database have NO
-- inherent order. If you want Hardware to always sit above
-- Software, you store that as a number and sort by it.
-- ------------------------------------------------------------

create table areas (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  name        text not null check (length(trim(name)) > 0),
  order_index int  not null default 0,
  created_at  timestamptz not null default now()
);


-- ------------------------------------------------------------
-- 4. TASKS
--
-- The bottom of the tree. Where progress actually comes from.
--
-- Note project_id sits here even though area_id already implies
-- it — an area belongs to exactly one project. That is
-- deliberate DENORMALISATION: it lets you count every task in a
-- project with one simple query instead of joining through
-- areas every time.
--
-- The usual risk with denormalising is that the two columns
-- drift apart and start disagreeing. A trigger further down
-- fills project_id in FOR you, from the area, on every write —
-- so it cannot drift. You get the fast reads without the risk.
-- ------------------------------------------------------------

create table tasks (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  area_id      uuid not null references areas(id) on delete cascade,
  title        text not null check (length(trim(title)) > 0),
  notes        text not null default '',
  status       text not null default 'todo' check (status in ('todo', 'done')),
  order_index  int  not null default 0,
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);


-- ------------------------------------------------------------
-- 5. TEMPLATES  (a Pro feature)
--
-- "Save this project's shape so I can start another like it."
--
-- structure is JSONB — a whole JSON document in one column,
-- like:
--   {"areas": [{"name": "Hardware", "tasks": ["Pick sensors"]}]}
--
-- Why JSONB instead of more tables: a template is always read
-- whole and written whole. You never ask "find me every
-- template containing a task called X". When you never query
-- the inner parts, splitting them into tables buys nothing and
-- costs you joins. When you WOULD query them, tables win.
-- That's the actual rule.
-- ------------------------------------------------------------

create table templates (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  name       text not null check (length(trim(name)) > 0),
  structure  jsonb not null default '{"areas": []}'::jsonb,
  created_at timestamptz not null default now()
);


-- ------------------------------------------------------------
-- 6. INDEXES
--
-- An index is a lookup shortcut. Without one, Postgres reads
-- every row in the table to find matches.
--
-- These are not optional here. The security rules below look up
-- rows by project_id and user_id on EVERY single read. Without
-- these indexes those rules re-scan whole tables and the app
-- gets slow as soon as there's real data in it.
-- ------------------------------------------------------------

create index projects_user_id_idx  on projects (user_id);
create index projects_updated_idx  on projects (user_id, updated_at desc);
create index areas_project_id_idx  on areas (project_id, order_index);
create index tasks_project_id_idx  on tasks (project_id);
create index tasks_area_id_idx     on tasks (area_id, order_index);
create index templates_user_id_idx on templates (user_id);


-- ------------------------------------------------------------
-- 7. TRIGGERS
--
-- A trigger is a small function the database runs automatically
-- whenever a row changes. The point is that the rule lives in
-- ONE place — the database — instead of being re-implemented in
-- every screen that happens to touch the data.
--
-- "before insert or update" = run this and let it adjust the
-- row before it's actually saved.
-- "new" = the row as it's about to be written.
-- "old" = the row as it was before (updates only).
-- ------------------------------------------------------------

-- 7a. Keep projects.updated_at honest.
create function set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger projects_set_updated_at
  before update on projects
  for each row execute function set_updated_at();


-- 7b. Fill in tasks.project_id from the area. This is what makes
--     the denormalisation above safe — the app never sets this
--     column, so it can never set it wrong.
--
--     This function deliberately does NOT use "security definer",
--     so its lookup obeys Row Level Security like everything else.
--     That has a useful side effect: if someone hands it an area
--     belonging to another user, the lookup finds nothing and the
--     write is stopped here, before the security rules below even
--     get a turn. Two independent defences, not one.
--
--     So "not found" covers both cases — no such area, and an area
--     you aren't allowed to see. That's on purpose: telling a
--     stranger "that exists but isn't yours" confirms it exists.
create function set_task_project_id()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select a.project_id into new.project_id
  from public.areas a
  where a.id = new.area_id;

  if new.project_id is null then
    raise exception 'area % not found', new.area_id
      using hint = 'The area must exist and belong to the signed-in user.';
  end if;

  return new;
end;
$$;

create trigger tasks_set_project_id
  before insert or update of area_id on tasks
  for each row execute function set_task_project_id();


-- 7c. Stamp completed_at when a task is ticked, clear it when
--     un-ticked. Otherwise you get tasks marked 'todo' that
--     still claim a completion date.
create function set_task_completed_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'done' and (old.status is distinct from 'done') then
    new.completed_at := now();
  elsif new.status <> 'done' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create trigger tasks_set_completed_at
  before insert or update on tasks
  for each row execute function set_task_completed_at();


-- 7d. When anything inside a project changes, bump the project's
--     updated_at — that's what makes the home screen's "2H AGO"
--     mean something.
--
--     "after" instead of "before" because we're changing a
--     DIFFERENT table, not the row being saved.
create function touch_parent_project()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target uuid;
begin
  target := coalesce(new.project_id, old.project_id);
  update public.projects set updated_at = now() where id = target;
  return null;
end;
$$;

create trigger tasks_touch_project
  after insert or update or delete on tasks
  for each row execute function touch_parent_project();

create trigger areas_touch_project
  after insert or update or delete on areas
  for each row execute function touch_parent_project();


-- 7e. Auto-number new areas and tasks so the app doesn't have to
--     work out "what position is this?" before every insert.
create function set_order_index()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.order_index is null or new.order_index = 0 then
    if tg_table_name = 'areas' then
      select coalesce(max(order_index), 0) + 1 into new.order_index
      from public.areas where project_id = new.project_id;
    else
      select coalesce(max(order_index), 0) + 1 into new.order_index
      from public.tasks where area_id = new.area_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger areas_set_order
  before insert on areas
  for each row execute function set_order_index();

create trigger tasks_set_order
  before insert on tasks
  for each row execute function set_order_index();


-- 7f. Give every new signup a profile row automatically.
--
--     "security definer" means this runs with the permissions of
--     whoever created it, not whoever triggered it. It has to —
--     the signup isn't logged in yet, so it has no permission to
--     write to your tables on its own.
--
--     The exception block matters: if this function ever fails,
--     Supabase signup fails with an unhelpful "Database error
--     saving new user". Swallowing the error means a bad profile
--     insert can never lock a real person out of the app.
create function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    insert into public.profiles (id, display_name)
    values (
      new.id,
      coalesce(
        nullif(new.raw_user_meta_data ->> 'display_name', ''),
        nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
        'Builder'
      )
    )
    on conflict (id) do nothing;
  exception when others then
    raise warning 'could not create profile for %: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- ------------------------------------------------------------
-- 8. ROW LEVEL SECURITY
--
-- Your Supabase anon key ships inside the app. Anyone can pull
-- it out of an APK. So what stops a stranger reading every
-- user's projects?
--
-- This does. Row Level Security is a Postgres feature where the
-- DATABASE ITSELF refuses to return rows you shouldn't see —
-- not your app code, the database. A request crafted by hand
-- against the API gets nothing.
--
-- Without RLS enabled, that anon key reads your whole table.
-- This is the single most common way Supabase side projects
-- leak data.
--
--   using      — which EXISTING rows you may see/change/delete
--   with check — which NEW rows you're allowed to write
--                (without it, someone could insert a row
--                 carrying someone else's user_id)
--   auth.uid() — a function Supabase provides. It reads the
--                logged-in user's id out of their token. Logged
--                out, it returns null, and "null = user_id" is
--                never true — so anonymous requests get zero
--                rows. Not an error. Zero rows.
-- ------------------------------------------------------------

alter table profiles  enable row level security;
alter table projects  enable row level security;
alter table areas     enable row level security;
alter table tasks     enable row level security;
alter table templates enable row level security;

-- Direct ownership: these tables carry user_id themselves.
create policy "own profile" on profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "own projects" on projects
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own templates" on templates
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Ownership through the parent: areas and tasks have no user_id
-- of their own, so we ask "is there a project that owns this row
-- and belongs to me?"
--
-- "exists (select 1 from ...)" is the normal way to write that.
-- Postgres stops at the first match — it isn't counting rows or
-- fetching data, just answering yes/no.
create policy "own areas" on areas
  for all
  using (
    exists (
      select 1 from projects p
      where p.id = areas.project_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from projects p
      where p.id = areas.project_id
        and p.user_id = auth.uid()
    )
  );

create policy "own tasks" on tasks
  for all
  using (
    exists (
      select 1 from projects p
      where p.id = tasks.project_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from projects p
      where p.id = tasks.project_id
        and p.user_id = auth.uid()
    )
  );


-- ------------------------------------------------------------
-- 9. PROGRESS  (computed, never stored)
--
-- The tempting version is a "progress" column on projects that
-- you update whenever a task changes. Don't. The moment two
-- different things can change a task — ticking it, deleting it,
-- deleting a whole area — you have two places that can forget to
-- update the number, and the app starts lying to the user on the
-- home screen.
--
-- A view is just a saved query. You read it exactly like a table
-- from the app, but it is recalculated on every read, so it can
-- never be stale.
--
-- "with (security_invoker = true)" is NOT optional. By default a
-- view runs with its OWNER's permissions, which quietly bypasses
-- all the Row Level Security above and shows every user's
-- numbers to everybody. This one setting is the difference
-- between a view that respects your security rules and one that
-- silently defeats them.
--
-- Two bits of SQL worth knowing:
--   filter (where ...) — count only the rows matching a
--     condition, inside a count. Cleaner than the old
--     sum(case when ... then 1 else 0 end) trick.
--   left join — keep projects that have no tasks yet. A plain
--     join would make a brand-new project vanish from your home
--     screen entirely.
-- ------------------------------------------------------------

create view project_progress
with (security_invoker = true)
as
select
  p.id                                             as project_id,
  count(t.id)                                      as total_tasks,
  count(t.id) filter (where t.status = 'done')     as done_tasks,
  case
    when count(t.id) = 0 then 0
    else round(100.0 * count(t.id) filter (where t.status = 'done') / count(t.id))::int
  end                                              as percent
from projects p
left join tasks t on t.project_id = p.id
group by p.id;


create view area_progress
with (security_invoker = true)
as
select
  a.id                                             as area_id,
  a.project_id,
  a.name,
  a.order_index,
  count(t.id)                                      as total_tasks,
  count(t.id) filter (where t.status = 'done')     as done_tasks,
  case
    when count(t.id) = 0 then 0
    else round(100.0 * count(t.id) filter (where t.status = 'done') / count(t.id))::int
  end                                              as percent
from areas a
left join tasks t on t.area_id = a.id
group by a.id, a.project_id, a.name, a.order_index;


-- Everything the home screen needs, in one read: name, percent,
-- how many areas, how many tasks, when it last moved.
--
-- The two counts are worked out in separate subqueries and then
-- joined on. Joining areas AND tasks directly to projects in one
-- go would multiply the rows together — 6 areas x 27 tasks = 162
-- rows — and every count would come out wrong. This shape avoids
-- that.
create view project_overview
with (security_invoker = true)
as
select
  p.id,
  p.user_id,
  p.name,
  p.goal,
  p.status,
  p.created_at,
  p.updated_at,
  coalesce(ar.area_count, 0)   as area_count,
  coalesce(tk.total_tasks, 0)  as total_tasks,
  coalesce(tk.done_tasks, 0)   as done_tasks,
  case
    when coalesce(tk.total_tasks, 0) = 0 then 0
    else round(100.0 * tk.done_tasks / tk.total_tasks)::int
  end                          as percent
from projects p
left join (
  select project_id, count(*) as area_count
  from areas group by project_id
) ar on ar.project_id = p.id
left join (
  select
    project_id,
    count(*)                                as total_tasks,
    count(*) filter (where status = 'done') as done_tasks
  from tasks group by project_id
) tk on tk.project_id = p.id;


-- ------------------------------------------------------------
-- 10. STARTER TASKS
--
-- The New Project screen promises "FORGE will draft tasks inside
-- each area you keep". This is that promise, kept with a plain
-- lookup instead of an AI call — instant, free, and it can't
-- fail in front of a judge.
--
-- Edit these freely. They're just text.
-- ------------------------------------------------------------

create function starter_tasks_for(area_name text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case lower(trim(area_name))
    when 'hardware' then array[
      'List the components you need',
      'Source the parts',
      'Assemble the first prototype']
    when 'software' then array[
      'Set up the project skeleton',
      'Write the core logic',
      'Handle the error cases']
    when 'power' then array[
      'Work out the power budget',
      'Choose a power source',
      'Test it under load']
    when 'testing' then array[
      'Write the test plan',
      'Run a first end-to-end test',
      'Log and fix what breaks']
    when 'research' then array[
      'Collect reference material',
      'Compare the possible approaches',
      'Write up the decision']
    when 'documentation' then array[
      'Write the README',
      'Document the setup steps',
      'Record how to use it']
    else array[
      'Plan this area',
      'Build the first version',
      'Review and refine']
  end;
$$;


-- ------------------------------------------------------------
-- 11. CREATE A WHOLE PROJECT IN ONE CALL
--
-- The New Project screen would otherwise need three round trips:
-- insert the project, then the areas, then the tasks. If the
-- phone loses signal between step two and three, the user is
-- left with a half-built project and no way to tell.
--
-- Inside a function, it's all one transaction: everything lands,
-- or nothing does. From the app it's a single call:
--
--   const { data, error } = await supabase.rpc('create_project', {
--     new_name:   'Hexapod Mk II',
--     new_goal:   'A six-legged walking robot...',
--     area_names: ['Hardware', 'Software', 'Power', 'Testing'],
--   });
--   // data is the new project's id
--
-- Note there's no "security definer" here. This runs as the
-- calling user, so the Row Level Security above still applies —
-- the function is a convenience, not a way around the rules.
-- ------------------------------------------------------------

create function create_project(
  new_name   text,
  new_goal   text default '',
  area_names text[] default array['Hardware', 'Software', 'Power', 'Testing']
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  new_project_id uuid;
  area_name      text;
  new_area_id    uuid;
  task_title     text;
  area_position  int := 0;
  task_position  int;
begin
  if auth.uid() is null then
    raise exception 'you must be signed in to create a project';
  end if;

  insert into public.projects (user_id, name, goal)
  values (auth.uid(), new_name, coalesce(new_goal, ''))
  returning id into new_project_id;

  foreach area_name in array coalesce(area_names, array[]::text[])
  loop
    continue when trim(area_name) = '';

    area_position := area_position + 1;

    insert into public.areas (project_id, name, order_index)
    values (new_project_id, trim(area_name), area_position)
    returning id into new_area_id;

    task_position := 0;
    foreach task_title in array public.starter_tasks_for(area_name)
    loop
      task_position := task_position + 1;
      insert into public.tasks (project_id, area_id, title, order_index)
      values (new_project_id, new_area_id, task_title, task_position);
    end loop;
  end loop;

  return new_project_id;
end;
$$;


-- ------------------------------------------------------------
-- 12. PERMISSIONS
--
-- RLS decides WHICH ROWS a user can touch. Grants decide whether
-- they may touch the table at all. You need both.
--
-- Supabase usually sets these up for you on new tables; doing it
-- explicitly costs nothing and removes a class of confusing
-- "permission denied" errors.
--
-- Note "anon" gets nothing here. Every FORGE screen requires a
-- login, so signed-out requests have no business reading rows.
-- ------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant usage on schema public to authenticated;
    grant select, insert, update, delete
      on profiles, projects, areas, tasks, templates
      to authenticated;
    grant select
      on project_progress, area_progress, project_overview
      to authenticated;
    grant execute on function create_project(text, text, text[]) to authenticated;
    grant execute on function starter_tasks_for(text) to authenticated;
  end if;
end
$$;


-- ============================================================
-- Done. Quick check that it landed:
--
--   select table_name from information_schema.tables
--   where table_schema = 'public' order by table_name;
--
-- You should see: areas, profiles, projects, tasks, templates,
-- plus the three views.
-- ============================================================
