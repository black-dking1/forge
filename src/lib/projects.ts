/**
 * Every database read and write to do with builds lives here.
 *
 * Screens call these functions; screens never build queries
 * themselves. If a column is ever renamed, this is the only file that
 * changes.
 *
 * None of these pass a user id. They don't need to — the Row Level
 * Security rules in the schema filter by the signed-in user inside
 * the database. Adding `.eq('user_id', ...)` here would look like
 * the security lives in the app. It doesn't.
 *
 * Every function returns `{ ..., error }` where error is a plain
 * message or null, so screens never have to dig through Supabase's
 * error objects.
 */

import { supabase } from './supabase';

export type ProjectOverview = {
  id: string;
  name: string;
  goal: string;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
  area_count: number;
  total_tasks: number;
  done_tasks: number;
  percent: number;
  /** The pinned next step (migration 06). '' when none is set. */
  next_step: string;
  /** When the next step was last changed, or null if none is set. */
  next_step_at: string | null;
  /** The picture on the build's folder on Home (migration 07), e.g. 'hexapod'. */
  icon: string;
};

/** The longest next step allowed. The database enforces the same limit. */
export const NEXT_STEP_MAX = 140;

export type Area = {
  id: string;
  project_id: string;
  name: string;
  order_index: number;
  total_tasks: number;
  done_tasks: number;
  percent: number;
};

export type Task = {
  id: string;
  project_id: string;
  area_id: string;
  title: string;
  notes: string;
  status: 'todo' | 'done';
  order_index: number;
};

// The area_progress view names its id column "area_id". The app
// calls it "id" everywhere, so we rename it on the way out:
// "id:area_id" is Supabase for "give me area_id, but call it id".
//
// (Before this fix the app read a.id and got undefined — so tapping
// one area in the blueprint opened all of them, with no tasks inside.)
const AREA_COLUMNS = 'id:area_id, project_id, name, order_index, total_tasks, done_tasks, percent';

const message = (error: { message: string } | null) => error?.message ?? null;

// ---------------------------------------------------------------
// BUILDS
// ---------------------------------------------------------------

// Extras: the next step (migration 06) and the icon (migration 07).
//
// The project_overview view was made before these columns existed,
// and a view's list of columns is fixed when it's created. So they're
// read from the projects table in a second, small query that runs AT
// THE SAME TIME as the first one, and the two are joined up here.
//
// If that second query fails, the builds still load, just without
// their extras. A missing extra shouldn't take the whole screen down.
// (If only migration 07 hasn't been run yet, the icon column is
// missing, so we ask again without it and every build shows the bolt.)

type ExtrasRow = { id: string; next_step: string | null; next_step_at: string | null; icon?: string | null };

const EXTRA_COLUMNS = 'id, next_step, next_step_at, icon';
const EXTRA_COLUMNS_WITHOUT_ICON = 'id, next_step, next_step_at';

/** The icon a build gets when none has been picked. Matches migration 07's default. */
export const DEFAULT_ICON = 'bolt';

async function readExtras(onlyId?: string): Promise<ExtrasRow[] | null> {
  const ask = (columns: string) => {
    const query = supabase.from('projects').select(columns);
    return onlyId ? query.eq('id', onlyId) : query;
  };
  let result = await ask(EXTRA_COLUMNS);
  if (result.error) result = await ask(EXTRA_COLUMNS_WITHOUT_ICON);
  return result.error ? null : (result.data as unknown as ExtrasRow[]);
}

function withExtras(projects: ProjectOverview[], rows: ExtrasRow[] | null): ProjectOverview[] {
  const byId = new Map((rows ?? []).map((row) => [row.id, row]));
  return projects.map((project) => {
    const row = byId.get(project.id);
    return {
      ...project,
      next_step: (row?.next_step ?? '').trim(),
      next_step_at: row?.next_step_at ?? null,
      icon: row?.icon || DEFAULT_ICON,
    };
  });
}

