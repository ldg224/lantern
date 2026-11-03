import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { sb, SUBJECT_COLOURS, type Board, type Subject } from './supabase';
import { Lockup } from './Lockup';
import { Login } from './Login';
import { Today } from './Today';
import { BoardView } from './Board';
import { SubjectPage } from './SubjectPage';
import { InlineAdd } from './tasks';
import { BoardsIcon, SchoolIcon, SunIcon } from './icons';

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
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [count, setCount] = useState(0);
  const hash = useHash();

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    Promise.all([
      sb.from('boards').select('*').eq('archived', false).order('position'),
      sb.from('subjects').select('*').eq('archived', false).order('position'),
    ]).then(([b, s]) => {
      setBoards((b.data ?? []) as Board[]);
      setSubjects((s.data ?? []) as Subject[]);
      setLoaded(true);
    });
  }, [session]);

  async function addBoard(title: string) {
    const { data } = await sb.from('boards').insert({ title, position: Date.now() }).select().single();
    if (!data) return;
    await sb.from('lists').insert({ board_id: data.id, title: 'tasks', position: 1 });
    setBoards(b => [...b, data as Board]);
    location.hash = `#/board/${data.id}`;
  }

  async function addSubject(name: string) {
    const colour = SUBJECT_COLOURS[subjects.length % SUBJECT_COLOURS.length];
    const { data } = await sb.from('subjects').insert({ name, colour, position: Date.now() }).select().single();
    if (!data) return;
    setSubjects(s => [...s, data as Subject]);
    location.hash = `#/subject/${data.id}`;
  }

  async function changeSubject(id: string, patch: Partial<Subject>) {
    setSubjects(ss => ss.map(s => (s.id === id ? { ...s, ...patch } : s)));
    await sb.from('subjects').update(patch).eq('id', id);
  }

  async function removeSubject(id: string) {
    setSubjects(ss => ss.filter(s => s.id !== id));
    location.hash = '#/school';
    await sb.from('subjects').update({ archived: true }).eq('id', id);
  }

  if (!ready) return null;
  if (!session) return <Login />;

  const param = (prefix: string) => (hash.startsWith(prefix) ? hash.slice(prefix.length) : null);
  const boardId = param('#/board/');
  const subjectId = param('#/subject/');
  const board = boards.find(b => b.id === boardId) ?? null;
  const subject = subjects.find(s => s.id === subjectId) ?? null;
  const view = boardId ? 'board' : subjectId ? 'subject' : hash === '#/boards' ? 'boards' : hash === '#/school' ? 'school' : 'today';
  const tab = view === 'board' || view === 'boards' ? 'boards' : view === 'subject' || view === 'school' ? 'school' : 'today';

  const subjectLinks = subjects.map(s => (
    <a key={s.id} href={`#/subject/${s.id}`} className={'nav-item' + (s.id === subjectId ? ' on' : '')}>
      <span className="nav-dot" style={{ background: s.colour }} aria-hidden="true" />
      {s.name}
    </a>
  ));
  const boardLinks = boards.map(b => (
    <a key={b.id} href={`#/board/${b.id}`} className={'nav-item' + (b.id === boardId ? ' on' : '')}>
      <span className="nav-dot" aria-hidden="true" />
      {b.title}
    </a>
  ));
  const missing = <p className="empty page">{loaded ? 'this does not exist any more.' : ''}</p>;

  return (
    <div className="shell">
      <aside className="side">
        <a href="#/today" className="side-brand" aria-label="lantern, today"><Lockup size={21} /></a>
        <nav className="side-nav">
          <a href="#/today" className={'nav-item' + (view === 'today' ? ' on' : '')}>
            <SunIcon /> today {count > 0 && <span className="nav-count tabular">{count}</span>}
          </a>
          <p className="nav-label">school</p>
          {subjectLinks}
          <InlineAdd label="new subject" className="nav-add" onAdd={v => addSubject(v as string)} />
          <p className="nav-label">boards</p>
          {boardLinks}
          <InlineAdd label="new board" className="nav-add" onAdd={v => addBoard(v as string)} />
        </nav>
        <button className="side-out" onClick={() => sb.auth.signOut()}>sign out</button>
      </aside>

      <main className="content">
        {view === 'today' && <Today ready={loaded} boards={boards} subjects={subjects} onCount={setCount} />}
        {view === 'subject' && (subject
          ? <SubjectPage key={subject.id} subject={subject} subjects={subjects} onChange={p => changeSubject(subject.id, p)} onRemove={() => removeSubject(subject.id)} />
          : missing)}
        {view === 'board' && (board ? <BoardView key={board.id} board={board} subjects={subjects} /> : missing)}
        {view === 'school' && (
          <div className="page">
            <header className="page-head"><div><h1>school</h1><p className="page-sub">your subjects</p></div></header>
            {loaded && subjects.length === 0 && <p className="empty">add your subjects to start, for example methods or english.</p>}
            <nav className="boards-list">{subjectLinks}</nav>
            <InlineAdd label="new subject" onAdd={v => addSubject(v as string)} />
          </div>
        )}
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
        <a href="#/today" className={tab === 'today' ? 'on' : ''}><SunIcon size={22} /><span>today</span></a>
        <a href="#/school" className={tab === 'school' ? 'on' : ''}><SchoolIcon size={22} /><span>school</span></a>
        <a href="#/boards" className={tab === 'boards' ? 'on' : ''}><BoardsIcon size={22} /><span>boards</span></a>
      </nav>
    </div>
  );
}
