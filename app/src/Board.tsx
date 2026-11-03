import { useEffect, useState } from 'react';
import { sb, type Board, type List, type Task } from './supabase';
import { parseCapture } from './parse';
import { DoneGroup, InlineAdd, TaskRow, mergeLoaded, useTaskOps } from './tasks';

export function BoardView({ board }: { board: Board }) {
  const [lists, setLists] = useState<List[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState('');
  const { fading, toggle, star } = useTaskOps(setTasks, setError);

  useEffect(() => {
    let live = true;
    (async () => {
      const l = await sb.from('lists').select('*').eq('board_id', board.id).eq('archived', false).order('position');
      const ls = (l.data ?? []) as List[];
      const c = ls.length
        ? await sb.from('cards').select('*').in('list_id', ls.map(x => x.id)).eq('archived', false).order('position')
        : { data: [], error: null };
      if (!live) return;
      if (l.error || c.error) setError('could not load this board. check your connection.');
      setLists(ls);
      setTasks(prev => mergeLoaded((c.data ?? []) as Task[], prev));
    })();
    return () => { live = false; };
  }, [board.id]);

  async function addList(title: string) {
    const { data, error } = await sb.from('lists').insert({ board_id: board.id, title, position: Date.now() }).select().single();
    if (error) return setError('that list did not save. try again.');
    setLists(ls => [...ls, data as List]);
  }

  async function addTask(list: List, text: string) {
    const p = parseCapture(text); // dates, times and ! work here too; #board is ignored
    const title = p.title || text;
    const { data, error } = await sb
      .from('cards')
      .insert({ list_id: list.id, title, due_at: p.due?.toISOString() ?? null, due_has_time: p.hasTime, priority: p.star ? 1 : 0, position: Date.now() })
      .select()
      .single();
    if (error) return setError('that task did not save. try again.');
    setTasks(ts => [...ts, data as Task]);
  }

  const openTotal = tasks.filter(t => !t.done_at).length;

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
            <ul className="tasks">
              {open.map(t => <TaskRow key={t.id} t={t} fading={fading.has(t.id)} onToggle={() => toggle(t)} onStar={() => star(t)} />)}
            </ul>
            <InlineAdd label="add a task" onAdd={v => addTask(l, v as string)} />
            <DoneGroup count={done.length}>
              {done.map(t => <TaskRow key={t.id} t={t} fading={false} onToggle={() => toggle(t)} onStar={() => star(t)} />)}
            </DoneGroup>
          </section>
        );
      })}
      <InlineAdd label="add a list" className="add-list" onAdd={v => addList(v as string)} />
    </div>
  );
}
