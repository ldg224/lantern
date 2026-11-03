import { useState } from 'react';
import { addDays, startOfDay, startOfMonth } from './dates';
import { parseTime } from './parse';
import { ChevronIcon } from './icons';

const WEEKDAYS = ['m', 't', 'w', 't', 'f', 's', 's'];

/** Quick picks, a month grid (weeks start monday) and an optional time. */
export function DatePicker({ value, hasTime, onChange }: {
  value: string | null;
  hasTime: boolean;
  onChange: (due: string | null, hasTime: boolean) => void;
}) {
  const sel = value ? new Date(value) : null;
  const [month, setMonth] = useState(startOfMonth(sel ?? new Date()));
  const [time, setTime] = useState(sel && hasTime ? sel.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '');
  const [timeErr, setTimeErr] = useState(false);
  const today = startOfDay(new Date());

  function pick(day: Date) {
    const d = new Date(day);
    if (sel && hasTime) d.setHours(sel.getHours(), sel.getMinutes(), 0, 0);
    onChange(d.toISOString(), hasTime && !!sel);
    setMonth(startOfMonth(d));
  }

  function commitTime() {
    const raw = time.trim();
    if (!raw) { setTimeErr(false); if (sel && hasTime) onChange(startOfDay(sel).toISOString(), false); return; }
    const t = parseTime(raw, true);
    if (!t) { setTimeErr(true); return; }
    setTimeErr(false);
    const d = new Date(sel ?? today);
    d.setHours(t[0], t[1], 0, 0);
    setTime(d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    onChange(d.toISOString(), true);
  }

  const lead = (month.getDay() + 6) % 7; // monday-first offset
  const daysIn = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysIn }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
  const same = (a: Date | null, b: Date | null) => !!a && !!b && startOfDay(a).getTime() === startOfDay(b).getTime();
  const nextMonday = addDays(today, ((8 - today.getDay()) % 7) || 7);

  return (
    <div className="picker">
      <div className="quick">
        {[['today', today], ['tomorrow', addDays(today, 1)], ['next monday', nextMonday]].map(([label, d]) => (
          <button key={label as string} type="button" className={'qchip' + (same(sel, d as Date) ? ' on' : '')} onClick={() => pick(d as Date)}>
            {label as string}
          </button>
        ))}
        {sel && <button type="button" className="qchip ghost" onClick={() => { setTime(''); onChange(null, false); }}>no date</button>}
      </div>
      <div className="cal">
        <div className="cal-head">
          <button type="button" className="icon-btn flip" aria-label="previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronIcon /></button>
          <span>{month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }).toLowerCase()}</span>
          <button type="button" className="icon-btn" aria-label="next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronIcon /></button>
        </div>
        <div className="cal-grid" role="grid">
          {WEEKDAYS.map((w, i) => <span key={i} className="cal-wd">{w}</span>)}
          {cells.map((d, i) => d
            ? (
              <button
                key={i}
                type="button"
                className={'cal-day tabular' + (same(d, sel) ? ' sel' : '') + (same(d, today) ? ' today' : '') + (d < today ? ' past' : '')}
                aria-label={d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                aria-pressed={same(d, sel)}
                onClick={() => pick(d)}
              >
                {d.getDate()}
              </button>
            )
            : <span key={i} />)}
        </div>
      </div>
      <label className="time-field">
        <span>time</span>
        <input
          value={time}
          placeholder="none, or e.g. 4pm"
          inputMode="text"
          onChange={e => setTime(e.target.value)}
          onBlur={commitTime}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitTime(); } }}
          aria-invalid={timeErr}
        />
      </label>
      {timeErr && <p className="err">try a time like 4pm, 16:00 or 9:30am.</p>}
    </div>
  );
}
