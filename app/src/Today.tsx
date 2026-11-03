import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { sb, ITEM_SELECT, KIND_LABEL, isAssessment, isMarked, type Board, type Item, type Subject } from './supabase';
import { resolveCapture } from './parse';
import { daysUntil, dueLabel, isOverdue, longDate, startOfDay } from './dates';
import { DoneGroup, TaskRow, mergeLoaded, useTaskOps } from './tasks';
import { Detail } from './Detail';
import { ReturnIcon } from './icons';

export function Today({ boards, subjects, ready, onCount }: { boards: Board[]; subjects: Subject[]; ready: boolean; onCount: (n: number) => void }) {
  const [rows, setRows] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const ops = useTaskOps(setRows, setError);
  const { fading } = ops;

  useEffect(() => {
    let live = true;
    (async () => {
      const since = startOfDay(new Date()).toISOString();
      const { data, error } = await sb
        .from('cards')
        .select(ITEM_SELECT)
        .eq('archived', false)
        .or(`done_at.is.null,done_at.gte.${since}`)
        .order('position');
      if (!live) return;
      if (error) setError('could not load your tasks. check your connection.');
      else setRows(prev => mergeLoaded((data ?? []) as Item[], prev));
      setLoaded(true);
    })();
    return () => { live = false; };
  }, []);

  const s = useMemo(() => {
    const overdue: Item[] = [], focus: Item[] = [], today: Item[] = [], soon: Item[] = [], unsorted: Item[] = [], done: Item[] = [];
    const since = startOfDay(new Date()).toISOString();
    for (const r of rows) {
      const assess = isAssessment(r);
      const finished = assess ? isMarked(r) : !!r.done_at && !fading.has(r.id);
      if (finished) {
        if (r.done_at && r.done_at >= since) done.push(r);
        continue;
      }
      const days = r.due_at ? daysUntil(r.due_at) : null;
      // assessments whose day has passed wait for a mark on their subject page, not here
      if (assess && days !== null && days < 0) continue;
      // each item shows once, in the most urgent place
      if (!assess && isOverdue({ ...r, done_at: null })) overdue.push(r);
      else if (r.priority > 0) focus.push(r);
      else if (days === 0) today.push(r);
      else if (days !== null && days > 0 && days <= (assess ? 14 : 7)) soon.push(r);
      else if (!r.list_id && !r.subject_id && days === null) unsorted.push(r);
    }
    const byDue = (a: Item, b: Item) => (a.due_at ?? '').localeCompare(b.due_at ?? '');
    [overdue, today, soon].forEach(l => l.sort(byDue));
    done.sort((a, b) => (b.done_at ?? '').localeCompare(a.done_at ?? ''));
    return { overdue, focus, today, soon, unsorted, done };
  }, [rows, fading]);

  const doToday = s.overdue.length + s.focus.length + s.today.length;
  const total = doToday + s.done.length;
  useEffect(() => { onCount(doToday + s.unsorted.length); }, [doToday, s.unsorted.length, onCount]);

  const subjectOf = (r: Item) => subjects.find(x => x.id === r.subject_id) ?? null;
  const boardName = (r: Item) => (r.lists ? boards.find(b => b.id === r.lists!.board_id)?.title ?? null : null);

  const row = (r: Item, action?: ReactNode) => (
    <TaskRow
      key={r.id}
      t={r}
      fading={fading.has(r.id)}
      subject={subjectOf(r)}
      where={boardName(r)}
      onToggle={() => ops.toggle(r)}
      onStar={() => ops.star(r)}
      onOpen={() => ops.open(r.id)}
      action={action}
    />
  );

  const section = (title: string, list: Item[], tone = '', withMove = false) =>
    list.length > 0 && (
      <section className={'group ' + tone}>
        <h2 className="group-title">{title} <span className="tabular">{list.length}</span></h2>
        <ul className="tasks">
          {list.map(r => row(r, withMove && (
            <button className="mini" onClick={() => ops.update(r.id, { due_at: startOfDay(new Date()).toISOString(), due_has_time: false })}>
              move to today
            </button>
          )))}
        </ul>
      </section>
    );

  const openItem = rows.find(r => r.id === ops.openId) ?? null;

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
            <div className={'bar' + (s.done.length === total ? ' complete' : '')} role="progressbar" aria-label="done today" aria-valuemin={0} aria-valuemax={total} aria-valuenow={s.done.length}>
              <i style={{ width: `${(s.done.length / total) * 100}%` }} />
            </div>
          </div>
        )}
      </header>

      <Capture ready={ready} boards={boards} subjects={subjects} onAdded={r => setRows(rs => [...rs, r])} onError={setError} />

      {error && <p className="banner" role="alert">{error} <button className="link" onClick={() => setError('')}>dismiss</button></p>}

      {loaded && doToday === 0 && s.soon.length === 0 && s.unsorted.length === 0 && (
        <p className="empty">
          {s.done.length ? 'everything for today is done.' : 'nothing due today.'} add something above, for example <code>methods ex 4C thu</code>.
        </p>
      )}

      {section('overdue', s.overdue, 'tone-over', true)}
      {section('focus', s.focus)}
      {section('due today', s.today)}
      {section('coming up', s.soon)}
      {section('unsorted', s.unsorted)}

      <DoneGroup count={s.done.length}>{s.done.map(r => row(r))}</DoneGroup>

      {openItem && (
        <Detail
          key={openItem.id}
          item={openItem}
          subjects={subjects}
          onClose={() => ops.open(null)}
          onUpdate={patch => ops.update(openItem.id, patch)}
          onSteps={t => ops.setSteps(openItem.id, t)}
          onDelete={() => ops.remove(openItem.id)}
        />
      )}
    </div>
  );
}

