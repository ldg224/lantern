import { useEffect, useState } from 'react';
import { sb, ITEM_SELECT, type Board, type Item, type List, type Subject } from './supabase';
import { parseCapture } from './parse';
import { DoneGroup, InlineAdd, TaskRow, mergeLoaded, useTaskOps } from './tasks';
import { Detail } from './Detail';

export function BoardView({ board, subjects }: { board: Board; subjects: Subject[] }) {
  const [lists, setLists] = useState<List[]>([]);
  const [tasks, setTasks] = useState<Item[]>([]);
  const [error, setError] = useState('');
  const ops = useTaskOps(setTasks, setError);
  const { fading } = ops;

  useEffect(() => {
    let live = true;
    (async () => {
      const l = await sb.from('lists').select('*').eq('board_id', board.id).eq('archived', false).order('position');
      const ls = (l.data ?? []) as List[];
      const c = ls.length
        ? await sb.from('cards').select(ITEM_SELECT).in('list_id', ls.map(x => x.id)).eq('archived', false).order('position')
        : { data: [], error: null };
      if (!live) return;
      if (l.error || c.error) setError('could not load this board. check your connection.');
      setLists(ls);
      setTasks(prev => mergeLoaded((c.data ?? []) as Item[], prev));
    })();
    return () => { live = false; };
  }, [board.id]);

  async function addList(title: string) {
    const { data, error } = await sb.from('lists').insert({ board_id: board.id, title, position: Date.now() }).select().single();
    if (error) return setError('that list did not save. try again.');
    setLists(ls => [...ls, data as List]);
  }

  async function addTask(list: List, text: string) {
    const p = parseCapture(text); // dates, times and ! work here too
    const title = p.title || text;
    const { data, error } = await sb
      .from('cards')
      .insert({ list_id: list.id, title, due_at: p.due?.toISOString() ?? null, due_has_time: p.hasTime, priority: p.star ? 1 : 0, position: Date.now() })
      .select(ITEM_SELECT)
      .single();
    if (error) return setError('that task did not save. try again.');
    setTasks(ts => [...ts, data as Item]);
  }

  const openTotal = tasks.filter(t => !t.done_at).length;
  const subjectOf = (t: Item) => subjects.find(s => s.id === t.subject_id) ?? null;
  const row = (t: Item, isFading: boolean) => (
    <TaskRow key={t.id} t={t} fading={isFading} subject={subjectOf(t)} onToggle={() => ops.toggle(t)} onStar={() => ops.star(t)} onOpen={() => ops.open(t.id)} />
  );
  const openItem = tasks.find(t => t.id === ops.openId) ?? null;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>{board.title}</h1>
          <p className="page-sub tabular">{openTotal} open</p>
        </div>
      </header>
      {error && <p className="banner" role="alert">{error} <button className="link" onClick={() => setError('')}>dismiss</button></p>}
      {lists.map(l => {
        const mine = tasks.filter(t => t.list_id === l.id);
        const open = mine.filter(t => !t.done_at || fading.has(t.id));
        const done = mine.filter(t => t.done_at && !fading.has(t.id));
        return (
          <section className="group" key={l.id}>
            <h2 className="group-title">{l.title} <span className="tabular">{open.length}</span></h2>
            <ul className="tasks">{open.map(t => row(t, fading.has(t.id)))}</ul>
            <InlineAdd label="add a task" onAdd={v => addTask(l, v as string)} />
            <DoneGroup count={done.length}>{done.map(t => row(t, false))}</DoneGroup>
          </section>
        );
      })}
      <InlineAdd label="add a list" className="add-list" onAdd={v => addList(v as string)} />
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
