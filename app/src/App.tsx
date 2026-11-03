import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Lockup } from './Lockup';
import { Login } from './Login';
import { getTheme, setTheme } from './theme';
import { sb, type Board, type List, type Card } from './supabase';

function BoardView({ board }: { board: Board }) {
  const [lists, setLists] = useState<List[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  async function load() {
    const l = await sb.from('lists').select('*').eq('board_id', board.id).eq('archived', false).order('position');
    const ls = (l.data ?? []) as List[];
    setLists(ls);
    if (ls.length) {
      const c = await sb.from('cards').select('*').in('list_id', ls.map(x => x.id)).eq('archived', false).order('position');
      setCards((c.data ?? []) as Card[]);
    } else setCards([]);
  }
  useEffect(() => { load(); }, [board.id]);
  async function addList() {
    const title = prompt('List name'); if (!title) return;
    await sb.from('lists').insert({ board_id: board.id, title, position: Date.now() }); load();
  }
  async function addCard(list: List) {
    const title = prompt('Card title'); if (!title) return;
    await sb.from('cards').insert({ list_id: list.id, title, position: Date.now() }); load();
  }
  return (
    <div className="board">
      {lists.map(l => (
        <section key={l.id} className="list">
          <h3>{l.title}</h3>
          {cards.filter(c => c.list_id === l.id).map(c => <div key={c.id} className="card">{c.title}</div>)}
          <button className="ghost" onClick={() => addCard(l)}>+ add card</button>
        </section>
      ))}
      <button className="ghost" onClick={addList}>+ add list</button>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [boards, setBoards] = useState<Board[]>([]);
  const [theme, setThemeState] = useState(getTheme());
  const [current, setCurrent] = useState<Board | null>(null);
  useEffect(() => {
    sb.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  async function loadBoards() {
    const { data } = await sb.from('boards').select('*').eq('archived', false).order('position');
    const b = (data ?? []) as Board[]; setBoards(b); setCurrent(c => c ?? b[0] ?? null);
  }
  useEffect(() => { if (session) loadBoards(); }, [session]);
  async function addBoard() {
    const title = prompt('Board name'); if (!title) return;
    await sb.from('boards').insert({ title, position: Date.now() }); loadBoards();
  }
  if (!ready) return null;
  if (!session) return <Login />;
  return (
    <div className="app">
      <header>
        <Lockup size={19} />
        {boards.map(b => <button key={b.id} className={b.id === current?.id ? 'tab on' : 'tab'} onClick={() => setCurrent(b)}>{b.title}</button>)}
        <button className="ghost" onClick={addBoard}>+ board</button>
        <button className="ghost right" onClick={() => { const t = theme === 'hearth' ? 'daylight' : 'hearth'; setTheme(t); setThemeState(t); }}>{theme === 'hearth' ? 'daylight' : 'hearth'}</button>
        <button className="ghost" onClick={() => sb.auth.signOut()}>sign out</button>
      </header>
      {current ? <BoardView board={current} /> : <p className="empty">create your first board.</p>}
    </div>
  );
}