/** Every build — active and archived — newest activity first. */
export async function listProjects() {
  const [overview, extras] = await Promise.all([
    supabase.from('project_overview').select('*').order('updated_at', { ascending: false }),
    readExtras(),
  ]);

  const projects = withExtras((overview.data ?? []) as ProjectOverview[], extras);
  return { projects, error: message(overview.error) };
}

export async function getProject(id: string) {
  const [overview, extras] = await Promise.all([
    supabase.from('project_overview').select('*').eq('id', id).maybeSingle(),
    readExtras(id),
  ]);

  const found = (overview.data as ProjectOverview | null) ?? null;
  const project = found ? withExtras([found], extras)[0] : null;
  return { project, error: message(overview.error) };
}

/** Change the picture on a build's folder. */
export async function setProjectIcon(id: string, icon: string) {
  const { error } = await supabase.from('projects').update({ icon }).eq('id', id);
  return { error: message(error) };
}

/**
 * Pin a build's next step, or clear it by sending ''.
 *
 * Line breaks become spaces, because it's one line on the card. The
 * time it was set isn't sent: the database stamps that itself
 * (the stamp_next_step_at trigger in migration 06).
 */
export async function setNextStep(id: string, text: string) {
  const clean = text.replace(/\s+/g, ' ').trim().slice(0, NEXT_STEP_MAX);
  const { error } = await supabase.from('projects').update({ next_step: clean }).eq('id', id);
  return { error: message(error) };
}

/**
 * Create a build, its areas and their starter tasks — all in one
 * call, all or nothing. This is the create_project function in your
 * schema; doing it as separate inserts could leave a half-made build
 * if the signal drops halfway.
 *
 * The icon is saved straight after, as a small second step. If that
 * one step fails the build is still made, just with the bolt, and you
 * can change it from the build's ⋮ menu.
 */
export async function createProject(name: string, goal: string, areaNames: string[], icon?: string) {
  const { data, error } = await supabase.rpc('create_project', {
    new_name: name.trim(),
    new_goal: goal.trim(),
    area_names: areaNames,
  });

  const projectId = (data as string | null) ?? null;
  if (projectId && icon && icon !== DEFAULT_ICON) await setProjectIcon(projectId, icon);
  return { projectId, error: message(error) };
}

export async function renameProject(id: string, name: string) {
  const { error } = await supabase.from('projects').update({ name: name.trim() }).eq('id', id);
  return { error: message(error) };
}

/**
 * The parts and tools you already own for this build, in plain words
 * (migration 05). The AI reads this so its plans and suggestions are
 * shaped around what you have. Read straight from the projects table
 * because the project_overview view doesn't carry this column.
 */
export async function getInventory(id: string) {
  const { data, error } = await supabase.from('projects').select('inventory').eq('id', id).maybeSingle();
  return { inventory: ((data?.inventory as string | undefined) ?? '').trim(), error: message(error) };
}

/** Save the parts-you-have text. An empty string clears it. */
export async function setInventory(id: string, inventory: string) {
  const { error } = await supabase.from('projects').update({ inventory: inventory.trim() }).eq('id', id);
  return { error: message(error) };
}

/** Archive hides a build from the main list without deleting it. */
export async function setProjectArchived(id: string, archived: boolean) {
  const { error } = await supabase
    .from('projects')
    .update({ status: archived ? 'archived' : 'active' })
    .eq('id', id);
  return { error: message(error) };
}

/**
 * Delete a build. Its areas and tasks go with it automatically —
 * the schema says "on delete cascade" for both.
 */
export async function deleteProject(id: string) {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  return { error: message(error) };
}

/**
 * For the free-tier gate: how many builds does this user have?
 * Archived builds count too. Otherwise archiving would be a free
 * way round the limit.
 */
export async function countProjects() {
  const { count, error } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true });

  return { count: count ?? 0, error: message(error) };
}

// ---------------------------------------------------------------
// AREAS
// ---------------------------------------------------------------

