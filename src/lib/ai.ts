/**
 * FORGE's AI — the app side.
 *
 * The app never talks to the AI directly. It calls our Supabase Edge
 * Function "ai" (supabase/functions/ai/index.ts), which checks who you
 * are and how many AI actions you have left today, asks Claude, and
 * checks the answer before sending it back.
 *
 * supabase.functions.invoke sends your sign-in token along
 * automatically, which is how the function knows it's you.
 */

import { supabase } from './supabase';
import type { TemplateStructure } from './projects';

type AiError = 'daily_limit' | 'signed_out' | 'offline' | 'failed' | 'cant_plan';

/** Turn whatever went wrong into one of the plain cases below. */
async function explain(error: unknown): Promise<AiError> {
  // A reply from the function with an error status carries a JSON body.
  const context = (error as { context?: Response })?.context;
  if (context && typeof context.status === 'number') {
    if (context.status === 429) return 'daily_limit';
    if (context.status === 401) return 'signed_out';
    if (context.status === 422) return 'cant_plan'; // the safety rule refused it
    return 'failed';
  }
  return 'offline';
}

export const aiMessages: Record<AiError, string> = {
  daily_limit: 'That’s today’s AI used up — it refills tomorrow. You can still build from starter areas.',
  signed_out: 'Sign in again to use the AI.',
  offline: 'Couldn’t reach FORGE’s AI. Check your connection and try again.',
  failed: 'The AI had a hiccup. Try once more.',
  cant_plan: 'FORGE plans things you build — not tools to track, watch or harm people. Try describing a different build.',
};

/**
 * Draft a whole build: name + goal in, areas and tasks out.
 * `have` is what the person already owns (optional) — the plan is
 * shaped around it, and those parts are left off the shopping list.
 */
export async function draftBuild(name: string, goal: string, have = '') {
  const { data, error } = await supabase.functions.invoke('ai', {
    body: { mode: 'build', name: name.trim(), goal: goal.trim(), have: have.trim() },
  });
  if (error) return { structure: null, left: null, error: await explain(error) };
  return {
    structure: (data?.structure ?? null) as TemplateStructure | null,
    left: (data?.left ?? null) as number | null,
    error: data?.structure ? null : ('failed' as AiError),
  };
}

/** What the AI understood from a spoken description. */
export type Heard = { name: string; goal: string; have: string };

/**
 * Voice input: "Hexapod. 18 servos, an Arduino Mega and two LiPo packs."
 * One AI call works out the name, the goal and the parts you already
 * have from what you said, AND drafts the plan around them. Nothing is
 * saved — it fills in the New Build form for you to check.
 */
export async function draftFromSpeech(said: string) {
  const { data, error } = await supabase.functions.invoke('ai', {
    body: { mode: 'build', said: said.trim() },
  });
  if (error) return { structure: null, heard: null, left: null, error: await explain(error) };
  const heard = (data?.heard ?? null) as Heard | null;
  const structure = (data?.structure ?? null) as TemplateStructure | null;
  return {
    structure,
    heard,
    left: (data?.left ?? null) as number | null,
    // No "heard" back means the AI function hasn't been updated yet.
    error: structure && heard ? null : ('failed' as AiError),
  };
}

/** One thing you could build with the parts you have. */
export type BuildIdea = { name: string; blurb: string };

/**
 * "I have an ESP32, an LED and a breadboard — what can I make?"
 * Parts in, four buildable ideas out, easiest first.
 */
export async function ideasFromParts(have: string) {
  const { data, error } = await supabase.functions.invoke('ai', {
    body: { mode: 'ideas', have: have.trim() },
  });
  if (error) return { ideas: [] as BuildIdea[], left: null, error: await explain(error) };
  const ideas = (data?.ideas ?? []) as BuildIdea[];
  return { ideas, left: (data?.left ?? null) as number | null, error: ideas.length ? null : ('failed' as AiError) };
}

/** Five new task ideas for one area. */
export async function suggestTasks(areaId: string) {
  const { data, error } = await supabase.functions.invoke('ai', {
    body: { mode: 'suggest', area_id: areaId },
  });
  if (error) return { tasks: [] as string[], left: null, error: await explain(error) };
  const tasks = (data?.tasks ?? []) as string[];
  return { tasks, left: (data?.left ?? null) as number | null, error: tasks.length ? null : ('failed' as AiError) };
}
