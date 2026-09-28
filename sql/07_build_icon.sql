-- ============================================================
-- FORGE — migration 07: an icon for every build
--
-- The Home screen shows each build as a folder with a small
-- dot-matrix icon on it: a hexapod, a sun, a gear and so on. This
-- adds the one column that remembers which icon each build uses.
--
--   icon   the icon's name, e.g. 'hexapod'. Every existing build gets
--          'bolt' until you pick something else, so nothing breaks.
--
-- WHY THE RULE CHECKS THE SHAPE, NOT THE EXACT LIST OF ICONS
-- The database only checks that the name LOOKS like an icon name
-- (lowercase letters, up to 24 of them). It does not keep a list of
-- the eight icons. That way, adding a ninth icon later is an app
-- update only, with no new migration. If the app ever meets a name it
-- doesn't know, it draws the bolt instead.
--
-- Run it in Supabase → SQL Editor → New query → paste → Run.
-- Safe to run more than once.
-- ============================================================


-- ------------------------------------------------------------
-- 1. The column.
--
-- create_project and create_project_from_structure don't mention
-- icon when they insert a build, so new builds start as 'bolt' too.
-- The app then saves the icon you picked straight after.
-- ------------------------------------------------------------

alter table projects
  add column if not exists icon text not null default 'bolt';


-- ------------------------------------------------------------
-- 2. The rule on the column.
--
-- Dropped and added back, so re-running this file always leaves
-- exactly one copy of it.
-- ------------------------------------------------------------

alter table projects drop constraint if exists projects_icon_check;

alter table projects
  add constraint projects_icon_check check (icon ~ '^[a-z]{1,24}$');


-- No new security rules are needed. The existing "own projects" rules
-- already decide who can read and change each build's row, and this
-- column rides along with the row, like name, goal and next_step do.
