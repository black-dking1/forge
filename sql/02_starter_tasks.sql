-- ============================================================
-- FORGE — migration 02: richer starter tasks
--
-- Every new build used to start with 3 generic tasks per area.
-- This swaps in 5 specific ones.
--
-- What it touches: ONLY the list new builds start with.
-- Builds you already made keep their tasks exactly as they are.
--
-- Safe to run more than once ("create or replace").
-- Run it in Supabase → SQL Editor → New query → paste → Run.
-- ============================================================

create or replace function starter_tasks_for(area_name text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case lower(trim(area_name))
    when 'hardware' then array[
      'List every component and part number',
      'Order the parts and track delivery',
      'Sketch the layout and wiring',
      'Assemble the first prototype',
      'Fix what the first power-on reveals']
    when 'software' then array[
      'Set up the repository and toolchain',
      'Get a first program running on the target',
      'Write the core logic',
      'Handle errors and edge cases',
      'Clean up and comment the code']
    when 'power' then array[
      'Work out the power budget',
      'Pick the battery or supply',
      'Add a fuse and reverse-polarity protection',
      'Wire a proper on/off switch',
      'Test it under full load']
    when 'testing' then array[
      'Write the test plan',
      'Test each part on its own',
      'Run a full end-to-end test',
      'Log every failure you find',
      'Retest after each fix']
    when 'research' then array[
      'Collect reference designs and papers',
      'Compare at least three approaches',
      'Check prices and what is in stock',
      'Pick one and note why',
      'Write up what you learned']
    when 'documentation' then array[
      'Write the README',
      'Draw the wiring or system diagram',
      'Write the bill of materials',
      'Document the build steps',
      'Post a build log update']
    else array[
      'Define what done looks like',
      'Plan the first steps',
      'Build the first version',
      'Test it',
      'Review and refine']
  end;
$$;

-- Quick check — should return 5 rows:
--   select unnest(starter_tasks_for('Hardware'));
