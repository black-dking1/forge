-- ============================================================
-- FORGE — migration 04: AI usage limits
--
-- The AI features (draft a whole build, suggest tasks for an area)
-- cost real money per use, paid from your AI credit. This keeps
-- that under control:
--
--   • each person gets 15 AI actions per day
--   • the whole app gets 1,000 per day, however many people sign up
--
-- If either limit is hit, the AI politely says "try again tomorrow"
-- and nothing is charged. (Also set a monthly spend limit in the AI
-- provider's console — that's the last line of defence.)
--
-- Run it in Supabase → SQL Editor → New query → paste → Run.
-- Safe to run more than once.
-- ============================================================

-- One row per person per day: how many AI actions they've used.
create table if not exists ai_usage (
  user_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  day     date not null default current_date,
  count   int  not null default 0,
  primary key (user_id, day)
);

alter table ai_usage enable row level security;

-- People may READ their own count (so the app can show "12 left
-- today"). There is deliberately NO insert/update policy: the only
-- way to change a count is the function below.
drop policy if exists "read own ai usage" on ai_usage;
create policy "read own ai usage" on ai_usage
  for select using (auth.uid() = user_id);


-- ------------------------------------------------------------
-- use_ai_credit() — take one AI action from today's allowance.
--
-- Returns how many are LEFT after this one (0 or more), or -1 if
-- the limit is already reached (and nothing is taken).
--
-- The limits are written inside the function, not passed in —
-- otherwise anyone could call it with a limit of a million.
-- "security definer" lets it write to ai_usage even though users
-- can't; it only ever touches the caller's own row.
-- ------------------------------------------------------------

create or replace function use_ai_credit()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  per_person_limit constant int := 15;
  whole_app_limit  constant int := 1000;
  used_today_by_all int;
  used_now int;
begin
  if auth.uid() is null then
    raise exception 'you must be signed in to use the AI';
  end if;

  select coalesce(sum(count), 0) into used_today_by_all
  from public.ai_usage where day = current_date;

  if used_today_by_all >= whole_app_limit then
    return -1;
  end if;

  -- Add one to today's count, but only while it's under the limit.
  -- Done as a single statement so two taps at once can't both sneak
  -- past the limit.
  insert into public.ai_usage (user_id, day, count)
  values (auth.uid(), current_date, 1)
  on conflict (user_id, day) do update
    set count = public.ai_usage.count + 1
    where public.ai_usage.count < per_person_limit
  returning count into used_now;

  if used_now is null then
    return -1; -- already at the limit
  end if;

  return per_person_limit - used_now;
end;
$$;

revoke execute on function use_ai_credit() from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function use_ai_credit() from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function use_ai_credit() to authenticated;
    grant select on ai_usage to authenticated;
  end if;
end
$$;
