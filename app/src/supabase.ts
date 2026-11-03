import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export type Board = { id: string; title: string; position: number };
export type List = { id: string; board_id: string; title: string; position: number };
export type Task = {
  id: string;
  list_id: string | null;
  title: string;
  description: string;
  due_at: string | null;
  due_has_time: boolean;
  done_at: string | null;
  priority: number;
  position: number;
};
/** A task with the list it sits in (null when unsorted). */
export type TaskWithList = Task & { lists: { title: string; board_id: string } | null };
