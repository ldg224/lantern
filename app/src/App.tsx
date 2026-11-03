import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { sb, type Board } from './supabase';
import { Lockup } from './Lockup';
import { Login } from './Login';
import { Today } from './Today';
import { BoardView } from './Board';
import { InlineAdd } from './tasks';
import { BoardsIcon, SunIcon } from './icons';

function useHash() {
  const [h, setH] = useState(location.hash);
  useEffect(() => {
    const f = () => setH(location.hash);
    addEventListener('hashchange', f);
    return () => removeEventListener('hashchange', f);
  }, []);
  return h;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardsLoaded, setBoardsLoaded] = useState(false);
  const [count, setCount] = useState(0);
  const hash = useHash();

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    sb.from('boards').select('*').eq('archived', false).order('position').then(({ data }) => {
      setBoards((data ?? []) as Board[]);
      setBoardsLoaded(true);
    });
  }, [session]);

  async function addBoard(title: string) {
    const { data } = await sb.from('boards').insert({ title, position: Date.now() }).select().single();
    if (!data) return;
    await sb.from('lists').insert({ board_id: data.id, title: 'tasks', position: 1 });
    setBoards(b => [...b, data as Board]);
    location.hash = `#/board/${data.id}`;
  }

  if (!ready) return null;
  if (!session) return <Login />;

  const boardId = hash.startsWith('#/board/') ? hash.slice('#/board/'.length) : null;
  const board = boards.find(b => b.id === boardId) ?? null;
  const view = boardId ? 'board' : hash === '#/boards' ? 'boards' : 'today';

  const boardLinks = boards.map(b => (
    <a key={b.id} href={`#/board/${b.id}`} className={'nav-item' + (b.id === boardId ? ' on' : '')}>
      <span className="nav-dot" aria-hidden="true" />
      {b.title}
    </a>
  ));

  return (
    <div className="shell">
      <aside className="side">
        <a href="#/today" className="side-brand" aria-label="lantern, today"><Lockup size={21} /></a>
        <nav className="side-nav">
          <a href="#/today" className={'nav-item' + (view === 'today' ? ' on' : '')}>
            <SunIcon /> today {count > 0 && <span className="nav-count tabular">{count}</span>}
          </a>
          <p className="nav-label">boards</p>
          {boardLinks}
          <InlineAdd label="new board" className="nav-add" onAdd={v => addBoard(v as string)} />
        </nav>
        <button className="side-out" onClick={() => sb.auth.signOut()}>sign out</button>
      </aside>

      <main className="content">
        {view === 'today' && <Today boards={boards} onCount={setCount} />}
        {view === 'board' && (board
          ? <BoardView key={board.id} board={board} />
          : <p className="empty page">{boardsLoaded ? 'this board does not exist any more.' : ''}</p>)}
        {view === 'boards' && (
          <div className="page">
            <header className="page-head"><div><h1>boards</h1></div></header>
            <nav className="boards-list">{boardLinks}</nav>
            <InlineAdd label="new board" onAdd={v => addBoard(v as string)} />
            <button className="side-out mobile-out" onClick={() => sb.auth.signOut()}>sign out</button>
          </div>
        )}
      </main>

      <nav className="tabbar">
        <a href="#/today" className={view === 'today' ? 'on' : ''}><SunIcon size={22} /><span>today</span></a>
        <a href="#/boards" className={view !== 'today' ? 'on' : ''}><BoardsIcon size={22} /><span>boards</span></a>
      </nav>
    </div>
  );
}
