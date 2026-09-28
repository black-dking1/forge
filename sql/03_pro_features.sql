-- ============================================================
-- FORGE — migration 03: templates + delete account
--
-- Adds two things the app now needs:
--
--   1. create_project_from_structure — make a new build from a
--      saved template (its areas AND its tasks), in one go.
--   2. delete_my_account — Apple requires that any app with sign-up
--      also lets you delete your account from inside the app.
--
-- Safe to run more than once. Run it in Supabase → SQL Editor →
-- New query → paste → Run. (Run 02_starter_tasks.sql too if you
-- haven't — the two are independent.)
-- ============================================================


-- ------------------------------------------------------------
-- 1. Templates fill in their owner automatically.
--
-- The templates table already exists (from the first schema). This
-- just means the app doesn't have to send user_id when saving one —
-- the database stamps it with whoever is signed in. The security
-- rule "own templates" still checks it matches.
-- ------------------------------------------------------------

alter table templates alter column user_id set default auth.uid();


-- ------------------------------------------------------------
-- 2. Create a build from a template's structure.
--
-- The template's shape, stored as JSON:
--
--   { "areas": [
--       { "name": "Hardware", "tasks": ["Cut the plates", "Mount the servos"] },
--       { "name": "Software", "tasks": ["Write the gait code"] }
--   ] }
--
-- Like create_project, this runs as the signed-in user (no
-- "security definer"), so the Row Level Security rules still apply,
-- and it's all one transaction: everything lands, or nothing does.
-- ------------------------------------------------------------

create or replace function create_project_from_structure(
  new_name  text,
  new_goal  text,
  structure jsonb
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  new_project_id uuid;
  new_area_id    uuid;
  area_item      jsonb;
  task_item      jsonb;
  area_position  int := 0;
  task_position  int;
begin
  if auth.uid() is null then
    raise exception 'you must be signed in to create a project';
  end if;

  insert into public.projects (user_id, name, goal)
  values (auth.uid(), new_name, coalesce(new_goal, ''))
  returning id into new_project_id;

  for area_item in
    select value from jsonb_array_elements(coalesce(structure -> 'areas', '[]'::jsonb))
  loop
    continue when coalesce(trim(area_item ->> 'name'), '') = '';

    area_position := area_position + 1;
    insert into public.areas (project_id, name, order_index)
    values (new_project_id, trim(area_item ->> 'name'), area_position)
    returning id into new_area_id;

    task_position := 0;
    for task_item in
      select value from jsonb_array_elements(coalesce(area_item -> 'tasks', '[]'::jsonb))
    loop
      -- #>> '{}' turns a JSON string like "Cut the plates" into plain text
      continue when coalesce(trim(task_item #>> '{}'), '') = '';
      task_position := task_position + 1;
      insert into public.tasks (project_id, area_id, title, order_index)
      values (new_project_id, new_area_id, trim(task_item #>> '{}'), task_position);
    end loop;
  end loop;

  return new_project_id;
end;
$$;


-- ------------------------------------------------------------
-- 3. Delete my account.
--
-- Deleting a sign-in lives in Supabase's private "auth" schema,
-- which the app can't touch directly — on purpose. So this one
-- function is "security definer": it runs with the database owner's
-- permission. It is safe because it can only ever delete ONE row:
-- the caller's own (auth.uid()). There is no parameter to point it
-- at anyone else.
--
-- Everything else goes with it automatically, because every table
-- says "on delete cascade": the profile → the builds → their areas
-- → their tasks, and the templates.
-- ------------------------------------------------------------

create or replace function delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'you must be signed in to delete your account';
  end if;

  delete from auth.users where id = auth.uid();
end;
$$;


-- ------------------------------------------------------------
-- 4. Who may call what. Signed-in users only; never anonymous.
-- ------------------------------------------------------------

revoke execute on function create_project_from_structure(text, text, jsonb) from public;
revoke execute on function delete_my_account() from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function create_project_from_structure(text, text, jsonb) from anon;
    revoke execute on function delete_my_account() from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function create_project_from_structure(text, text, jsonb) to authenticated;
    grant execute on function delete_my_account() to authenticated;
  end if;
end
$$;
