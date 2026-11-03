import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';
export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export type Board = { id: string; title: string };
export type List = { id: string; board_id: string; title: string; position: number };
export type Card = { id: string; list_id: string; title: string; position: number };