/** Areas of one build, with their own progress, in display order. */
export async function listAreas(projectId: string) {
  const { data, error } = await supabase
    .from('area_progress')
    .select(AREA_COLUMNS)
    .eq('project_id', projectId)
    .order('order_index');

  return { areas: (data ?? []) as unknown as Area[], error: message(error) };
}

export async function getArea(areaId: string) {
  const { data, error } = await supabase
    .from('area_progress')
    .select(AREA_COLUMNS)
    .eq('area_id', areaId)
    .maybeSingle();

  return { area: (data as unknown as Area | null) ?? null, error: message(error) };
}

/**
 * Add an empty area to a build. Its position (last) is filled in by
 * the database's set_order_index trigger.
 */
export async function addArea(projectId: string, name: string) {
  const { error } = await supabase.from('areas').insert({ project_id: projectId, name: name.trim() });
  return { error: message(error) };
}

export async function renameArea(areaId: string, name: string) {
  const { error } = await supabase.from('areas').update({ name: name.trim() }).eq('id', areaId);
  return { error: message(error) };
}

/** Deletes the area and every task in it (cascade). */
export async function deleteArea(areaId: string) {
  const { error } = await supabase.from('areas').delete().eq('id', areaId);
  return { error: message(error) };
}

// ---------------------------------------------------------------
// TASKS
// ---------------------------------------------------------------

export async function listTasks(projectId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('order_index');

  return { tasks: (data ?? []) as Task[], error: message(error) };
}

export async function listAreaTasks(areaId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('area_id', areaId)
    .order('order_index');

  return { tasks: (data ?? []) as Task[], error: message(error) };
}

/**
 * Add a task to an area.
 *
 * Only two things are sent: which area, and the title. The database
 * fills in the rest by itself — the project it belongs to (the
 * set_task_project_id trigger), and its position at the end of the
 * list (set_order_index). `.select().single()` hands back the new
 * row, id and all, so the screen can show it straight away.
 */
export async function addTask(areaId: string, title: string) {
  const { data, error } = await supabase
    .from('tasks')
    .insert({ area_id: areaId, title: title.trim() })
    .select()
    .single();

  return { task: (data as Task | null) ?? null, error: message(error) };
}

export async function renameTask(taskId: string, title: string) {
  const { error } = await supabase.from('tasks').update({ title: title.trim() }).eq('id', taskId);
  return { error: message(error) };
}

export async function setTaskStatus(taskId: string, done: boolean) {
  const { error } = await supabase
    .from('tasks')
    .update({ status: done ? 'done' : 'todo' })
    .eq('id', taskId);

  return { error: message(error) };
}

export async function deleteTask(taskId: string) {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  return { error: message(error) };
}

/**
 * UNDO for a deleted task: put it back exactly where it was.
 *
 * Sending the old order_index keeps its position — the ordering
 * trigger only picks a position when it's given 0.
 */
export async function restoreTask(task: Task) {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      area_id: task.area_id,
      title: task.title,
      notes: task.notes,
      status: task.status,
      order_index: task.order_index,
    })
    .select()
    .single();

  return { task: (data as Task | null) ?? null, error: message(error) };
}

// ---------------------------------------------------------------
// SEARCH (the search bar on Home)
// ---------------------------------------------------------------
//
// Builds are matched on the phone, from the list Home already has.
// Areas and tasks are matched here, by the database, with ilike —
// "contains these letters, ignoring capitals". Two small queries that
// run at the same time. Like everything else in this file, the
// security rules mean each person only ever searches their own builds.

export type AreaHit = { id: string; name: string; project_id: string; total_tasks: number };
export type TaskHit = {
  id: string;
  title: string;
  status: 'todo' | 'done';
  area_id: string;
  project_id: string;
  area_name: string;
};

/**
 * Turns what was typed into a safe "contains" pattern. %, _ and \ mean
 * something special to ilike, so they're escaped to mean themselves.
 * The database's own search helpers also treat * as a wildcard, so it
 * is dropped.
 */