function Capture({ ready, boards, subjects, onAdded, onError }: { ready: boolean; boards: Board[]; subjects: Subject[]; onAdded: (r: Item) => void; onError: (m: string) => void }) {
  const [text, setText] = useState('');
  const c = resolveCapture(text, boards, subjects);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!c.title) return;
    // clear at once so the next task can be typed while this one saves
    const typed = text;
    setText('');
    let list_id: string | null = null;
    if (c.board) {
      const l = await sb.from('lists').select('id').eq('board_id', c.board.id).eq('archived', false).order('position').limit(1);
      list_id = l.data?.[0]?.id ?? null;
      if (!list_id) {
        const n = await sb.from('lists').insert({ board_id: c.board.id, title: 'tasks', position: 1 }).select('id').single();
        list_id = n.data?.id ?? null;
      }
    }
    const { data, error } = await sb
      .from('cards')
      .insert({
        title: c.title,
        list_id,
        subject_id: c.subject?.id ?? null,
        kind: c.kind,
        due_at: c.due?.toISOString() ?? null,
        due_has_time: c.hasTime,
        priority: c.star ? 1 : 0,
        position: Date.now(),
      })
      .select(ITEM_SELECT)
      .single();
    if (error) {
      setText(t => t || typed); // give the words back rather than lose them
      return onError(`"${c.title}" did not save. check your connection and try again.`);
    }
    onAdded(data as Item);
  }

  const chips: ReactNode[] = [];
  if (c.subject) chips.push(<span key="s" className="chip"><i className="dot" style={{ background: c.subject.colour }} /> {c.subject.name}</span>);
  if (c.kind !== 'task' && (c.kind !== 'homework' || c.subject)) chips.push(<span key="k" className="chip">{KIND_LABEL[c.kind]}</span>);
  if (c.due) chips.push(<span key="d" className="chip">{isAssessment(c) ? 'on' : 'due'} {dueLabel(c.due.toISOString(), c.hasTime)}</span>);
  if (c.board) chips.push(<span key="b" className="chip">in {c.board.title}</span>);
  else if (c.boardTag && !c.subject) chips.push(<span key="b" className="chip">no subject or board called "{c.boardTag}"</span>);
  if (c.star) chips.push(<span key="f" className="chip">focus</span>);

  const example = subjects.length ? `${subjects[0].name.toLowerCase().split(' ')[0]} ex 4C thu` : 'gym tomorrow 7am !';

  return (
    <form className="capture" onSubmit={submit}>
      <div className="capture-box">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={ready ? "add homework, a SAC or a task" : "loading your subjects..."}
          disabled={!ready}
          aria-label="add homework, a SAC or a task"
          enterKeyHint="done"
          autoComplete="off"
        />
        <button className="capture-go" disabled={!c.title} aria-label="add"><ReturnIcon /></button>
      </div>
      <p className="capture-hint">
        {chips.length
          ? chips
          : <>for example <code>{example}</code> &middot; name a subject, a day or a time, add <code>sac</code> or <code>exam</code>, and <code>!</code> for focus</>}
      </p>
    </form>
  );
}
