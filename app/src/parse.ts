import { addDays, startOfDay } from './dates';

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

/**
 * Quick capture: "gym tomorrow 7am #health !"
 * - today / tomorrow / tmrw / a weekday name (next one; today if it is that day)
 * - a time with am/pm or a colon: 7am, 7:30pm, 15:30 (no date given means today)
 * - #board picks a board by the start of its name
 * - ! stars it as focus
 * Everything else is the title.
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
    if (w in DAYS) {
      day = addDays(startOfDay(now), (DAYS[w] - now.getDay() + 7) % 7);
      continue;
    }
    const m = /^(\d{1,2})(?::(\d{2}))?(am|pm)?$/.exec(w);
    if (m && (m[2] !== undefined || m[3] !== undefined)) {
      let h = Number(m[1]);
      const min = m[2] ? Number(m[2]) : 0;
      if (m[3] === 'pm' && h < 12) h += 12;
      if (m[3] === 'am' && h === 12) h = 0;
      if (h < 24 && min < 60) { hour = h; minute = min; continue; }
    }
    keep.push(word);
  }

  let due: Date | null = day;
  if (hour !== null) {
    due = new Date(day ?? startOfDay(now));
    due.setHours(hour, minute, 0, 0);
  }
  return { title: keep.join(' '), due, hasTime: hour !== null, boardTag, star };
}

/** Board names compared without case or spaces, matched by prefix. */
export function matchBoard<T extends { title: string }>(boards: T[], tag: string | null): T | null {
  if (!tag) return null;
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '');
  return boards.find(b => norm(b.title) === tag) ?? boards.find(b => norm(b.title).startsWith(tag)) ?? null;
}
