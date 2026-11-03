import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export type Kind = 'task' | 'homework' | 'sac' | 'exam' | 'assignment';
export const KIND_LABEL: Record<Kind, string> = { task: 'task', homework: 'homework', sac: 'SAC', exam: 'exam', assignment: 'assignment' };
export const ASSESSMENTS: Kind[] = ['sac', 'exam', 'assignment'];

export type Board = { id: string; title: string; position: number };
export type Subject = { id: string; name: string; colour: string; position: number };
export type List = { id: string; board_id: string; title: string; position: number };
export type Task = {
  id: string;
  list_id: string | null;
  subject_id: string | null;
  kind: Kind;
  title: string;
  description: string;
  due_at: string | null;
  due_has_time: boolean;
  done_at: string | null;
  priority: number;
  position: number;
  result_score: number | null;
  result_total: number | null;
};
export type Step = { id: string; card_id: string; text: string; done: boolean; position: number };
/** A task as pages load it: with its list (if on a board) and its checklist ticks. */
export type Item = Task & {
  lists?: { title: string; board_id: string } | null;
  checklist_items?: { done: boolean }[];
};
/** Kept for older imports. */
export type TaskWithList = Item;

export const ITEM_SELECT = '*, lists(title, board_id), checklist_items(done)';

/** Subject colours: strong enough to read as dots and bars on white. */
export const SUBJECT_COLOURS = ['#c2410c', '#0e7a56', '#2563eb', '#7c3aed', '#be185d', '#0f766e', '#a16207', '#475569'];

export const isAssessment = (t: Pick<Task, 'kind'>) => ASSESSMENTS.includes(t.kind);
export const isMarked = (t: Pick<Task, 'result_score'>) => t.result_score !== null && t.result_score !== undefined;
