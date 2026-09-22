/**
 * Every database read and write to do with projects lives here.
 *
 * Screens call these functions; screens never build queries
 * themselves. If a column is ever renamed, this is the only file that
 * changes.
 *
 * Note none of these pass a user id. They don't need to — the Row
 * Level Security rules in the schema filter by the signed-in user
 * inside the database. Adding `.eq('user_id', ...)` here would be
 * duplicate work, and worse, it would look like the security lives in
 * the app. It doesn't.
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
};

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

/** Everything the home screen needs, in one round trip. */
export async function listProjects() {
  const { data, error } = await supabase
    .from('project_overview')
    .select('*')
    .eq('status', 'active')
    .order('updated_at', { ascending: false });

  return { projects: (data ?? []) as ProjectOverview[], error: error?.message ?? null };
}

export async function getProject(id: string) {
  const { data, error } = await supabase
    .from('project_overview')
    .select('*')
    .eq('id', id)
    .single();

  return { project: (data as ProjectOverview) ?? null, error: error?.message ?? null };
}

/** Areas of one project, with their own progress, in display order. */
export async function listAreas(projectId: string) {
  const { data, error } = await supabase
    .from('area_progress')
    .select('*')
    .eq('project_id', projectId)
    .order('order_index');

  return { areas: (data ?? []) as Area[], error: error?.message ?? null };
}

export async function listTasks(projectId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('order_index');

  return { tasks: (data ?? []) as Task[], error: error?.message ?? null };
}

/**
 * Create a project, its areas and their starter tasks — all in one
 * call, all or nothing.
 *
 * This is the create_project function in your schema. Doing it as
 * three separate inserts from the app would mean a dropped connection
 * could leave someone with a project that has no areas.
 */
export async function createProject(name: string, goal: string, areaNames: string[]) {
  const { data, error } = await supabase.rpc('create_project', {
    new_name: name,
    new_goal: goal,
    area_names: areaNames,
  });

  return { projectId: data as string | null, error: error?.message ?? null };
}

export async function setTaskStatus(taskId: string, done: boolean) {
  const { error } = await supabase
    .from('tasks')
    .update({ status: done ? 'done' : 'todo' })
    .eq('id', taskId);

  return { error: error?.message ?? null };
}

export async function deleteProject(id: string) {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  return { error: error?.message ?? null };
}

/** For the free-tier gate: how many projects does this user have? */
export async function countProjects() {
  const { count, error } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active');

  return { count: count ?? 0, error: error?.message ?? null };
}
