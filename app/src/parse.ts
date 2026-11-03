import { addDays, startOfDay } from './dates';
import type { Board, Kind, Subject } from './supabase';

export type Parsed = {
  title: string;
  due: Date | null;
  hasTime: boolean;
  boardTag: string | null;
  star: boolean;
};

const DAYS: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, weds: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

/** "7am", "7:30pm", "15:30"; bare hours like "16" only when allowBare. Returns [hour, minute] or null. */
export function parseTime(word: string, allowBare = false): [number, number] | null {
  const m = /^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?$/.exec(word.trim().toLowerCase());
  if (!m || (!allowBare && m[2] === undefined && m[3] === undefined)) return null;
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (m[3] === 'pm' && h < 12) h += 12;
  if (m[3] === 'am' && h === 12) h = 0;
  return h < 24 && min < 60 ? [h, min] : null;
}

/**
 * Quick capture: "gym tomorrow 7am #health !"
 * - today / tonight / tomorrow / a weekday name (the next one; today if it is that day)
 * - a time with am/pm or a colon (no date given means today)
 * - #tag picks a subject or board, ! stars it as focus
 */
export function parseCapture(input: string, now = new Date()): Parsed {
  let day: Date | null = null;
  let hour: number | null = null;
  let minute = 0;
  let boardTag: string | null = null;
  let star = false;
  const keep: string[] = [];

  for (const word of input.trim().split(/\s+/).filter(Boolean)) {
    const w = word.toLowerCase();
    if (/^!+$/.test(w)) { star = true; continue; }
    if (/^#\S+$/.test(w)) { boardTag = w.slice(1); continue; }
    if (w === 'today' || w === 'tonight') { day = startOfDay(now); if (w === 'tonight' && hour === null) hour = 19; continue; }
    if (w === 'tomorrow' || w === 'tmrw' || w === 'tmr') { day = addDays(startOfDay(now), 1); continue; }
    if (w in DAYS) { day = addDays(startOfDay(now), (DAYS[w] - now.getDay() + 7) % 7); continue; }
    const t = parseTime(w);
    if (t) { [hour, minute] = t; continue; }
    keep.push(word);
  }

  let due: Date | null = day;
  if (hour !== null) {
    due = new Date(day ?? startOfDay(now));
    due.setHours(hour, minute, 0, 0);
    // "gym 7am" typed at 10am means tomorrow, not a task that is already late
    if (day === null && due < now) due = addDays(due, 1);
  }
  return { title: keep.join(' '), due, hasTime: hour !== null, boardTag, star };
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '');

/** Board names compared without case or spaces, matched by prefix. */
export function matchBoard<T extends { title: string }>(boards: T[], tag: string | null): T | null {
  if (!tag) return null;
  return boards.find(b => norm(b.title) === tag) ?? boards.find(b => norm(b.title).startsWith(tag)) ?? null;
}

/** A word names a subject when it is the whole name, or at least 4 letters of its start ("chem" for chemistry). */
export function matchSubject(subjects: Subject[], word: string | null): Subject | null {
  if (!word) return null;
  const w = norm(word);
  return subjects.find(s => norm(s.name) === w) ?? (w.length >= 4 ? subjects.find(s => norm(s.name).startsWith(w)) ?? null : null);
}

const KIND_WORDS: Record<string, Kind> = { sac: 'sac', sacs: 'sac', exam: 'exam', exams: 'exam', assignment: 'assignment', hw: 'homework', homework: 'homework' };

export type Capture = Parsed & { subject: Subject | null; board: Board | null; kind: Kind };

/**
 * Capture with school words: "methods ex 4C thu" is methods homework due thursday,
 * "sac 2 methods fri" is a methods SAC. A subject word without a type means homework.
 */
export function resolveCapture(text: string, boards: Board[], subjects: Subject[], forced?: Subject | null, now = new Date()): Capture {
  const p = parseCapture(text, now);
  let subject: Subject | null = forced ?? null;
  let board: Board | null = null;
  let kind: Kind = 'task';
  if (p.boardTag && !forced) {
    subject = matchSubject(subjects, p.boardTag);
    if (!subject) board = matchBoard(boards, p.boardTag);
  }
  const keep: string[] = [];
  for (const word of p.title.split(' ').filter(Boolean)) {
    const w = word.toLowerCase();
    if (!subject && !board) {
      const s = matchSubject(subjects, w);
      if (s) { subject = s; continue; }
    }
    if (kind === 'task' && KIND_WORDS[w]) {
      kind = KIND_WORDS[w];
      if (kind === 'homework') continue; // "hw" is not part of the name; "SAC 2" is
    }
    keep.push(word);
  }
  if (subject && kind === 'task') kind = 'homework';
  let title = keep.join(' ');
  if (!title && kind !== 'task') title = kind === 'sac' ? 'SAC' : kind;
  return { ...p, title, subject, board, kind };
}
