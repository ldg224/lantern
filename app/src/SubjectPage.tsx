import { useEffect, useMemo, useState } from 'react';
import { sb, ITEM_SELECT, SUBJECT_COLOURS, isAssessment, isMarked, type Item, type Subject } from './supabase';
import { resolveCapture } from './parse';
import { daysUntil, isOverdue } from './dates';
import { DoneGroup, InlineAdd, TaskRow, mergeLoaded, useTaskOps } from './tasks';
import { Detail } from './Detail';

/** A subject sorts itself by date: nothing to drag between stages. */
export function SubjectPage({ subject, subjects, onChange, onRemove }: {
  subject: Subject;
  subjects: Subject[];
  onChange: (patch: Partial<Subject>) => void;
  onRemove: () => void;
}) {
  const [rows, setRows] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(subject.name);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const ops = useTaskOps(setRows, setError);
  const { fading } = ops;

  useEffect(() => {
    let live = true;
    sb.from('cards').select(ITEM_SELECT).eq('subject_id', subject.id).eq('archived', false).order('position').then(({ data, error }) => {
      if (!live) return;
      if (error) setError('could not load this subject. check your connection.');
      else setRows(prev => mergeLoaded((data ?? []) as Item[], prev));
      setLoaded(true);
    });
    return () => { live = false; };
  }, [subject.id]);

  // items moved to another subject in the detail panel leave this page
  const mine = rows.filter(r => r.subject_id === subject.id);

  const s = useMemo(() => {
    const overdue: Item[] = [], week: Item[] = [], later: Item[] = [], undated: Item[] = [], waiting: Item[] = [], done: Item[] = [];
    for (const r of mine) {
      const assess = isAssessment(r);
      if (assess ? isMarked(r) : r.done_at && !fading.has(r.id)) { done.push(r); continue; }
      const days = r.due_at ? daysUntil(r.due_at) : null;
      if (assess && days !== null && days < 0) waiting.push(r);
      else if (!assess && isOverdue({ ...r, done_at: null })) overdue.push(r);
      else if (days === null) undated.push(r);
      else if (days <= 6) week.push(r);
      else later.push(r);
    }
    const byDue = (a: Item, b: Item) => (a.due_at ?? '').localeCompare(b.due_at ?? '');
    [overdue, week, later, waiting].forEach(l => l.sort(byDue));
    done.sort((a, b) => (b.done_at ?? b.due_at ?? '').localeCompare(a.done_at ?? a.due_at ?? ''));
    return { overdue, week, later, undated, waiting, done };
  }, [mine, fading]);

  const marked = mine.filter(r => isAssessment(r) && isMarked(r) && r.result_total);
  const average = marked.length
    ? Math.round(marked.reduce((sum, r) => sum + Number(r.result_score) / Number(r.result_total), 0) / marked.length * 100)
    : null;
  const open = s.overdue.length + s.week.length + s.later.length + s.undated.length;

  async function add(text: string) {
    const c = resolveCapture(text, [], subjects, subject);
    const title = c.title || text;
    const { data, error } = await sb
      .from('cards')
      .insert({ title, subject_id: subject.id, kind: c.kind, due_at: c.due?.toISOString() ?? null, due_has_time: c.hasTime, priority: c.star ? 1 : 0, position: Date.now() })
      .select(ITEM_SELECT)
      .single();
    if (error) return setError(`"${title}" did not save. try again.`);
    setRows(rs => [...rs, data as Item]);
  }

  function commitName() {
    setEditing(false);
    const n = name.trim();
    if (!n) return setName(subject.name);
    if (n !== subject.name) onChange({ name: n });
  }

  const row = (r: Item) => (
    <TaskRow
      key={r.id}
      t={r}
      fading={fading.has(r.id)}
      onToggle={() => ops.toggle(r)}
      onStar={() => ops.star(r)}
      onOpen={() => ops.open(r.id)}
      action={isAssessment(r) && !isMarked(r) && r.due_at && daysUntil(r.due_at) < 0
        ? <button className="mini" onClick={() => ops.open(r.id)}>add mark</button>
        : undefined}
    />
  );
  const section = (title: string, list: Item[], tone = '') =>
    list.length > 0 && (
      <section className={'group ' + tone}>
        <h2 className="group-title">{title} <span className="tabular">{list.length}</span></h2>
        <ul className="tasks">{list.map(row)}</ul>
      </section>
    );

  const openItem = rows.find(r => r.id === ops.openId) ?? null;

  return (
    <div className="page subject-page" style={{ ['--subj' as string]: subject.colour }}>
      <header className="page-head">
        <div className="subject-head">
          {editing
            ? <input className="title-input" autoFocus value={name} onChange={e => setName(e.target.value)} onBlur={commitName} onKeyDown={e => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') { setName(subject.name); setEditing(false); } }} aria-label="subject name" />
            : <h1><button className="title-btn" onClick={() => setEditing(true)} title="rename">{subject.name}</button></h1>}
          <p className="page-sub tabular">
            {open} to do{s.waiting.length > 0 && <> &middot; {s.waiting.length} waiting for results</>}
          </p>
        </div>
        {average !== null && (
          <div className="stat">
            <span className="stat-num tabular">{average}%</span>
            <span className="stat-label">average across {marked.length} {marked.length === 1 ? 'mark' : 'marks'}</span>
          </div>
        )}
      </header>

      <div className="swatches" role="radiogroup" aria-label="subject colour">
        {SUBJECT_COLOURS.map(c => (
          <button key={c} role="radio" aria-checked={subject.colour === c} aria-label={`colour ${c}`} className={'swatch' + (subject.colour === c ? ' on' : '')} style={{ background: c }} onClick={() => onChange({ colour: c })} />
        ))}
      </div>

      <InlineAdd label="add homework, a SAC or an exam" placeholder="e.g. ex 4C thu, or sac 2 fri 14 mar" className="subject-add" onAdd={v => add(v as string)} />

      {error && <p className="banner" role="alert">{error} <button className="link" onClick={() => setError('')}>dismiss</button></p>}

      {loaded && mine.length === 0 && (
        <p className="empty">nothing here yet. add homework above, or type <code>sac 1 fri</code> for an assessment.</p>
      )}

      {section('overdue', s.overdue, 'tone-over')}
      {section('this week', s.week)}
      {section('later', s.later)}
      {section('no date', s.undated)}
      {section('waiting for results', s.waiting)}
      <DoneGroup count={s.done.length}>{s.done.map(row)}</DoneGroup>

      <div className="page-foot">
        <button className={'danger' + (confirmRemove ? ' armed' : '')} onClick={() => (confirmRemove ? onRemove() : setConfirmRemove(true))} onBlur={() => setConfirmRemove(false)}>
          {confirmRemove ? 'tap again to remove this subject' : 'remove subject'}
        </button>
      </div>

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