function containsPattern(text: string) {
  const escaped = text.replace(/\*/g, '').replace(/[\\%_]/g, (c) => `\\${c}`);
  return `%${escaped}%`;
}

export async function searchAreasAndTasks(text: string) {
  const pattern = containsPattern(text.trim());
  const [areas, tasks] = await Promise.all([
    // area_progress (not areas) so each hit can say how many tasks it holds.
    supabase
      .from('area_progress')
      .select('id:area_id, name, project_id, total_tasks')
      .ilike('name', pattern)
      .order('name')
      .limit(20),
    supabase
      .from('tasks')
      // "area:areas(name)" pulls each task's area name along with it,
      // following the link from tasks.area_id to the areas table.
      .select('id, title, status, area_id, project_id, area:areas(name)')
      .ilike('title', pattern)
      .order('status', { ascending: false }) // 'todo' before 'done'
      .limit(40),
  ]);

  type TaskRow = Omit<TaskHit, 'area_name'> & { area: { name: string } | null };
  return {
    areas: (areas.data ?? []) as AreaHit[],
    tasks: ((tasks.data ?? []) as unknown as TaskRow[]).map(({ area, ...task }) => ({
      ...task,
      area_name: area?.name ?? '',
    })),
    error: message(areas.error) ?? message(tasks.error),
  };
}

// ---------------------------------------------------------------
// TEMPLATES (Pro)
// ---------------------------------------------------------------
//
// A template is a build's PLAN without its progress: the areas and
// the task titles, nothing ticked. Stored as JSON in the templates
// table, shaped like:
//
//   { "areas": [ { "name": "Hardware", "tasks": ["Cut plates", ...] } ] }

export type TemplateStructure = { areas: { name: string; tasks: string[] }[] };

export type Template = {
  id: string;
  name: string;
  structure: TemplateStructure;
  created_at: string;
};

/** Turn a build's areas + tasks into a template structure. */
export function toStructure(areas: Area[], tasks: Task[]): TemplateStructure {
  return {
    areas: areas.map((area) => ({
      name: area.name,
      tasks: tasks.filter((t) => t.area_id === area.id).map((t) => t.title),
    })),
  };
}

/** "4 AREAS · 17 TASKS" — for showing what a template contains. */
export function describeStructure(structure: TemplateStructure) {
  const areaCount = structure.areas.length;
  const taskCount = structure.areas.reduce((sum, a) => sum + a.tasks.length, 0);
  return `${areaCount} ${areaCount === 1 ? 'AREA' : 'AREAS'} · ${taskCount} ${taskCount === 1 ? 'TASK' : 'TASKS'}`;
}

export async function listTemplates() {
  const { data, error } = await supabase
    .from('templates')
    .select('id, name, structure, created_at')
    .order('created_at', { ascending: false });

  return { templates: (data ?? []) as Template[], error: message(error) };
}

/**
 * Save a template. No user_id is sent — the database stamps it with
 * whoever is signed in (migration 03), and the "own templates" rule
 * checks it.
 */
export async function saveTemplate(name: string, structure: TemplateStructure) {
  const { error } = await supabase.from('templates').insert({ name: name.trim(), structure });
  return { error: message(error) };
}

export async function deleteTemplate(id: string) {
  const { error } = await supabase.from('templates').delete().eq('id', id);
  return { error: message(error) };
}

/**
 * Create a build from a template: its areas AND its tasks, in one
 * transaction. This is create_project_from_structure in migration 03.
 */
export async function createProjectFromTemplate(
  name: string,
  goal: string,
  structure: TemplateStructure,
  icon?: string
) {
  const { data, error } = await supabase.rpc('create_project_from_structure', {
    new_name: name.trim(),
    new_goal: goal.trim(),
    structure,
  });

  const projectId = (data as string | null) ?? null;
  if (projectId && icon && icon !== DEFAULT_ICON) await setProjectIcon(projectId, icon);
  return { projectId, error: message(error) };
}
