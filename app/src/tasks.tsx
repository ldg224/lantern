import { useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { sb, type Task } from './supabase';
import { CheckIcon, ChevronIcon, PlusIcon, StarIcon } from './icons';
import { dueLabel, isOverdue } from './dates';

const FADE_MS = 650;

/** First load can finish after tasks were added locally: keep those instead of overwriting them. */
export function mergeLoaded<T extends Task>(loaded: T[], local: T[]): T[] {
  const ids = new Set(loaded.map(r => r.id));
  return [...loaded, ...local.filter(r => !ids.has(r.id))];
}

/** Saving task changes with an instant local update, rolled back if the save fails. */
export function useTaskOps<T extends Task>(setRows: Dispatch<SetStateAction<T[]>>, onError: (m: string) => void) {
  const [fading, setFading] = useState<Set<string>>(new Set());

  async function update(id: string, patch: Partial<Task>) {
    let before: T | undefined;
    setRows(rs => rs.map(r => {
      if (r.id !== id) return r;
      before = r;
      return { ...r, ...patch };
    }));
    const { error } = await sb.from('cards').update(patch).eq('id', id);
    if (error) {
      setRows(rs => rs.map(r => (r.id === id && before ? before : r)));
      onError('that change did not save. check your connection and try again.');
    }
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

  return { fading, update, toggle, star };
}

export function TaskRow({ t, fading, where, onToggle, onStar, action }: {
  t: Task;
  fading: boolean;
  where?: string | null;
  onToggle: () => void;
  onStar: () => void;
  action?: ReactNode;
}) {
  const done = !!t.done_at;
  const over = !done && isOverdue(t);
  return (
    <li className={'task' + (done ? ' is-done' : '') + (fading ? ' is-fading' : '')}>
      <button
        className="check"
        role="checkbox"
        aria-checked={done}
        aria-label={done ? `mark "${t.title}" as not done` : `complete "${t.title}"`}
        onClick={onToggle}
      >
        <CheckIcon />
      </button>
      <div className="task-main">
        <span className="task-title">{t.title}</span>
        {(t.due_at || where) && (
          <span className="task-meta">
            {t.due_at && <span className={'due tabular' + (over ? ' over' : '')}>{dueLabel(t.due_at, t.due_has_time)}</span>}
            {where && <span className="where">{where}</span>}
          </span>
        )}
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

export function DoneGroup({ count, children }: { count: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  if (!count) return null;
  return (
    <div className="done-group">
      <button className={'done-toggle' + (open ? ' open' : '')} aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <ChevronIcon size={14} />
        done <span className="tabular">{count}</span>
      </button>
      {open && <ul className="tasks">{children}</ul>}
    </div>
  );
}

/** A "+ add" button that turns into a typed box: Enter adds and stays open, Escape closes. */
export function InlineAdd({ label, onAdd, className = '' }: { label: string; onAdd: (v: string) => Promise<unknown> | unknown; className?: string }) {
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
        placeholder={label}
        aria-label={label}
        onChange={e => setV(e.target.value)}
        onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); setV(''); } }}
        onBlur={() => { if (!v.trim()) setOpen(false); }}
      />
    </form>
  );
}
