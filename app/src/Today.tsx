import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { sb, type Board, type TaskWithList } from './supabase';
import { matchBoard, parseCapture } from './parse';
import { dueLabel, isDueToday, isOverdue, longDate, startOfDay } from './dates';
import { DoneGroup, TaskRow, mergeLoaded, useTaskOps } from './tasks';
import { ReturnIcon } from './icons';

const SELECT = '*, lists(title, board_id)';

export function Today({ boards, onCount }: { boards: Board[]; onCount: (n: number) => void }) {
  const [rows, setRows] = useState<TaskWithList[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const { fading, toggle, star, update } = useTaskOps(setRows, setError);

  useEffect(() => {
    let live = true;
    (async () => {
      const since = startOfDay(new Date()).toISOString();
      const { data, error } = await sb
        .from('cards')
        .select(SELECT)
        .eq('archived', false)
        .or(`done_at.is.null,done_at.gte.${since}`)
        .order('position');
      if (!live) return;
      if (error) setError('could not load your tasks. check your connection.');
      else setRows(prev => mergeLoaded((data ?? []) as TaskWithList[], prev));
      setLoaded(true);
    })();
    return () => { live = false; };
  }, []);

  const s = useMemo(() => {
    const overdue: TaskWithList[] = [], focus: TaskWithList[] = [], today: TaskWithList[] = [], unsorted: TaskWithList[] = [], done: TaskWithList[] = [];
    for (const r of rows) {
      const open = !r.done_at || fading.has(r.id);
      if (!open) {
        if (r.done_at && r.done_at >= startOfDay(new Date()).toISOString()) done.push(r);
        continue;
      }
      // each task shows once, in the most urgent place
      if (isOverdue({ ...r, done_at: null })) overdue.push(r);
      else if (r.priority > 0) focus.push(r);
      else if (isDueToday(r)) today.push(r);
      else if (!r.list_id && !r.due_at) unsorted.push(r);
    }
    const byDue = (a: TaskWithList, b: TaskWithList) => (a.due_at ?? '').localeCompare(b.due_at ?? '');
    overdue.sort(byDue);
    today.sort(byDue);
    done.sort((a, b) => (b.done_at ?? '').localeCompare(a.done_at ?? ''));
    return { overdue, focus, today, unsorted, done };
  }, [rows, fading]);

  const openCount = s.overdue.length + s.focus.length + s.today.length + s.unsorted.length;
  const total = openCount + s.done.length;
  useEffect(() => { onCount(openCount); }, [openCount, onCount]);

  const boardName = (r: TaskWithList) => (r.lists ? boards.find(b => b.id === r.lists!.board_id)?.title ?? null : null);

  const row = (r: TaskWithList, action?: ReactNode) => (
    <TaskRow key={r.id} t={r} fading={fading.has(r.id)} where={boardName(r)} onToggle={() => toggle(r)} onStar={() => star(r)} action={action} />
  );

  const section = (title: string, list: TaskWithList[], tone = '', withMove = false) =>
    list.length > 0 && (
      <section className={'group ' + tone}>
        <h2 className="group-title">{title} <span className="tabular">{list.length}</span></h2>
        <ul className="tasks">
          {list.map(r => row(r, withMove && (
            <button className="mini" onClick={() => update(r.id, { due_at: startOfDay(new Date()).toISOString(), due_has_time: false })}>
              move to today
            </button>
          )))}
        </ul>
      </section>
    );

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>today</h1>
          <p className="page-sub">{longDate()}</p>
        </div>
        {total > 0 && (
          <div className="day-progress">
            <span className="tabular"><b>{s.done.length}</b> of {total} done</span>
            <div className={'bar' + (s.done.length === total ? ' complete' : '')} role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={s.done.length}>
              <i style={{ width: `${(s.done.length / total) * 100}%` }} />
            </div>
          </div>
        )}
      </header>

      <Capture boards={boards} onAdded={r => setRows(rs => [...rs, r])} onError={setError} />

      {error && <p className="banner" role="alert">{error} <button className="link" onClick={() => setError('')}>dismiss</button></p>}

      {loaded && openCount === 0 && (
        <p className="empty">
          {s.done.length ? 'everything for today is done.' : 'nothing due today.'} add a task above, for example <code>call mum fri 6pm #home</code>.
        </p>
      )}

      {section('overdue', s.overdue, 'tone-over', true)}
      {section('focus', s.focus)}
      {section('due today', s.today)}
      {section('unsorted', s.unsorted)}

      <DoneGroup count={s.done.length}>{s.done.map(r => row(r))}</DoneGroup>
    </div>
  );
}

function Capture({ boards, onAdded, onError }: { boards: Board[]; onAdded: (r: TaskWithList) => void; onError: (m: string) => void }) {
  const [text, setText] = useState('');
  const p = parseCapture(text);
  const board = matchBoard(boards, p.boardTag);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!p.title) return;
    // clear at once so the next task can be typed while this one saves
    const typed = text;
    setText('');
    let list_id: string | null = null;
    if (board) {
      const l = await sb.from('lists').select('id').eq('board_id', board.id).eq('archived', false).order('position').limit(1);
      list_id = l.data?.[0]?.id ?? null;
      if (!list_id) {
        const n = await sb.from('lists').insert({ board_id: board.id, title: 'tasks', position: 1 }).select('id').single();
        list_id = n.data?.id ?? null;
      }
    }
    const { data, error } = await sb
      .from('cards')
      .insert({ title: p.title, list_id, due_at: p.due?.toISOString() ?? null, due_has_time: p.hasTime, priority: p.star ? 1 : 0, position: Date.now() })
      .select(SELECT)
      .single();
    if (error) {
      setText(t => t || typed); // give the words back rather than lose them
      return onError(`"${p.title}" did not save. check your connection and try again.`);
    }
    onAdded(data as TaskWithList);
  }

  const chips: string[] = [];
  if (p.due) chips.push(`due ${dueLabel(p.due.toISOString(), p.hasTime)}`);
  if (board) chips.push(`in ${board.title}`);
  else if (p.boardTag) chips.push(`no board called "${p.boardTag}", it will go to unsorted`);
  if (p.star) chips.push('focus');

  return (
    <form className="capture" onSubmit={submit}>
      <div className="capture-box">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="add a task"
          aria-label="add a task"
          enterKeyHint="done"
          autoComplete="off"
        />
        <button className="capture-go" disabled={!p.title} aria-label="add task"><ReturnIcon /></button>
      </div>
      <p className="capture-hint">
        {chips.length
          ? chips.map(c => <span key={c} className="chip">{c}</span>)
          : <>for example <code>gym tomorrow 7am #health !</code> &middot; a day or time sets when it is due, <code>#</code> picks a board, <code>!</code> adds it to focus</>}
      </p>
    </form>
  );
}
