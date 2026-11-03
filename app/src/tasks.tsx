import { useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { sb, KIND_LABEL, isAssessment, isMarked, type Item, type Subject, type Task } from './supabase';
import { CheckIcon, ChevronIcon, FlagIcon, PlusIcon, StarIcon } from './icons';
import { daysUntil, dueLabel, isOverdue } from './dates';

const FADE_MS = 650;

/** First load can finish after tasks were added locally: keep those instead of overwriting them. */
export function mergeLoaded<T extends Task>(loaded: T[], local: T[]): T[] {
  const ids = new Set(loaded.map(r => r.id));
  return [...loaded, ...local.filter(r => !ids.has(r.id))];
}

/** Saving task changes with an instant local update, rolled back if the save fails. */
export function useTaskOps<T extends Item>(setRows: Dispatch<SetStateAction<T[]>>, onError: (m: string) => void) {
  const [fading, setFading] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const queue = useRef(new Map<string, Promise<void>>());

  function update(id: string, patch: Partial<Task>) {
    let before: T | undefined;
    setRows(rs => rs.map(r => {
      if (r.id !== id) return r;
      before = r;
      return { ...r, ...patch };
    }));
    // saves for one item run in order, so a quick second change can never be overwritten by the first
    const prev = queue.current.get(id) ?? Promise.resolve();
    const next = prev.then(async () => {
      const { error } = await sb.from('cards').update(patch).eq('id', id);
      if (error) {
        setRows(rs => rs.map(r => (r.id === id && before ? before : r)));
        onError('that change did not save. check your connection and try again.');
      }
    });
    queue.current.set(id, next);
    return next;
  }

  function toggle(t: Task) {
    if (t.done_at) return update(t.id, { done_at: null });
    // stay in place while the tick plays, then drop into "done"
    setFading(s => new Set(s).add(t.id));
    setTimeout(() => setFading(s => {
      const n = new Set(s);
      n.delete(t.id);
      return n;
    }), FADE_MS);
    return update(t.id, { done_at: new Date().toISOString() });
  }

  const star = (t: Task) => update(t.id, { priority: t.priority ? 0 : 1 });

  async function remove(id: string) {
    setOpenId(null);
    setRows(rs => rs.filter(r => r.id !== id));
    const { error } = await sb.from('cards').update({ archived: true }).eq('id', id);
    if (error) onError('that did not delete. refresh and try again.');
  }

  const setSteps = (id: string, ticks: { done: boolean }[]) =>
    setRows(rs => rs.map(r => (r.id === id ? { ...r, checklist_items: ticks } : r)));

  return { fading, update, toggle, star, remove, setSteps, openId, open: setOpenId };
}

/** What the row says about an assessment: when, or that it is waiting for a mark, or the mark. */
function assessmentNote(t: Item): { text: string; tone: string } | null {
  if (!isAssessment(t)) return null;
  if (isMarked(t)) {
    const pct = t.result_total ? Math.round((Number(t.result_score) / Number(t.result_total)) * 100) : null;
    return { text: t.result_total ? `${t.result_score}/${t.result_total} · ${pct}%` : `${t.result_score}`, tone: 'marked' };
  }
  if (t.due_at && daysUntil(t.due_at) < 0) return { text: 'waiting for result', tone: 'waiting' };
  if (t.due_at) {
    const n = daysUntil(t.due_at);
    if (n >= 2 && n <= 21) return { text: `in ${n} days`, tone: 'soon' };
  }
  return null;
}

export function TaskRow({ t, fading, subject, where, onToggle, onStar, onOpen, action }: {
  t: Item;
  fading: boolean;
  subject?: Subject | null;
  where?: string | null;
  onToggle: () => void;
  onStar: () => void;
  onOpen: () => void;
  action?: ReactNode;
}) {
  const assess = isAssessment(t);
  const done = assess ? isMarked(t) : !!t.done_at;
  const over = !done && !assess && isOverdue(t);
  const note = assessmentNote(t);
  const steps = t.checklist_items ?? [];
  const stepsDone = steps.filter(s => s.done).length;

  return (
    <li className={'task' + (done ? ' is-done' : '') + (fading ? ' is-fading' : '') + (assess ? ' is-assess' : '')} style={subject ? { ['--subj' as string]: subject.colour } : undefined}>
      {assess
        ? <span className="kind-badge" title={KIND_LABEL[t.kind]} aria-hidden="true"><FlagIcon /></span>
        : (
          <button className="check" role="checkbox" aria-checked={done} aria-label={done ? `mark "${t.title}" as not done` : `complete "${t.title}"`} onClick={onToggle}>
            <CheckIcon />
          </button>
        )}
      <div className="task-main" role="button" tabIndex={0} onClick={onOpen} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }} aria-label={`open ${t.title}`}>
        <span className="task-title">{t.title}</span>
        <span className="task-meta">
          {assess && <span className="kind-pill">{KIND_LABEL[t.kind]}</span>}
          {t.due_at && !(assess && isMarked(t)) && <span className={'due tabular' + (over ? ' over' : '')}>{dueLabel(t.due_at, t.due_has_time)}</span>}
          {note && <span className={'note tabular ' + note.tone}>{note.text}</span>}
          {steps.length > 0 && (
            <span className="steps-mini tabular" title={`${stepsDone} of ${steps.length} steps done`}>
              <i className={stepsDone === steps.length ? 'complete' : ''}><b style={{ width: `${(stepsDone / steps.length) * 100}%` }} /></i>
              {stepsDone}/{steps.length}
            </span>
          )}
          {subject && <span className="subj"><i className="dot" />{subject.name}</span>}
          {!subject && where && <span className="where">{where}</span>}
        </span>
      </div>
      {action}
      <button
        className={'star' + (t.priority ? ' on' : '')}
        aria-pressed={t.priority > 0}
        aria-label={t.priority ? 'remove from focus' : 'add to focus'}
        title={t.priority ? 'remove from focus' : 'add to focus'}
        onClick={onStar}
      >
        <StarIcon />
      </button>
    </li>
  );
}

export function DoneGroup({ count, children, label = 'done' }: { count: number; children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  if (!count) return null;
  return (
    <div className="done-group">
      <button className={'done-toggle' + (open ? ' open' : '')} aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <ChevronIcon size={14} />
        {label} <span className="tabular">{count}</span>
      </button>
      {open && <ul className="tasks">{children}</ul>}
    </div>
  );
}

/** A "+ add" button that turns into a typed box: Enter adds and stays open, Escape closes. */
export function InlineAdd({ label, onAdd, className = '', placeholder }: { label: string; onAdd: (v: string) => Promise<unknown> | unknown; className?: string; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState('');
  if (!open) {
    return (
      <button className={'add-btn ' + className} onClick={() => setOpen(true)}>
        <PlusIcon size={15} /> {label}
      </button>
    );
  }
  return (
    <form
      className={'inline-add ' + className}
      onSubmit={async e => {
        e.preventDefault();
        const t = v.trim();
        if (!t) return;
        setV('');
        await onAdd(t);
      }}
    >
      <input
        autoFocus
        value={v}
        placeholder={placeholder ?? label}
        aria-label={label}
        onChange={e => setV(e.target.value)}
        onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); setV(''); } }}
        onBlur={() => { if (!v.trim()) setOpen(false); }}
      />
    </form>
  );
}
