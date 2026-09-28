-- ============================================================
-- FORGE — migration 05: "parts you have" (inventory)
--
-- Each build can remember the parts and tools you already own,
-- written in plain words (e.g. "Arduino Uno, 2 DC motors, 4 wheels").
-- The AI reads it so its plans and its task suggestions are shaped
-- around what you have, and leave those parts off the shopping list.
--
-- It's just one new text box of information on each build, so it's
-- one new column. Empty by default — a build with nothing written
-- in behaves exactly as before.
--
-- Run it in Supabase → SQL Editor → New query → paste → Run.
-- Safe to run more than once.
-- ============================================================

alter table projects
  add column if not exists inventory text not null default '';

-- No new security rules are needed. The existing "own projects" rules
-- already decide who can read and change each build's row, and this
-- column rides along with the row like name and goal do.
