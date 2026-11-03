import type { Task } from './supabase';

const DAY = 86_400_000;

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** "today", "tomorrow 07:00", "fri 7 nov". Lowercase to match the wordmark. */
export function dueLabel(iso: string, hasTime: boolean, now = new Date()): string {
  const d = new Date(iso);
  const diff = Math.round((startOfDay(d).getTime() - startOfDay(now).getTime()) / DAY);
  const base =
    diff === 0
      ? 'today'
      : diff === 1
        ? 'tomorrow'
        : diff === -1
          ? 'yesterday'
          : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).toLowerCase().replace(',', '');
  return hasTime ? `${base} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : base;
}

/** Open, and past its time (timed tasks) or before today (date-only tasks). */
export function isOverdue(t: Task, now = new Date()): boolean {
  if (t.done_at || !t.due_at) return false;
  const due = new Date(t.due_at).getTime();
  return t.due_has_time ? due < now.getTime() : due < startOfDay(now).getTime();
}

export function isDueToday(t: Task, now = new Date()): boolean {
  if (!t.due_at) return false;
  const day = startOfDay(new Date(t.due_at)).getTime();
  return day === startOfDay(now).getTime();
}

export function longDate(now = new Date()): string {
  return now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).toLowerCase();
}
